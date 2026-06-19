/**
 * Deterministic finite-state machine definition for a voice interview session.
 *
 * This module is PURE — no React, no browser APIs, no side effects. It defines
 * the legal state graph (audit Phase 2 — "one deterministic FSM, illegal
 * transitions impossible") and pure helpers to reason about it. The stateful
 * driver lives in `state-machine.ts`; the orchestrator wires timeouts and
 * cancellation around it.
 */

/** Every legal state in the voice session lifecycle. */
export type VoiceSessionState =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'interviewer_speaking'
  | 'preparing_listening'
  | 'listening'
  | 'processing_answer'
  | 'generating_response'
  | 'completed'
  | 'error'
  | 'destroyed'

/** Every event that may drive a transition. */
export type VoiceSessionEvent =
  | 'INITIALIZE'
  | 'READY'
  | 'SPEAK'
  | 'SPEECH_FINISHED'
  | 'LISTENING_STARTED'
  | 'ANSWER_SUBMITTED'
  | 'SCORED'
  | 'RESPONSE_READY'
  | 'INTERVIEW_DONE'
  | 'RECOVER_LISTEN'
  | 'RECOVER_SPEAK'
  | 'FAIL'
  | 'DESTROY'

/** Terminal state — no transitions out except via a fresh machine. */
export const TERMINAL_STATE: VoiceSessionState = 'destroyed'

/**
 * Canonical transition table. `TRANSITIONS[state][event]` yields the next
 * state, or is undefined when the transition is illegal. `DESTROY` and `FAIL`
 * are added programmatically below so they need not be repeated per-state.
 */
const BASE_TRANSITIONS: {
  [S in VoiceSessionState]: Partial<Record<VoiceSessionEvent, VoiceSessionState>>
} = {
  idle: { INITIALIZE: 'initializing' },
  initializing: { READY: 'ready' },
  ready: { SPEAK: 'interviewer_speaking' },
  interviewer_speaking: { SPEECH_FINISHED: 'preparing_listening' },
  preparing_listening: { LISTENING_STARTED: 'listening' },
  listening: { ANSWER_SUBMITTED: 'processing_answer' },
  processing_answer: { SCORED: 'generating_response' },
  generating_response: {
    RESPONSE_READY: 'interviewer_speaking',
    INTERVIEW_DONE: 'completed',
  },
  completed: {},
  error: {
    RECOVER_LISTEN: 'preparing_listening',
    RECOVER_SPEAK: 'interviewer_speaking',
  },
  destroyed: {},
}

/** States from which a recoverable failure (`FAIL` → `error`) is meaningful. */
const FAILABLE_STATES: ReadonlySet<VoiceSessionState> = new Set([
  'initializing',
  'interviewer_speaking',
  'preparing_listening',
  'listening',
  'processing_answer',
  'generating_response',
])

/** States from which `DESTROY` is allowed (everything except already-destroyed). */
function isDestroyable(state: VoiceSessionState): boolean {
  return state !== 'destroyed'
}

export type TransitionTable = {
  [S in VoiceSessionState]: Partial<Record<VoiceSessionEvent, VoiceSessionState>>
}

/** Fully expanded transition table including universal DESTROY and FAIL edges. */
export const TRANSITIONS: TransitionTable = (() => {
  const table = {} as TransitionTable
  ;(Object.keys(BASE_TRANSITIONS) as VoiceSessionState[]).forEach((state) => {
    const edges: Partial<Record<VoiceSessionEvent, VoiceSessionState>> = {
      ...BASE_TRANSITIONS[state],
    }
    if (isDestroyable(state)) edges.DESTROY = 'destroyed'
    if (FAILABLE_STATES.has(state)) edges.FAIL = 'error'
    table[state] = edges
  })
  return table
})()

/** Pure: the next state for `(state, event)`, or `null` when illegal. */
export function nextState(
  state: VoiceSessionState,
  event: VoiceSessionEvent,
): VoiceSessionState | null {
  return TRANSITIONS[state][event] ?? null
}

/** Pure: whether `(state, event)` is a legal transition. */
export function canTransition(
  state: VoiceSessionState,
  event: VoiceSessionEvent,
): boolean {
  return nextState(state, event) !== null
}

/** Pure: the set of events legal from `state`. */
export function legalEvents(state: VoiceSessionState): VoiceSessionEvent[] {
  return Object.keys(TRANSITIONS[state]) as VoiceSessionEvent[]
}

/** Pure: whether `state` is terminal (no outgoing transitions). */
export function isTerminal(state: VoiceSessionState): boolean {
  return state === TERMINAL_STATE
}

/** Pure: whether the microphone/STT should be capturing in `state`. */
export function isListeningState(state: VoiceSessionState): boolean {
  return state === 'listening'
}

/** Pure: whether interviewer TTS/avatar should be active in `state`. */
export function isSpeakingState(state: VoiceSessionState): boolean {
  return state === 'interviewer_speaking'
}
