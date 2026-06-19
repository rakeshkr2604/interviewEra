/**
 * Stateful driver around the pure FSM definition (`session-state.ts`).
 *
 * Guarantees (audit Phase 2):
 *  - Illegal transitions are rejected (return `false`), never applied.
 *  - Every accepted transition is logged with full turn context and emitted on
 *    the event bus as `StateTransition`.
 *  - A bounded history is retained for debugging / post-mortem.
 *
 * Timeout protection and cancellation are layered by the orchestrator, which
 * owns timers; this class stays free of side effects beyond logging/emitting so
 * it remains deterministic and unit-testable.
 */
import {
  type VoiceSessionState,
  type VoiceSessionEvent,
  nextState,
  isTerminal,
  legalEvents,
} from '@/lib/voice/core/session-state'
import type { TurnContext } from '@/lib/voice/core/ids'
import type { VoiceEventBus } from '@/lib/voice/core/event-bus'
import { createVoiceLogger, type VoiceLogger } from '@/lib/voice/core/observability'

export interface TransitionRecord {
  from: VoiceSessionState
  to: VoiceSessionState
  event: VoiceSessionEvent
  ts: number
  turnId: string | null
}

export interface StateChangeListenerArgs {
  from: VoiceSessionState
  to: VoiceSessionState
  event: VoiceSessionEvent
  ctx: TurnContext | null
}

export type StateChangeListener = (args: StateChangeListenerArgs) => void

export interface VoiceSessionStateMachineOptions {
  bus?: VoiceEventBus
  logger?: VoiceLogger
  /** Max retained transitions in history (default 64). */
  historyLimit?: number
  initial?: VoiceSessionState
}

const DEFAULT_HISTORY_LIMIT = 64

export class VoiceSessionStateMachine {
  private state: VoiceSessionState
  private readonly bus?: VoiceEventBus
  private readonly logger: VoiceLogger
  private readonly historyLimit: number
  private readonly history: TransitionRecord[] = []
  private readonly listeners = new Set<StateChangeListener>()

  constructor(opts?: VoiceSessionStateMachineOptions) {
    this.state = opts?.initial ?? 'idle'
    this.bus = opts?.bus
    this.logger = opts?.logger ?? createVoiceLogger('fsm')
    this.historyLimit = opts?.historyLimit ?? DEFAULT_HISTORY_LIMIT
  }

  getState(): VoiceSessionState {
    return this.state
  }

  is(state: VoiceSessionState): boolean {
    return this.state === state
  }

  isTerminal(): boolean {
    return isTerminal(this.state)
  }

  /** Events legal from the current state. */
  legalEvents(): VoiceSessionEvent[] {
    return legalEvents(this.state)
  }

  /** Whether `event` can currently be applied. */
  can(event: VoiceSessionEvent): boolean {
    return nextState(this.state, event) !== null
  }

  /**
   * Attempt a transition. Returns `true` if applied, `false` if illegal.
   * An illegal transition is logged at warn level and otherwise ignored — the
   * machine can never reach an impossible state.
   */
  send(event: VoiceSessionEvent, ctx: TurnContext | null = null): boolean {
    const from = this.state
    const to = nextState(from, event)

    if (to === null) {
      this.logger.warn('illegal_transition', ctx, { from, event, legal: legalEvents(from) })
      return false
    }

    this.state = to
    const record: TransitionRecord = {
      from,
      to,
      event,
      ts: Date.now(),
      turnId: ctx?.turnId ?? null,
    }
    this.history.push(record)
    if (this.history.length > this.historyLimit) this.history.shift()

    this.logger.info('state_transition', ctx, { from, to, event })
    this.bus?.emit('StateTransition', { from, to, event }, { ctx })

    for (const listener of Array.from(this.listeners)) {
      try {
        listener({ from, to, event, ctx })
      } catch (err) {
        this.logger.error('state_listener_error', ctx, {
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }
    return true
  }

  /** Subscribe to accepted transitions. Returns an unsubscribe function. */
  onChange(listener: StateChangeListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Immutable snapshot of recent transitions (newest last). */
  getHistory(): readonly TransitionRecord[] {
    return this.history.slice()
  }

  /** Drop listeners (called on dispose). State is left at `destroyed`. */
  dispose(): void {
    this.listeners.clear()
  }
}
