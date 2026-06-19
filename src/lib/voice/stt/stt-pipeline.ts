/**
 * SttPipeline — the single speech-to-text engine for a session (audit Phase 4).
 *
 * Guarantees:
 *  - At most ONE transport is active at any time. `start()` tears down any
 *    prior transport before opening a new one; a generation token drops
 *    callbacks from superseded transports (no duplicate/stale transcripts).
 *  - Deepgram is the production engine. The browser engine is reachable ONLY
 *    via the explicit `switchToFallback()` path, never auto-selected.
 *  - Audio frames are gated by `pause()`/`resume()`; the transport/connection
 *    is NOT torn down between questions (the persistent session lives above in
 *    the orchestrator + AudioSessionManager).
 *  - Transcript assembly is delegated to the pure `TranscriptAssembler`.
 *
 * Framework-agnostic and unit-testable via an injected `SttTransportFactory`.
 */
import {
  type SttTransport,
  type SttTransportFactory,
  type SttEngineKind,
} from '@/lib/voice/stt/stt-transport'
import { TranscriptAssembler } from '@/lib/voice/stt/transcript-assembler'
import { createVoiceLogger, type VoiceLogger } from '@/lib/voice/core/observability'
import type { VoiceEventBus } from '@/lib/voice/core/event-bus'
import type { TurnContext } from '@/lib/voice/core/ids'

type LogCtx = Pick<TurnContext, 'interviewId' | 'sessionId' | 'turnId' | 'correlationId'> | null

export interface SttPipelineCallbacks {
  /** Fired when the engine confirms it is listening. */
  onListening?: (engine: SttEngineKind) => void
  /** VAD end-of-utterance: the assembled answer is ready for auto-submit. */
  onAnswerReady?: (fullText: string) => void
  /** Transcript changed (interim or final). */
  onTranscript?: (merged: string) => void
  /** Unrecoverable transport error (orchestrator decides recovery). */
  onError?: (message: string, engine: SttEngineKind) => void
}

export interface SttPipelineOptions {
  transportFactory: SttTransportFactory
  callbacks?: SttPipelineCallbacks
  logger?: VoiceLogger
  bus?: VoiceEventBus
  primaryEngine?: SttEngineKind
}

export interface SttStartOptions {
  engine?: SttEngineKind
  preserveTranscript?: boolean
  ctx?: LogCtx
}

export class SttPipeline {
  private readonly transportFactory: SttTransportFactory
  private readonly callbacks: SttPipelineCallbacks
  private readonly logger: VoiceLogger
  private readonly bus?: VoiceEventBus
  private readonly primaryEngine: SttEngineKind
  private readonly assembler = new TranscriptAssembler()

  private transport: SttTransport | null = null
  private engine: SttEngineKind
  private generation = 0
  private paused = true
  private startInFlight = false
  private ctx: LogCtx = null

  constructor(opts: SttPipelineOptions) {
    this.transportFactory = opts.transportFactory
    this.callbacks = opts.callbacks ?? {}
    this.logger = opts.logger ?? createVoiceLogger('stt')
    this.bus = opts.bus
    this.primaryEngine = opts.primaryEngine ?? 'deepgram'
    this.engine = this.primaryEngine
  }

  getEngine(): SttEngineKind {
    return this.engine
  }

  isActive(): boolean {
    return this.transport !== null
  }

  isPaused(): boolean {
    return this.paused
  }

  getMergedTranscript(): string {
    return this.assembler.merged()
  }

  getFinalTranscript(): string {
    return this.assembler.final()
  }

  /** Clear the transcript for a fresh turn. Does not touch the connection. */
  resetTurn(): void {
    this.assembler.reset()
  }

  /**
   * Open (or replace) the STT transport. Enforces the single-engine invariant
   * by stopping any existing transport first. Audio frames remain gated until
   * `resume()` is called.
   */
  async start(opts?: SttStartOptions): Promise<void> {
    if (this.startInFlight) {
      this.logger.warn('stt_start_in_flight', this.ctx, {})
      return
    }
    this.startInFlight = true
    try {
      const engine = opts?.engine ?? this.engine
      this.ctx = opts?.ctx ?? this.ctx

      // Single-engine invariant — never two transports alive at once.
      this.teardownTransport()

      if (!opts?.preserveTranscript) {
        this.assembler.reset()
      }

      const myGen = ++this.generation
      this.engine = engine
      this.paused = true

      const transport = this.transportFactory(engine)
      this.transport = transport

      await transport.start({
        onOpen: () => {
          if (myGen !== this.generation) return
          this.logger.info('stt_listening', this.ctx, { engine })
          this.bus?.emit('ListeningStarted', { engine }, { ctx: this.ctx })
          this.callbacks.onListening?.(engine)
        },
        onPartial: (text) => {
          if (myGen !== this.generation) return
          this.assembler.setInterim(text)
          this.bus?.emit('TranscriptUpdated', { interim: text }, { ctx: this.ctx })
          this.callbacks.onTranscript?.(this.assembler.merged())
        },
        onFinalSegment: (text) => {
          if (myGen !== this.generation) return
          this.assembler.appendFinal(text)
          this.callbacks.onTranscript?.(this.assembler.merged())
        },
        onUtteranceEnd: (fullText) => {
          if (myGen !== this.generation) return
          if (fullText.trim()) this.assembler.appendFinal(fullText)
          const merged = this.assembler.merged()
          if (!merged) return
          this.logger.info('stt_utterance_end', this.ctx, { chars: merged.length })
          this.bus?.emit('TranscriptFinalized', { text: merged, chars: merged.length }, { ctx: this.ctx })
          this.callbacks.onAnswerReady?.(merged)
        },
        onError: (err) => {
          if (myGen !== this.generation) return
          this.logger.error('stt_transport_error', this.ctx, { engine, message: err.message })
          this.bus?.emit('Error', { scope: 'stt', message: err.message }, { ctx: this.ctx })
          this.callbacks.onError?.(err.message, engine)
        },
        onClose: (info) => {
          if (myGen !== this.generation) return
          this.logger.info('stt_transport_close', this.ctx, { engine, code: info.code })
        },
      })
    } finally {
      this.startInFlight = false
    }
  }

  /** Forward a PCM frame to the transport when actively listening. */
  sendAudio(frame: ArrayBuffer): void {
    if (!this.transport || this.paused) return
    this.transport.sendAudio(frame)
  }

  /** Begin forwarding frames (answer window open). */
  resume(): void {
    this.paused = false
  }

  /** Stop forwarding frames (answer window closed) — connection stays alive. */
  pause(): void {
    this.paused = true
  }

  /**
   * Explicit emergency fallback to the browser engine. Never called
   * automatically — only by an operator/user action surfaced in the UI.
   */
  async switchToFallback(opts?: { preserveTranscript?: boolean; ctx?: LogCtx }): Promise<void> {
    this.logger.warn('stt_switch_to_browser_fallback', opts?.ctx ?? this.ctx, {})
    await this.start({
      engine: 'browser',
      preserveTranscript: opts?.preserveTranscript ?? true,
      ctx: opts?.ctx,
    })
  }

  /** Return to the primary (Deepgram) engine. */
  async switchToPrimary(opts?: { preserveTranscript?: boolean; ctx?: LogCtx }): Promise<void> {
    await this.start({
      engine: this.primaryEngine,
      preserveTranscript: opts?.preserveTranscript ?? true,
      ctx: opts?.ctx,
    })
  }

  private teardownTransport(): void {
    const t = this.transport
    this.transport = null
    this.generation++ // invalidate in-flight callbacks
    if (t) {
      try {
        t.stop()
      } catch {
        /* idempotent */
      }
    }
  }

  /** Stop the active transport. Transcript is retained until `resetTurn()`. */
  async stop(): Promise<void> {
    this.paused = true
    this.teardownTransport()
  }

  /** Full teardown for session end. */
  async dispose(): Promise<void> {
    await this.stop()
    this.assembler.reset()
  }
}
