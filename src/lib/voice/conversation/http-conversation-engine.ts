'use client'

/**
 * HTTP-backed ConversationEngine — the real adapter wiring the orchestrator to
 * the existing interview API routes:
 *   - POST /api/interview/answer          (score + persist the answer)
 *   - POST /api/interview/process-answer  (dual-agent: follow-up intelligence)
 *   - POST /api/interview/complete        (finalize + report)
 *
 * It encapsulates the next-question decision logic that previously sprawled
 * inside the session page (audit: "duplicated/ambiguous question-flow
 * ownership"). Rules preserved verbatim from the legacy page:
 *   - answer + process-answer run in PARALLEL (latency); process-answer failure
 *     is non-fatal (falls back to the next static question).
 *   - At most ONE follow-up per static question (`maxFollowUpsPerQuestion`),
 *     keeping interview length bounded — no infinite probe loops.
 *   - A follow-up is asked in place on the SAME static question id.
 *
 * The HTTP calls sit behind `ConversationApiClient` so the decision logic is
 * unit-testable with a fake client.
 */
import { createVoiceLogger, type VoiceLogger } from '@/lib/voice/core/observability'
import type {
  ConversationEngine,
  NextTurnResult,
  ScoreAnswerInput,
  ResolveNextTurnInput,
  ScoredAnswer,
  InterviewCompletionPayload,
} from '@/lib/voice/conversation/conversation-engine'
import type { FunnelCompleteGa4Payload } from '@/lib/analytics/funnel-ga4-bridge'
import type { InterviewCompleteRetentionPayload } from '@/lib/retention/interview-complete-retention'

export interface StaticQuestion {
  id: string
  questionText: string
  category?: string | null
}

export interface AnswerApiBody {
  interviewId: string
  questionId: string
  answerText: string
  answerMode: 'voice' | 'text'
  answerStyle?: 'concise' | 'balanced' | 'detailed'
  durationSeconds?: number
}
export interface AnswerApiResponse {
  evaluationId?: string | null
  score?: number | null
  feedback?: string
  fallback?: boolean
}

export interface ProcessAnswerApiBody {
  interview_id: string
  interviewer_id: string | null
  question: string
  answer: string
  context: {
    role: string
    difficulty: string
    focus_areas: string[]
    interview_style: 'technical' | 'behavioral'
  }
}
export interface ProcessAnswerApiResponse {
  type: 'followup' | 'next_question' | 'acknowledgment'
  text: string
  voice_metadata?: unknown
}

export interface CompleteApiResponse {
  reportId: string
  retention?: InterviewCompleteRetentionPayload | null
  badgesUnlocked?: string[]
  funnelComplete?: FunnelCompleteGa4Payload
}

export interface ConversationApiClient {
  postAnswer(body: AnswerApiBody, signal?: AbortSignal): Promise<AnswerApiResponse>
  /** Non-fatal: resolve `null` on any failure so scoring still proceeds. */
  postProcessAnswer(
    body: ProcessAnswerApiBody,
    signal?: AbortSignal,
    onSentence?: (sentence: string, index: number) => void,
  ): Promise<ProcessAnswerApiResponse | null>
  postComplete(body: { interviewId: string }, signal?: AbortSignal): Promise<CompleteApiResponse>
}

export interface HttpConversationEngineConfig {
  interviewId: string
  interviewerId: string | null
  role: string
  difficulty: string
  questions: StaticQuestion[]
  api: ConversationApiClient
  getAnswerStyle?: () => 'concise' | 'balanced' | 'detailed' | undefined
  maxFollowUpsPerQuestion?: number
  logger?: VoiceLogger
}

export class HttpConversationEngine implements ConversationEngine {
  private readonly cfg: HttpConversationEngineConfig
  private readonly logger: VoiceLogger
  private readonly maxFollowUps: number

  private staticIndex = 0
  /** Static index that has already consumed its follow-up budget. */
  private followUpUsedForIndex = -1
  /** In-flight process-answer promise started during scoreAnswer. */
  private processPromise: Promise<ProcessAnswerApiResponse | null> | null = null
  private abortController: AbortController | null = null
  private requestGeneration = 0

  constructor(config: HttpConversationEngineConfig) {
    if (config.questions.length === 0) {
      throw new Error('HttpConversationEngine requires at least one question.')
    }
    this.cfg = config
    this.logger = config.logger ?? createVoiceLogger('conversation')
    this.maxFollowUps = config.maxFollowUpsPerQuestion ?? 1
  }

  getStaticIndex(): number {
    return this.staticIndex
  }

  abort(): void {
    this.requestGeneration++
    if (this.abortController) {
      try {
        this.abortController.abort()
      } catch {
        /* idempotent */
      }
      this.abortController = null
    }
    this.processPromise = null
  }

  private beginRequest(): { signal: AbortSignal; generation: number } {
    const generation = ++this.requestGeneration
    if (this.abortController) {
      try {
        this.abortController.abort()
      } catch {
        /* idempotent */
      }
    }
    this.processPromise = null
    const controller = new AbortController()
    this.abortController = controller
    return { signal: controller.signal, generation }
  }

  private isStale(generation: number): boolean {
    return generation !== this.requestGeneration
  }

  async scoreAnswer(input: ScoreAnswerInput): Promise<ScoredAnswer> {
    const q = this.cfg.questions[this.staticIndex]
    if (!q) throw new Error(`No question at index ${this.staticIndex}`)

    const { signal, generation } = this.beginRequest()

    // Fire process-answer in parallel; failure is non-fatal (→ null).
    this.processPromise = this.cfg.api
      .postProcessAnswer(
        {
          interview_id: this.cfg.interviewId,
          interviewer_id: this.cfg.interviewerId,
          question: q.questionText,
          answer: input.answerText,
          context: {
            role: this.cfg.role,
            difficulty: this.cfg.difficulty,
            focus_areas: [q.category ?? 'general'],
            interview_style: q.category === 'technical' ? 'technical' : 'behavioral',
          },
        },
        signal,
        input.onSentence,
      )
      .catch((err) => {
        if (signal.aborted || this.isStale(generation)) return null
        this.logger.warn('process_answer_failed', input.ctx, {
          message: err instanceof Error ? err.message : String(err),
        })
        return null
      })

    const res = await this.cfg.api.postAnswer(
      {
        interviewId: this.cfg.interviewId,
        questionId: q.id,
        answerText: input.answerText,
        answerMode: 'voice',
        answerStyle: this.cfg.getAnswerStyle?.(),
      },
      signal,
    )
    if (signal.aborted || this.isStale(generation)) {
      throw new DOMException('Aborted', 'AbortError')
    }

    return {
      overallScore: res.score ?? null,
      feedbackText: res.feedback,
      raw: res,
    }
  }

  async resolveNextTurn(input: ResolveNextTurnInput): Promise<NextTurnResult> {
    const processResult = this.processPromise ? await this.processPromise : null
    this.processPromise = null

    const followUpAllowed =
      this.maxFollowUps > 0 && this.followUpUsedForIndex !== this.staticIndex

    if (
      followUpAllowed &&
      processResult?.type === 'followup' &&
      typeof processResult.text === 'string' &&
      processResult.text.trim()
    ) {
      this.followUpUsedForIndex = this.staticIndex
      this.logger.info('follow_up_queued', input.ctx, { staticIndex: this.staticIndex })
      return {
        done: false,
        question: {
          text: processResult.text.trim(),
          // Follow-up is asked in place on the same static question.
          questionIndex: this.staticIndex,
          isFollowUp: true,
        },
      }
    }

    // Advance to the next static question (or complete).
    this.staticIndex += 1
    if (this.staticIndex >= this.cfg.questions.length) {
      const { signal, generation } = this.beginRequest()
      const completed = await this.cfg.api.postComplete({ interviewId: this.cfg.interviewId }, signal)
      if (signal.aborted || this.isStale(generation)) {
        throw new DOMException('Aborted', 'AbortError')
      }
      this.logger.info('interview_completed', input.ctx, { reportId: completed.reportId })
      const completion: InterviewCompletionPayload = {
        retention: completed.retention ?? null,
        funnelComplete: completed.funnelComplete,
        badgesUnlocked: completed.badgesUnlocked ?? completed.retention?.newBadges ?? [],
      }
      return { done: true, reportId: completed.reportId, completion }
    }

    const nq = this.cfg.questions[this.staticIndex]
    return {
      done: false,
      question: {
        text: nq.questionText,
        questionIndex: this.staticIndex,
        isFollowUp: false,
      },
    }
  }
}

/** Default fetch-based API client (browser). Throws on non-2xx for answer/complete. */
export function createHttpConversationApi(): ConversationApiClient {
  async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok) {
      let message = `${url} failed (${res.status})`
      try {
        const data = (await res.json()) as { error?: string }
        if (data?.error) message = data.error
      } catch {
        /* non-JSON error body */
      }
      throw new Error(message)
    }
    return (await res.json()) as T
  }

  return {
    postAnswer: (body, signal) => postJson<AnswerApiResponse>('/api/interview/answer', body, signal),
    postProcessAnswer: async (body, signal, onSentence) => {
      const isStreamingEnabled =
        typeof process.env.NEXT_PUBLIC_VOICE_LLM_TTS_STREAMING !== 'undefined'
          ? process.env.NEXT_PUBLIC_VOICE_LLM_TTS_STREAMING === 'true'
          : process.env.VOICE_LLM_TTS_STREAMING === 'true'

      if (onSentence && isStreamingEnabled && typeof fetch !== 'undefined') {
        try {
          const res = await fetch('/api/interview/process-answer', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
            },
            body: JSON.stringify(body),
            signal,
          })

          if (res.ok && res.body) {
            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let completePayload: ProcessAnswerApiResponse | null = null

            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              buffer += decoder.decode(value, { stream: true })

              const blocks = buffer.split('\n\n')
              buffer = blocks.pop() ?? ''

              for (const block of blocks) {
                const lines = block.split('\n')
                let event = ''
                let data = ''
                for (const line of lines) {
                  if (line.startsWith('event: ')) event = line.slice(7).trim()
                  else if (line.startsWith('data: ')) data = line.slice(6).trim()
                }
                if (event === 'sentence' && data) {
                  try {
                    const parsed = JSON.parse(data) as { index: number; text: string }
                    if (parsed.text) onSentence(parsed.text, parsed.index)
                  } catch {
                    /* ignore JSON parse errors */
                  }
                } else if (event === 'complete' && data) {
                  try {
                    completePayload = JSON.parse(data) as ProcessAnswerApiResponse
                  } catch {
                    /* ignore JSON parse errors */
                  }
                }
              }
            }

            if (completePayload) return completePayload
          }
        } catch {
          /* fallback to standard JSON post */
        }
      }

      try {
        return await postJson<ProcessAnswerApiResponse>(
          '/api/interview/process-answer',
          body,
          signal,
        )
      } catch {
        return null // non-fatal — orchestrator falls back to the next static question
      }
    },
    postComplete: (body, signal) =>
      postJson<CompleteApiResponse>('/api/interview/complete', body, signal),
  }
}
