/**
 * Identity primitives for the voice pipeline.
 *
 * Every voice session, turn, and event carries stable, unique identifiers so
 * that logs, telemetry, and the event bus are fully correlatable (audit
 * Phase 10 — "No anonymous logs"). These helpers are pure and isomorphic
 * (browser + Node) — they use `crypto.randomUUID` which is available in Node
 * 18+ and all evergreen browsers.
 */

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Deterministic-enough fallback for environments without crypto (should not
  // happen in Node 22 / modern browsers, but keeps the function total).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Opaque branded id types — prevent accidentally passing one kind where another is expected. */
export type SessionId = string & { readonly __brand: 'SessionId' }
export type TurnId = string & { readonly __brand: 'TurnId' }
export type CorrelationId = string & { readonly __brand: 'CorrelationId' }

export function createSessionId(): SessionId {
  return `vs_${randomId()}` as SessionId
}

export function createTurnId(): TurnId {
  return `turn_${randomId()}` as TurnId
}

export function createCorrelationId(): CorrelationId {
  return `corr_${randomId()}` as CorrelationId
}

/**
 * Immutable context threaded through every transition, event, and log line for
 * a single conversational turn. The orchestrator creates a fresh `TurnContext`
 * whenever a new question/follow-up begins; `correlationId` ties together all
 * the async work (TTS → listen → STT → LLM) belonging to that turn.
 */
export interface TurnContext {
  readonly interviewId: string
  readonly sessionId: SessionId
  readonly turnId: TurnId
  readonly correlationId: CorrelationId
  /** Zero-based index of the static question this turn belongs to. */
  readonly questionIndex: number
  /** True when this turn is an orchestrator follow-up rather than a static question. */
  readonly isFollowUp: boolean
}

export interface CreateTurnContextInput {
  interviewId: string
  sessionId: SessionId
  questionIndex: number
  isFollowUp?: boolean
}

export function createTurnContext(input: CreateTurnContextInput): TurnContext {
  return {
    interviewId: input.interviewId,
    sessionId: input.sessionId,
    turnId: createTurnId(),
    correlationId: createCorrelationId(),
    questionIndex: input.questionIndex,
    isFollowUp: input.isFollowUp ?? false,
  }
}
