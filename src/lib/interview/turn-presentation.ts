/**
 * Client turn-presentation ownership (script interview).
 *
 * One logical turn (turnIndex) ⇒ at most one UI presentation and one TTS
 * sequence. Stale async callbacks from an older turn must not mutate the
 * active turn. Warmup is terminal once left. Feedback is bound to the
 * approved answer's identity — never rendered beside a different question.
 *
 * Pure decisions + process-local claims. No network, no TTS/STT providers.
 */

export type WarmupLifecycle = 'idle' | 'presenting' | 'waiting_for_answer' | 'completed'

export type FeedbackBind = {
  turnIndex: number
  displayQuestion: string
}

export type TurnApplyDecision =
  | 'apply'
  | 'hydrate_ui_only'
  | 'ignore_stale'
  | 'ignore_duplicate'

export type TurnSpeakDecision = 'speak' | 'skip_already_spoken' | 'skip_not_active'

export type ContinueActivationDecision = 'clear_feedback_then_apply'

// ── Process-local claims (survive Strict Mode remount; same pattern as boot guard) ─

const presentedByInterview = new Map<string, Set<number>>()
const spokenByInterview = new Map<string, Set<number>>()
const activeTurnByInterview = new Map<string, number>()
const warmupByInterview = new Map<string, WarmupLifecycle>()

function presentedSet(interviewId: string): Set<number> {
  let set = presentedByInterview.get(interviewId)
  if (!set) {
    set = new Set()
    presentedByInterview.set(interviewId, set)
  }
  return set
}

function spokenSet(interviewId: string): Set<number> {
  let set = spokenByInterview.get(interviewId)
  if (!set) {
    set = new Set()
    spokenByInterview.set(interviewId, set)
  }
  return set
}

export function getPresentedTurnIndexes(interviewId: string): ReadonlySet<number> {
  return presentedSet(interviewId)
}

export function hasTurnBeenPresented(interviewId: string, turnIndex: number): boolean {
  return Boolean(interviewId) && presentedSet(interviewId).has(turnIndex)
}

export function markTurnPresented(interviewId: string, turnIndex: number): void {
  if (!interviewId || !Number.isFinite(turnIndex)) return
  presentedSet(interviewId).add(turnIndex)
}

export function hasTurnBeenSpoken(interviewId: string, turnIndex: number): boolean {
  return Boolean(interviewId) && spokenSet(interviewId).has(turnIndex)
}

/** First caller owns TTS for this turn identity. Later callers must not speak it again. */
export function claimTurnSpeak(interviewId: string, turnIndex: number): boolean {
  if (!interviewId || !Number.isFinite(turnIndex)) return false
  const set = spokenSet(interviewId)
  if (set.has(turnIndex)) return false
  set.add(turnIndex)
  return true
}

export function getActiveTurnIndex(interviewId: string): number | null {
  if (!interviewId) return null
  return activeTurnByInterview.get(interviewId) ?? null
}

export function setActiveTurnIndex(interviewId: string, turnIndex: number): void {
  if (!interviewId || !Number.isFinite(turnIndex)) return
  activeTurnByInterview.set(interviewId, turnIndex)
}

export function getWarmupLifecycle(interviewId: string): WarmupLifecycle {
  if (!interviewId) return 'idle'
  return warmupByInterview.get(interviewId) ?? 'idle'
}

export function setWarmupLifecycle(interviewId: string, next: WarmupLifecycle): void {
  if (!interviewId) return
  warmupByInterview.set(interviewId, next)
}

export function _resetTurnPresentationForTests(): void {
  presentedByInterview.clear()
  spokenByInterview.clear()
  activeTurnByInterview.clear()
  warmupByInterview.clear()
}

// ── Pure decisions ───────────────────────────────────────────────────────────

/**
 * Whether an incoming turn may become the visible/spoken turn.
 *
 * turnIndex is the existing stable identity (script_turns.turn_index).
 */
export function decideTurnApply(opts: {
  interviewId: string
  incomingTurnIndex: number
  incomingPhase: string
  /** Component's in-memory active turn (null after Strict Mode remount). */
  componentActiveTurnIndex: number | null
}): TurnApplyDecision {
  const { interviewId, incomingTurnIndex, incomingPhase, componentActiveTurnIndex } = opts
  const warmup = getWarmupLifecycle(interviewId)
  const moduleActive = getActiveTurnIndex(interviewId)
  const alreadyPresented = hasTurnBeenPresented(interviewId, incomingTurnIndex)

  if (warmup === 'completed' && incomingPhase === 'warmup') {
    return 'ignore_stale'
  }

  if (moduleActive != null && incomingTurnIndex < moduleActive) {
    return 'ignore_stale'
  }

  if (alreadyPresented) {
    if (componentActiveTurnIndex === incomingTurnIndex) return 'ignore_duplicate'
    if (moduleActive != null && moduleActive > incomingTurnIndex) return 'ignore_stale'
    // Remount (or empty React state): restore UI, do not speak again.
    return 'hydrate_ui_only'
  }

  return 'apply'
}

export function decideTurnSpeak(opts: {
  interviewId: string
  turnIndex: number
  hydrateOnly: boolean
}): TurnSpeakDecision {
  if (opts.hydrateOnly) return 'skip_already_spoken'
  const active = getActiveTurnIndex(opts.interviewId)
  if (active != null && active !== opts.turnIndex) return 'skip_not_active'
  if (hasTurnBeenSpoken(opts.interviewId, opts.turnIndex)) return 'skip_already_spoken'
  return 'speak'
}

/**
 * Stale TTS / turn-completion callback guard.
 * callbackTurnIndex must match the live active turn AND the generation that
 * started this playback. Warmup callbacks after EXIT_WARMUP are always stale.
 */
export function isLiveTurnCallback(opts: {
  interviewId: string
  callbackTurnIndex: number
  callbackGeneration: number
  activeGeneration: number
  callbackPhase?: string
}): boolean {
  if (opts.callbackGeneration !== opts.activeGeneration) return false
  const active = getActiveTurnIndex(opts.interviewId)
  if (active == null || active !== opts.callbackTurnIndex) return false
  if (
    opts.callbackPhase === 'warmup' &&
    getWarmupLifecycle(opts.interviewId) === 'completed'
  ) {
    return false
  }
  return true
}

export function nextWarmupLifecycle(opts: {
  current: WarmupLifecycle
  event: 'present' | 'waiting_for_answer' | 'answer_submitted' | 'exit_to_non_warmup'
  incomingPhase: string
}): WarmupLifecycle {
  if (opts.current === 'completed') return 'completed'
  if (opts.event === 'exit_to_non_warmup' || opts.incomingPhase !== 'warmup') {
    return opts.incomingPhase === 'warmup' && opts.event !== 'exit_to_non_warmup'
      ? opts.current
      : 'completed'
  }
  // Answer submitted still allows the scripted warmup ack turn ("That's great.")
  // to apply. Warmup becomes terminal only on exit_to_non_warmup.
  if (opts.event === 'answer_submitted') return 'waiting_for_answer'
  if (opts.event === 'present') return 'presenting'
  if (opts.event === 'waiting_for_answer') {
    return opts.current === 'idle' ? 'waiting_for_answer' : 'waiting_for_answer'
  }
  return opts.current
}

export function applyWarmupEvent(
  interviewId: string,
  event: 'present' | 'waiting_for_answer' | 'answer_submitted' | 'exit_to_non_warmup',
  incomingPhase: string,
): WarmupLifecycle {
  const next = nextWarmupLifecycle({
    current: getWarmupLifecycle(interviewId),
    event,
    incomingPhase,
  })
  setWarmupLifecycle(interviewId, next)
  return next
}

/** Stop prior TTS when the incoming turn is a different identity. */
export function shouldStopPriorTts(opts: {
  interviewId: string
  incomingTurnIndex: number
  hydrateOnly: boolean
}): boolean {
  if (opts.hydrateOnly) return false
  const prev = getActiveTurnIndex(opts.interviewId)
  return prev != null && prev !== opts.incomingTurnIndex
}

export function uiTtsShareIdentity(opts: {
  uiTurnIndex: number | null
  spokenTurnIndex: number | null
}): boolean {
  if (opts.uiTurnIndex == null || opts.spokenTurnIndex == null) return false
  return opts.uiTurnIndex === opts.spokenTurnIndex
}

// ── Feedback identity ────────────────────────────────────────────────────────

export function feedbackBindEquals(
  a: FeedbackBind | null | undefined,
  b: FeedbackBind | null | undefined,
): boolean {
  if (!a || !b) return false
  return a.turnIndex === b.turnIndex && a.displayQuestion === b.displayQuestion
}

/**
 * Never return a stale payload just because it is the latest object in state.
 * Mismatch / missing identity → empty (caller shows loading/blank).
 */
export function selectFeedbackForRender<T>(opts: {
  payload: T | null | undefined
  payloadBind: FeedbackBind | null | undefined
  activeBind: FeedbackBind | null | undefined
}): { status: 'ready'; payload: T } | { status: 'empty' } {
  if (!opts.payload || !feedbackBindEquals(opts.payloadBind, opts.activeBind)) {
    return { status: 'empty' }
  }
  return { status: 'ready', payload: opts.payload }
}

/**
 * Mixed feedback(X) + question(Y) is forbidden. Overlay may show feedback
 * only while the visible question identity is still X (or hidden).
 */
export function canShowFeedbackWithVisibleQuestion(opts: {
  feedbackTurnIndex: number | null
  visibleQuestionTurnIndex: number | null
  reviewOpen: boolean
  reviewStep: 'transcript' | 'feedback'
}): boolean {
  if (!opts.reviewOpen || opts.reviewStep !== 'feedback') return false
  if (opts.feedbackTurnIndex == null) return false
  if (opts.visibleQuestionTurnIndex == null) return true
  return opts.feedbackTurnIndex === opts.visibleQuestionTurnIndex
}

/** Continue must drop feedback identity before the next turn becomes visible. */
export function decideContinueActivation(): ContinueActivationDecision {
  return 'clear_feedback_then_apply'
}

export function isStaleFetchCallback(opts: {
  callbackFetchGeneration: number
  activeFetchGeneration: number
}): boolean {
  return opts.callbackFetchGeneration !== opts.activeFetchGeneration
}

// ── Candidate-answering progression ──────────────────────────────────────────

/**
 * Existing auto-turn ceiling in the script page (`consecutiveAutoTurns > 3`).
 * Ack #1–#3 auto-advance; the next consecutive non-question recovers.
 */
export const MAX_CONSECUTIVE_NON_QUESTION_TURNS = 3

export type NonQuestionProgression = 'auto_advance' | 'recover'

export type AuthoritativeQuestionTurn = {
  is_question?: boolean
  display_question?: string | null
  speech?: string | null
}

/** Server-authoritative, non-empty question the candidate may answer. */
export function turnHasAuthoritativeQuestion(
  turn: AuthoritativeQuestionTurn | null | undefined,
): boolean {
  if (!turn?.is_question) return false
  const question = (turn.display_question || turn.speech || '').trim()
  return question.length > 0
}

/**
 * answering ⇔ authoritative current question exists.
 * is_question:false (ack / move-on) must never enter candidate_answering.
 */
export function canEnterCandidateAnswering(
  turn: AuthoritativeQuestionTurn | null | undefined,
): boolean {
  return turnHasAuthoritativeQuestion(turn)
}

/**
 * @param consecutiveCount count *after* incrementing for this non-question turn
 */
export function decideNonQuestionProgression(
  consecutiveCount: number,
  ceiling: number = MAX_CONSECUTIVE_NON_QUESTION_TURNS,
): NonQuestionProgression {
  if (consecutiveCount > ceiling) return 'recover'
  return 'auto_advance'
}

/**
 * Ack / move-on auto-advance: TTS complete, TTS failure, and AUTO_ADVANCE_MS
 * are equivalent progression signals. The first live signal claims; later
 * signals (including a hung-TTS callback after the timer) must not loadTurn
 * again. TTS failure is presentation-only — not a turn failure.
 */
export type AckAdvanceSignal = 'tts_complete' | 'tts_failed' | 'timer'

export type AckAdvanceDecision = 'advance' | 'ignore_duplicate' | 'ignore_stale'

export function decideAckAdvance(opts: {
  alreadyClaimed: boolean
  live: boolean
  signal: AckAdvanceSignal
}): AckAdvanceDecision {
  if (!opts.live) return 'ignore_stale'
  if (opts.alreadyClaimed) return 'ignore_duplicate'
  void opts.signal
  return 'advance'
}

/** Conservative floor for TTS pacing; real playback is faster than this. */
export const ACK_TTS_WORDS_PER_MINUTE = 130
export const ACK_HANG_WATCHDOG_BUFFER_MS = 4_000
export const ACK_HANG_WATCHDOG_MAX_MS = 45_000

/**
 * Hang watchdog for a non-question turn, sized to the speech it must outlast.
 *
 * A fixed delay was safe only while every auto-advancing turn was a short
 * canned ack. Substantive ones (candidate-question answers) speak far longer
 * than that, and the timer then fired mid-sentence, replacing the turn and
 * cutting playback off after a few words. This guards a genuinely hung TTS
 * only — playback completion still advances on its own.
 */
export function resolveAckHangWatchdogMs(
  speech: string,
  minimumMs: number,
  opts?: { wordsPerMinute?: number; bufferMs?: number; maxMs?: number },
): number {
  const wordsPerMinute = opts?.wordsPerMinute ?? ACK_TTS_WORDS_PER_MINUTE
  const bufferMs = opts?.bufferMs ?? ACK_HANG_WATCHDOG_BUFFER_MS
  const maxMs = opts?.maxMs ?? ACK_HANG_WATCHDOG_MAX_MS

  const words = speech.trim().split(/\s+/).filter(Boolean).length
  const spokenMs = Math.ceil((words / wordsPerMinute) * 60_000)

  return Math.min(maxMs, Math.max(minimumMs, spokenMs + bufferMs))
}
