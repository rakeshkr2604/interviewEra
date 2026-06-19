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
} from '@/lib/voice/conversation/conversation-engine'

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
}

export interface ConversationApiClient {
  postAnswer(body: AnswerApiBody): Promise<AnswerApiResponse>
  /** Non-fatal: resolve `null` on any failure so scoring still proceeds. */
  postProcessAnswer(
    body: ProcessAnswerApiBody,
    signal?: AbortSignal,
  ): Promise<ProcessAnswerApiResponse | null>
  postComplete(body: { interviewId: string }): Promise<CompleteApiResponse>
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

  async scoreAnswer(input: ScoreAnswerInput): Promise<ScoredAnswer> {
    const q = this.cfg.questions[this.staticIndex]
    if (!q) throw new Error(`No question at index ${this.staticIndex}`)

    // Fire process-answer in parallel; failure is non-fatal (→ null).
    this.processPromise = this.cfg.api
      .postProcessAnswer({
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
      })
      .catch((err) => {
        this.logger.warn('process_answer_failed', input.ctx, {
          message: err instanceof Error ? err.message : String(err),
        })
        return null
      })

    const res = await this.cfg.api.postAnswer({
      interviewId: this.cfg.interviewId,
      questionId: q.id,
      answerText: input.answerText,
      answerMode: 'voice',
      answerStyle: this.cfg.getAnswerStyle?.(),
    })

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
      const completed = await this.cfg.api.postComplete({ interviewId: this.cfg.interviewId })
      this.logger.info('interview_completed', input.ctx, { reportId: completed.reportId })
      return { done: true, reportId: completed.reportId }
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
    postAnswer: (body) => postJson<AnswerApiResponse>('/api/interview/answer', body),
    postProcessAnswer: async (body, signal) => {
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
    postComplete: (body) => postJson<CompleteApiResponse>('/api/interview/complete', body),
  }
}
