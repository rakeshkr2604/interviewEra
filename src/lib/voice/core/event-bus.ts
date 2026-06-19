/**
 * Typed, correlated event bus for the voice pipeline (audit Phase 7).
 *
 * Pure and dependency-free. Every event is wrapped in an envelope carrying
 * session/turn/correlation ids + timestamp. Dispatch is synchronous; a throwing
 * listener is isolated so it cannot break other subscribers or the emitter.
 */
import type { SessionId, TurnId, CorrelationId, TurnContext } from '@/lib/voice/core/ids'
import type { VoiceSessionState, VoiceSessionEvent } from '@/lib/voice/core/session-state'

/** Discriminated payloads per event type. Extend here as the pipeline grows. */
export interface VoiceEventPayloads {
  InterviewStarted: { interviewId: string }
  QuestionGenerated: { questionIndex: number; isFollowUp: boolean; text: string }
  QuestionPlaying: { engine: 'elevenlabs' | 'browser'; textLength: number }
  QuestionFinished: { reason: 'completed' | 'failed' | 'canceled' }
  ListeningStarted: { engine: 'deepgram' | 'browser' }
  SpeechDetected: Record<string, never>
  TranscriptUpdated: { interim: string }
  TranscriptFinalized: { text: string; chars: number }
  AnswerSubmitted: { source: 'vad' | 'timer' | 'button' | 'watchdog'; chars: number }
  LLMStarted: { kind: 'score' | 'process' }
  LLMCompleted: { kind: 'score' | 'process'; latencyMs: number; ok: boolean }
  PlaybackStarted: { durationSec: number | null }
  PlaybackCompleted: { reason: 'ended' | 'canceled' }
  InterviewCompleted: { reportId: string | null }
  InterviewDestroyed: { reason: string }
  // Internal / observability events
  StateTransition: { from: VoiceSessionState; to: VoiceSessionState; event: VoiceSessionEvent }
  ResourceLifecycle: { resource: string; phase: 'created' | 'disposed' }
  Error: { scope: string; message: string }
}

export type VoiceEventType = keyof VoiceEventPayloads

export interface VoiceEventEnvelope<T extends VoiceEventType = VoiceEventType> {
  type: T
  sessionId: SessionId | null
  turnId: TurnId | null
  correlationId: CorrelationId | null
  timestamp: number
  payload: VoiceEventPayloads[T]
}

export type VoiceEventListener<T extends VoiceEventType = VoiceEventType> = (
  envelope: VoiceEventEnvelope<T>,
) => void

type WildcardListener = (envelope: VoiceEventEnvelope) => void

export interface EmitOptions {
  ctx?: Pick<TurnContext, 'sessionId' | 'turnId' | 'correlationId'> | null
  /** Override timestamp (testing/determinism). */
  timestamp?: number
}

export class VoiceEventBus {
  private readonly listeners = new Map<VoiceEventType, Set<VoiceEventListener>>()
  private readonly wildcardListeners = new Set<WildcardListener>()
  private onListenerError?: (err: unknown, type: VoiceEventType) => void

  constructor(opts?: { onListenerError?: (err: unknown, type: VoiceEventType) => void }) {
    this.onListenerError = opts?.onListenerError
  }

  /** Subscribe to one event type. Returns an unsubscribe function. */
  on<T extends VoiceEventType>(type: T, listener: VoiceEventListener<T>): () => void {
    let set = this.listeners.get(type)
    if (!set) {
      set = new Set()
      this.listeners.set(type, set)
    }
    set.add(listener as VoiceEventListener)
    return () => {
      set?.delete(listener as VoiceEventListener)
    }
  }

  /** Subscribe to every event (observability/logging). Returns unsubscribe. */
  onAny(listener: WildcardListener): () => void {
    this.wildcardListeners.add(listener)
    return () => {
      this.wildcardListeners.delete(listener)
    }
  }

  /** Emit an event. Synchronous; listener errors are isolated. */
  emit<T extends VoiceEventType>(
    type: T,
    payload: VoiceEventPayloads[T],
    opts?: EmitOptions,
  ): VoiceEventEnvelope<T> {
    const envelope: VoiceEventEnvelope<T> = {
      type,
      payload,
      sessionId: opts?.ctx?.sessionId ?? null,
      turnId: opts?.ctx?.turnId ?? null,
      correlationId: opts?.ctx?.correlationId ?? null,
      timestamp: opts?.timestamp ?? Date.now(),
    }

    const set = this.listeners.get(type)
    if (set) {
      // Copy to a stable array so a listener unsubscribing during dispatch
      // does not mutate the set we are iterating.
      for (const listener of Array.from(set)) {
        try {
          listener(envelope as VoiceEventEnvelope)
        } catch (err) {
          this.onListenerError?.(err, type)
        }
      }
    }
    for (const listener of Array.from(this.wildcardListeners)) {
      try {
        listener(envelope as VoiceEventEnvelope)
      } catch (err) {
        this.onListenerError?.(err, type)
      }
    }
    return envelope
  }

  /** Remove every listener (used on dispose). */
  clear(): void {
    this.listeners.clear()
    this.wildcardListeners.clear()
  }

  /** Count of listeners (for tests/leak detection). */
  listenerCount(type?: VoiceEventType): number {
    if (type) return this.listeners.get(type)?.size ?? 0
    let total = this.wildcardListeners.size
    for (const set of this.listeners.values()) total += set.size
    return total
  }
}
