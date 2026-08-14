import { describe, expect, it, vi } from 'vitest'
import {
  ANSWER_SCORE_PREFETCH_WAIT_MS,
  answerScoreNeededOnApprove,
  buildAnswerScoreRequestBody,
  shouldPrefetchAnswerScoreOnReviewOpen,
  waitForScoreThenPrefetch,
} from './client-lifecycle'
import {
  buildAnswerScoreSystemPrompt,
  buildAnswerScoreUserPrompt,
} from './prompt'
import { getTokenBudget } from '@/lib/ai/token-budget'
import { getLlmAttemptTimeoutMs, getOperationSpec } from '@/lib/ai/operation-registry'

describe('answer-score client lifecycle', () => {
  it('does not prefetch score on review open (avoids auto_structure contention)', () => {
    expect(shouldPrefetchAnswerScoreOnReviewOpen()).toBe(false)
  })

  it('Approves unchanged transcript → score only', () => {
    expect(
      answerScoreNeededOnApprove({
        approvedTranscript: 'I built a Next.js app with Supabase.',
        originalTranscript: 'I built a Next.js app with Supabase.',
      }),
    ).toBe('score_only')
  })

  it('Approves edited / STT-fixed transcript → rescore + recoach', () => {
    expect(
      answerScoreNeededOnApprove({
        approvedTranscript: 'I built a Next.js app with Supabase.',
        originalTranscript: 'I built a next jay es app with super a base.',
      }),
    ).toBe('score_and_coaching')
  })

  it('prefetch waits for score settle before timeout', async () => {
    await expect(
      waitForScoreThenPrefetch({
        scorePromise: Promise.resolve('ok'),
        timeoutMs: 50,
      }),
    ).resolves.toBe('score')
  })

  it('prefetch waits for a rejected score (still settled)', async () => {
    await expect(
      waitForScoreThenPrefetch({
        scorePromise: Promise.reject(new Error('score failed')),
        timeoutMs: 50,
      }),
    ).resolves.toBe('score')
  })

  it('prefetch starts after timeout when score is still pending', async () => {
    vi.useFakeTimers()
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    try {
      const raced = waitForScoreThenPrefetch({
        scorePromise: pending,
        timeoutMs: ANSWER_SCORE_PREFETCH_WAIT_MS,
      })
      await vi.advanceTimersByTimeAsync(ANSWER_SCORE_PREFETCH_WAIT_MS)
      await expect(raced).resolves.toBe('timeout')
    } finally {
      release()
      vi.useRealTimers()
    }
  })

  it('builds a stable request body without undefined optional fields', () => {
    expect(
      buildAnswerScoreRequestBody({
        interviewId: '00000000-0000-0000-0000-000000000001',
        turnIndex: 3,
        transcript: 'hello world this is long enough',
        displayQuestion: 'Tell me about yourself',
        targetRole: 'Full Stack Developer',
        questionType: 'behavioral',
      }),
    ).toEqual({
      interviewId: '00000000-0000-0000-0000-000000000001',
      turnIndex: 3,
      transcript: 'hello world this is long enough',
      displayQuestion: 'Tell me about yourself',
      targetRole: 'Full Stack Developer',
      questionType: 'behavioral',
    })
  })
})

describe('answer-score cost/latency controls', () => {
  it('registry caps answer_score output tokens and attempt timeout', () => {
    const spec = getOperationSpec('answer_score')
    expect(spec.maxOutputTokens).toBe(400)
    expect(getTokenBudget('answer_score')).toBe(400)
    expect(getLlmAttemptTimeoutMs('answer_score')).toBe(18_000)
    expect(getOperationSpec('answer_score').timeoutMs).toBe(22_000)
  })

  it('score-v1.6 system prompt hardcodes authoritative sub_rubric', () => {
    const system = buildAnswerScoreSystemPrompt('behavioral')
    const user = buildAnswerScoreUserPrompt({
      question: 'Walk me through your background relevant to this role.',
      questionType: 'behavioral',
      targetRole: 'Full Stack Developer',
      transcript:
        'I completed my MCA then built Interview Era with TypeScript, Next.js, PostgreSQL, Supabase, and OpenAI APIs for campus placement practice.',
    })
    const totalChars = system.length + user.length
    const maxInputChars = getOperationSpec('answer_score').context.maxInputChars
    expect(totalChars).toBeLessThanOrEqual(maxInputChars)
    // v1.2 was ~7.5k system chars and timed out at 13–18s in QA.
    expect(system.length).toBeLessThan(3_500)
    expect(system).toContain('HARD CAP')
    expect(system).toContain('AUTHORITATIVE STRUCTURE RUBRIC')
    expect(system).toMatch(/sub_rubric is fixed to "star"/)
    expect(system).toContain('"sub_rubric":"star"')
    expect(system).toContain('one_line_summary')
    expect(user).toContain('sub_rubric=star')
    // v1.5: do not auto-cap personal stories at 7 for unverifiability.
    expect(system).toMatch(/do NOT treat/i)
    expect(system).not.toMatch(/score exactly 7/)
    // v1.6: semantic structure, not lexical STAR / "no incident" collapse.
    expect(system).toMatch(/SEMANTIC presence/i)
    expect(system).not.toMatch(/0=no incident/)
    expect(system).toMatch(/do NOT zero structure, clarity, or accuracy/)

    const tech = buildAnswerScoreSystemPrompt('technical')
    expect(tech).toMatch(/sub_rubric is fixed to "logical_flow"/)
    expect(tech).toContain('"sub_rubric":"logical_flow"')
  })
})
