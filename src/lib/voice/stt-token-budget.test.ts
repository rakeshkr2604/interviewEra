import { describe, expect, it } from 'vitest'
import {
  estimateScriptInterviewTokenCalls,
  recommendedSttRateLimits,
  STT_EPHEMERAL_TTL_SECONDS,
  STT_REFRESH_SKEW_SECONDS,
} from './stt-token-budget'

describe('estimateScriptInterviewTokenCalls', () => {
  it('counts one mint per listening phase when lease is released each submit', () => {
    // warmup + self_intro + 4 core + candidate_questions = 7
    const est = estimateScriptInterviewTokenCalls({
      coreQuestionCount: 4,
      selfIntroEnabled: true,
      preserveLeaseAcrossQuestions: false,
    })
    expect(est.newMints).toBe(7)
    expect(est.refreshes).toBe(0)
    expect(est.totalApiCalls).toBe(7)
  })

  it('collapses to 1 new mint when lease is preserved across questions', () => {
    const est = estimateScriptInterviewTokenCalls({
      coreQuestionCount: 4,
      selfIntroEnabled: true,
      preserveLeaseAcrossQuestions: true,
      longAnswerRefreshCount: 1,
    })
    expect(est.newMints).toBe(1)
    expect(est.refreshes).toBe(6 + 1) // 6 inter-question reconnects + 1 long-answer
    expect(est.totalApiCalls).toBe(8)
  })

  it('shows prior 10/hr limit is below one interview without lease preservation', () => {
    const est = estimateScriptInterviewTokenCalls({
      coreQuestionCount: 4,
      selfIntroEnabled: true,
      preserveLeaseAcrossQuestions: false,
      longAnswerRefreshCount: 2,
      retryHeadroom: 1,
    })
    // 7 phases + 2 long-answer refreshes + 1 retry = 10 — exhausts old limit alone
    expect(est.totalApiCalls).toBe(10)
    expect(est.totalApiCalls).toBeGreaterThanOrEqual(10)
  })
})

describe('recommendedSttRateLimits', () => {
  it('sizes ceilings above two lease-preserving interviews/hour', () => {
    const limits = recommendedSttRateLimits({ interviewsPerHour: 2, coreQuestionCount: 4 })
    const one = estimateScriptInterviewTokenCalls({
      coreQuestionCount: 4,
      selfIntroEnabled: true,
      preserveLeaseAcrossQuestions: true,
      longAnswerRefreshCount: 2,
      retryHeadroom: 2,
    })
    expect(limits.newMintsPerUserPerHour).toBeGreaterThanOrEqual(
      Math.ceil(one.newMints * 2),
    )
    expect(limits.refreshesPerUserPerHour).toBeGreaterThanOrEqual(one.refreshes * 2)
    expect(limits.ephemeralTtlSeconds).toBe(STT_EPHEMERAL_TTL_SECONDS)
    // 180s TTL → refresh at 155s; self_intro 120s timer fits without a forced refresh
    expect(STT_EPHEMERAL_TTL_SECONDS - STT_REFRESH_SKEW_SECONDS).toBeGreaterThan(120)
  })
})
