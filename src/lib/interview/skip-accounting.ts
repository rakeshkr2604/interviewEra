/**
 * Skip budget for v2.1 script interviews.
 *
 * DB column interviews.skips_used increments when lastAnswer === '[SKIPPED]'.
 * The turn that *follows* a skip must see the post-increment count so the LLM
 * and allow_skip authority do not lag one turn behind.
 */

export const SKIPPED_ANSWER = '[SKIPPED]' as const

/** True when this submit should consume one skip from the session budget. */
export function isSkipAnswer(lastAnswer: string): boolean {
  return lastAnswer === SKIPPED_ANSWER
}

/**
 * skips_used after applying this answer (before or without a DB write).
 * Non-skip answers leave the count unchanged.
 */
export function skipsUsedAfterAnswer(currentSkipsUsed: number, lastAnswer: string): number {
  const current = Number.isFinite(currentSkipsUsed) ? Math.max(0, Math.floor(currentSkipsUsed)) : 0
  if (!isSkipAnswer(lastAnswer)) return current
  return current + 1
}

/** Remaining skips the candidate may still use (never negative). */
export function skipsRemaining(skipsUsed: number, maxSkips: number): number {
  const used = Number.isFinite(skipsUsed) ? Math.max(0, Math.floor(skipsUsed)) : 0
  const max = Number.isFinite(maxSkips) ? Math.max(0, Math.floor(maxSkips)) : 0
  return Math.max(0, max - used)
}

/**
 * Whether the Skip control may be offered for this turn.
 * Requires both model/authority allow_skip and remaining budget.
 */
export function canOfferSkip(opts: {
  allowSkip: boolean
  skipsUsed: number
  maxSkips: number
}): boolean {
  return opts.allowSkip === true && skipsRemaining(opts.skipsUsed, opts.maxSkips) > 0
}
