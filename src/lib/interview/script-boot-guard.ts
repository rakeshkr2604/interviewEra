/**
 * One-shot guards for script interview boot / first-turn apply.
 *
 * Root cause of duplicate warmup greeting:
 *   The boot effect can re-enter (Strict Mode remount race, router identity
 *   churn) after bootCalledRef is already true. The old fallback treated
 *   "no turnPromise" as "fetch [NONE] again", which minted turn_index=2 and
 *   called applyTurnPayload → elSpeak a second time.
 *
 * Root cause of boot hang (Strict Mode):
 *   Re-entry skipped the second fetch (correct) but also discarded the first
 *   mount's in-flight /turn result after that mount was cancelled — nobody
 *   called applyTurnPayload. The registry below keeps the promise until apply
 *   claims so the surviving mount can consume it.
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

/** True after a successful apply claim for this interview (this JS process). */
export function hasBootTurnApplyClaim(interviewId: string): boolean {
  return Boolean(interviewId) && appliedBootSpeakByInterview.has(interviewId)
}

/** Test helper — clears process-local claims. */
export function _resetBootTurnApplyClaimsForTests(): void {
  appliedBootSpeakByInterview.clear()
}

// ── In-flight / settled first-turn registry ─────────────────────────────────

type BootTurnEntry<T> = {
  promise: Promise<T>
  /** Set when the promise fulfills; null while pending or after rejection. */
  result: T | null
  rejected: boolean
}

/**
 * Keeps the first `[NONE]` /turn promise per interview until apply claims it.
 * Unlike a plain in-flight map that deletes on settle, this survives the
 * Strict Mode gap where mount-1 cleanup runs before mount-2 can await.
 */
const bootTurnRegistry = new Map<string, BootTurnEntry<unknown>>()

export function getBootTurnPromise<T>(interviewId: string): Promise<T> | null {
  const entry = bootTurnRegistry.get(interviewId)
  return entry ? (entry.promise as Promise<T>) : null
}

export function getBootTurnResult<T>(interviewId: string): T | null {
  const entry = bootTurnRegistry.get(interviewId)
  if (!entry || entry.rejected) return null
  return (entry.result as T | null) ?? null
}

/**
 * Register (or join) the first-turn fetch for an interview.
 * Concurrent callers share the same promise — never a second fetch.
 */
export function registerBootTurnFetch<T>(
  interviewId: string,
  startFetch: () => Promise<T>,
): Promise<T> {
  const existing = bootTurnRegistry.get(interviewId)
  if (existing) return existing.promise as Promise<T>

  const promise = startFetch()
  const entry: BootTurnEntry<T> = { promise, result: null, rejected: false }
  bootTurnRegistry.set(interviewId, entry as BootTurnEntry<unknown>)

  void promise.then(
    (value) => {
      const current = bootTurnRegistry.get(interviewId)
      if (current && current.promise === promise) {
        current.result = value
      }
    },
    () => {
      const current = bootTurnRegistry.get(interviewId)
      if (current && current.promise === promise) {
        current.rejected = true
        // Allow a deliberate retry after failure.
        bootTurnRegistry.delete(interviewId)
      }
    },
  )

  return promise
}

/** Drop the registry entry after apply (or on hard failure / retry reset). */
export function clearBootTurnFetch(interviewId: string): void {
  bootTurnRegistry.delete(interviewId)
}

/** Test helper — clears the boot-turn registry. */
export function _resetBootTurnRegistryForTests(): void {
  bootTurnRegistry.clear()
}

/**
 * Pure decision: given a boot-fetch decision, should this mount start a new
 * fetch, join an existing registry promise, or have no turn work?
 */
export function resolveBootTurnSource(opts: {
  decision: BootTurnFetchDecision
  interviewId: string
  hasRegisteredPromise: boolean
}): 'start_fetch' | 'join_existing' | 'none' {
  if (opts.decision.action === 'skip_await_unlock') return 'none'
  if (opts.decision.action === 'fetch_first_turn') return 'start_fetch'
  // skip_already_booted
  if (opts.hasRegisteredPromise) return 'join_existing'
  return 'none'
}
