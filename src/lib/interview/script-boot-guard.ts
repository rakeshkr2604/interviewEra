/**
 * One-shot guards for script interview boot / first-turn apply.
 *
 * Root cause of duplicate warmup greeting:
 *   The boot effect can re-enter (Strict Mode remount race, router identity
 *   churn) after bootCalledRef is already true. The old fallback treated
 *   "no turnPromise" as "fetch [NONE] again", which minted turn_index=2 and
 *   called applyTurnPayload → elSpeak a second time.
 */

export type BootTurnFetchDecision =
  | { action: 'fetch_first_turn' }
  | { action: 'skip_await_unlock' }
  | { action: 'skip_already_booted' }

export function decideBootTurnFetch(opts: {
  needsUnlock: boolean
  bootAlreadyCalled: boolean
}): BootTurnFetchDecision {
  if (opts.needsUnlock) return { action: 'skip_await_unlock' }
  if (opts.bootAlreadyCalled) return { action: 'skip_already_booted' }
  return { action: 'fetch_first_turn' }
}

/**
 * Whether the boot path should kick a serial loadTurn('[NONE]') fallback.
 * Only when we never started a first-turn fetch (unexpected empty join).
 */
export function shouldFallbackLoadFirstTurn(opts: {
  needsUnlock: boolean
  bootCalled: boolean
  turnResult: unknown | null
  cancelled: boolean
}): boolean {
  if (opts.cancelled) return false
  if (opts.needsUnlock) return false
  // Re-entry after a successful boot mark: do NOT fetch again.
  if (opts.bootCalled && opts.turnResult == null) return false
  return opts.turnResult == null
}

/** Module-level: at most one apply+speak of the boot turn per interview. */
const appliedBootSpeakByInterview = new Set<string>()

export function claimBootTurnApply(interviewId: string): boolean {
  if (!interviewId) return false
  if (appliedBootSpeakByInterview.has(interviewId)) return false
  appliedBootSpeakByInterview.add(interviewId)
  return true
}

export function releaseBootTurnApplyClaim(interviewId: string): void {
  appliedBootSpeakByInterview.delete(interviewId)
}

/** Test helper — clears process-local claims. */
export function _resetBootTurnApplyClaimsForTests(): void {
  appliedBootSpeakByInterview.clear()
}
