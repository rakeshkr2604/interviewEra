/**
 * Evidence-based STT token budget math for script interviews.
 *
 * Measured client pattern (script/[id]/page.tsx):
 *   - Every listening phase calls DeepgramSessionController.start() → /api/stt/token
 *   - Mic is torn down on submit, so each question is a new mint unless the lease
 *     is preserved and the next start uses refresh_lease_id
 *   - Mid-answer refresh fires at (expires_in - 25)s ≈ 95s for a 120s key
 *
 * Typical SCRIPT_H/M/T listening phases per interview:
 *   warmup + self_intro + N core + candidate_questions  (N default 4)
 *   → 7 new mints if lease is released every submit
 *   → 1 new + (phases-1) refreshes if lease is preserved across questions
 *
 * Long answers (self_intro timer 120s) add ≈1 refresh under a 120s TTL.
 */

export const STT_EPHEMERAL_TTL_SECONDS = 180

/** Refresh fires this many seconds before Deepgram key expiry. */
export const STT_REFRESH_SKEW_SECONDS = 25

export type ScriptInterviewTokenEstimateInput = {
  coreQuestionCount: number
  selfIntroEnabled: boolean
  /** When true, only the first listening start is a "new" mint. */
  preserveLeaseAcrossQuestions: boolean
  /** Extra refreshes from long answers (e.g. self_intro > refresh threshold). */
  longAnswerRefreshCount?: number
  /** Failed starts / Strict Mode races that remint. */
  retryHeadroom?: number
}

export type ScriptInterviewTokenEstimate = {
  newMints: number
  refreshes: number
  totalApiCalls: number
}

export function estimateScriptInterviewTokenCalls(
  input: ScriptInterviewTokenEstimateInput,
): ScriptInterviewTokenEstimate {
  const core = Math.max(0, input.coreQuestionCount)
  const listeningPhases =
    1 + // warmup question
    (input.selfIntroEnabled ? 1 : 0) +
    core +
    1 // candidate_questions

  const longAnswerRefreshCount = input.longAnswerRefreshCount ?? 0
  const retryHeadroom = input.retryHeadroom ?? 0

  if (input.preserveLeaseAcrossQuestions) {
    const newMints = 1 + retryHeadroom
    const refreshes =
      Math.max(0, listeningPhases - 1) + longAnswerRefreshCount
    return {
      newMints,
      refreshes,
      totalApiCalls: newMints + refreshes,
    }
  }

  const newMints = listeningPhases + retryHeadroom
  return {
    newMints,
    refreshes: longAnswerRefreshCount,
    totalApiCalls: newMints + longAnswerRefreshCount,
  }
}

/**
 * Hourly ceilings sized from two full interviews in the same hour, with
 * retry headroom. New mints and refreshes are budgeted separately because
 * refreshes are mandatory for long answers / lease-preserving reconnects —
 * counting them against the same 10/hr bucket caused production 429s.
 */
export function recommendedSttRateLimits(opts?: {
  interviewsPerHour?: number
  coreQuestionCount?: number
}): {
  newMintsPerUserPerHour: number
  newMintsPerIpPerHour: number
  newMintsPerInterview: number
  refreshesPerUserPerHour: number
  ephemeralTtlSeconds: number
} {
  const interviewsPerHour = opts?.interviewsPerHour ?? 2
  const coreQuestionCount = opts?.coreQuestionCount ?? 4

  const perInterview = estimateScriptInterviewTokenCalls({
    coreQuestionCount,
    selfIntroEnabled: true,
    preserveLeaseAcrossQuestions: true,
    longAnswerRefreshCount: 2,
    retryHeadroom: 2,
  })

  // 2 interviews × new mints + small extra for a third partial attempt
  const newMintsPerUserPerHour = Math.ceil(
    perInterview.newMints * interviewsPerHour * 1.5,
  )
  // One interview's listening phases + retries (hard cap per session)
  const newMintsPerInterview = Math.max(
    12,
    perInterview.newMints + perInterview.refreshes,
  )

  return {
    newMintsPerUserPerHour: Math.max(24, newMintsPerUserPerHour),
    newMintsPerIpPerHour: Math.max(48, newMintsPerUserPerHour * 2),
    newMintsPerInterview,
    refreshesPerUserPerHour: Math.max(
      60,
      perInterview.refreshes * interviewsPerHour * 2,
    ),
    ephemeralTtlSeconds: STT_EPHEMERAL_TTL_SECONDS,
  }
}
