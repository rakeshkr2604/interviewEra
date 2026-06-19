/**
 * AudioSessionManager — the single owner of all audio resources for one
 * interview session (audit Phase 6).
 *
 * Guarantees (Success Criteria):
 *  - The microphone is acquired EXACTLY ONCE per session. Between questions the
 *    capture pipeline is *gated* (`disableMic`/`enableMic`), never re-acquired.
 *    This eliminates the per-question "Connecting microphone…" cold start.
 *  - Playback never overlaps: each `playAudio` supersedes the previous via a
 *    sequence token and stops the prior source before starting a new one.
 *  - TTS and capture never fight for audio focus — `enableMic` first prepares
 *    capture (stops playback, suspends playback focus on Android).
 *  - Every resource is torn down deterministically by a single `dispose()`.
 *
 * It is framework-agnostic and unit-testable: raw Web Audio lives behind the
 * injected `AudioDriver`.
 */
import type {
  AudioDriver,
  AudioPlaybackCallbacks,
  AudioSessionStatus,
  CaptureHandle,
  PcmListener,
  PlaybackHandle,
} from '@/lib/voice/audio/audio-driver'
import { DisposalRegistry } from '@/lib/voice/core/disposal'
import { createVoiceLogger, type VoiceLogger } from '@/lib/voice/core/observability'
import type { VoiceEventBus } from '@/lib/voice/core/event-bus'
import type { TurnContext } from '@/lib/voice/core/ids'

type LogCtx = Pick<TurnContext, 'interviewId' | 'sessionId' | 'turnId' | 'correlationId'> | null

export interface AudioSessionManagerOptions {
  driver: AudioDriver
  logger?: VoiceLogger
  bus?: VoiceEventBus
  /** Session-scoped attribution for logs/events. */
  ctx?: LogCtx
}

export class AudioSessionManager {
  private readonly driver: AudioDriver
  private readonly logger: VoiceLogger
  private readonly bus?: VoiceEventBus
  private readonly disposal: DisposalRegistry
  private ctx: LogCtx

  private status: AudioSessionStatus = 'created'
  private captureHandle: CaptureHandle | null = null
  private initPromise: Promise<void> | null = null

  /** When false, mic PCM frames are dropped (mic stays acquired). */
  private micEnabled = false
  /** Consumer of gated PCM frames (the STT pipeline). */
  private pcmConsumer: PcmListener | null = null

  /** Active playback handle + monotonically increasing supersession token. */
  private playbackHandle: PlaybackHandle | null = null
  private playSeq = 0

  constructor(opts: AudioSessionManagerOptions) {
    this.driver = opts.driver
    this.logger = opts.logger ?? createVoiceLogger('audio')
    this.bus = opts.bus
    this.ctx = opts.ctx ?? null
    this.disposal = new DisposalRegistry({ logger: this.logger, ctx: this.ctx })
  }

  getStatus(): AudioSessionStatus {
    return this.status
  }

  isMicEnabled(): boolean {
    return this.micEnabled && this.status === 'ready'
  }

  needsGestureUnlock(): boolean {
    return this.driver.needsGestureUnlock()
  }

  /** Consume a user-gesture token (iOS). Safe to call repeatedly. */
  unlock(): void {
    this.driver.unlock()
  }

  setContext(ctx: LogCtx): void {
    this.ctx = ctx
    this.disposal.setContext(ctx)
  }

  /** Register the (single) PCM consumer. Frames only flow while mic enabled. */
  setPcmConsumer(consumer: PcmListener | null): void {
    this.pcmConsumer = consumer
  }

  /**
   * Acquire the mic and build the capture pipeline EXACTLY ONCE. Concurrent or
   * repeated calls return the same in-flight/settled promise — there is never a
   * second `getUserMedia`.
   */
  async initialize(): Promise<void> {
    if (this.status === 'ready') return
    if (this.status === 'disposing' || this.status === 'disposed') {
      throw new Error('AudioSessionManager: cannot initialize after dispose')
    }
    if (this.initPromise) return this.initPromise

    this.status = 'initializing'
    this.initPromise = (async () => {
      this.driver.unlock()
      const handle = await this.driver.startCapture((frame) => this.handlePcm(frame))
      // A dispose() may have raced the await — release immediately if so.
      if (this.status === 'disposing' || this.status === 'disposed') {
        handle.stop()
        return
      }
      this.captureHandle = handle
      this.disposal.register('mic-capture', () => handle.stop())
      this.status = 'ready'
      this.bus?.emit('ResourceLifecycle', { resource: 'mic-capture', phase: 'created' }, { ctx: this.ctx })
      this.logger.info('audio_session_ready', this.ctx, {})
    })()

    try {
      await this.initPromise
    } catch (err) {
      this.status = 'created'
      this.initPromise = null
      this.logger.error('audio_session_init_failed', this.ctx, {
        message: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
  }

  private handlePcm(frame: ArrayBuffer): void {
    if (this.status !== 'ready') return
    if (!this.micEnabled) return
    this.pcmConsumer?.(frame)
  }

  /**
   * Open the answer window: stop any interviewer audio, release focus for
   * capture, then let PCM frames flow. Does NOT re-acquire the mic.
   */
  async enableMic(): Promise<boolean> {
    if (this.status !== 'ready') {
      this.logger.warn('enable_mic_not_ready', this.ctx, { status: this.status })
      return false
    }
    // Interviewer audio must be silent before capture begins.
    this.stopAudio()
    await this.driver.prepareForCapture()
    if (this.status !== 'ready') return false
    this.micEnabled = true
    this.logger.info('mic_enabled', this.ctx, {})
    return true
  }

  /** Close the answer window — frames stop flowing; mic stays acquired. */
  disableMic(): void {
    if (!this.micEnabled) return
    this.micEnabled = false
    this.logger.info('mic_disabled', this.ctx, {})
  }

  /**
   * Play interviewer audio. Supersedes any prior playback (no overlap). The
   * `onPlaybackComplete` callback only fires for the latest request.
   */
  async playAudio(buffer: ArrayBuffer, callbacks: AudioPlaybackCallbacks = {}): Promise<void> {
    if (this.status !== 'ready') {
      callbacks.onPlaybackFailed?.('Audio session not ready.')
      return
    }
    const mySeq = ++this.playSeq
    // Stop prior source immediately so two utterances never overlap.
    this.stopActiveHandle()

    const resumed = await this.driver.resumePlayback()
    if (mySeq !== this.playSeq) return // superseded during resume
    if (!resumed) {
      callbacks.onPlaybackFailed?.('Audio playback is blocked. Tap Retry Audio.')
      return
    }

    const guarded: AudioPlaybackCallbacks = {
      onPlaybackStarted: () => {
        if (mySeq !== this.playSeq) return
        this.bus?.emit('PlaybackStarted', { durationSec: this.playbackHandle?.durationSec ?? null }, { ctx: this.ctx })
        callbacks.onPlaybackStarted?.()
      },
      onPlaybackComplete: () => {
        if (mySeq !== this.playSeq) return
        if (this.playbackHandle) this.playbackHandle = null
        this.bus?.emit('PlaybackCompleted', { reason: 'ended' }, { ctx: this.ctx })
        callbacks.onPlaybackComplete?.()
      },
      onPlaybackFailed: (msg) => {
        if (mySeq !== this.playSeq) return
        callbacks.onPlaybackFailed?.(msg)
      },
    }

    try {
      const handle = await this.driver.play(buffer, guarded)
      if (mySeq !== this.playSeq || this.status !== 'ready') {
        // A newer playback / disable / dispose happened during decode — drop this one.
        handle.stop()
        return
      }
      this.playbackHandle = handle
    } catch (err) {
      if (mySeq !== this.playSeq) return
      callbacks.onPlaybackFailed?.(err instanceof Error ? err.message : 'Playback failed.')
    }
  }

  /** Cancel interviewer audio immediately. */
  stopAudio(): void {
    this.playSeq++ // invalidate any in-flight play() awaiting decode
    this.stopActiveHandle()
  }

  private stopActiveHandle(): void {
    const handle = this.playbackHandle
    this.playbackHandle = null
    if (handle) {
      try {
        handle.stop()
      } catch {
        /* idempotent */
      }
    }
  }

  /** Resume the playback context (e.g. after tab visibility change). */
  async resumePlayback(): Promise<boolean> {
    if (this.status !== 'ready') return false
    return this.driver.resumePlayback()
  }

  /** Deterministic, idempotent teardown of every audio resource. */
  async dispose(reason = 'dispose'): Promise<void> {
    if (this.status === 'disposed' || this.status === 'disposing') return
    this.status = 'disposing'
    this.micEnabled = false
    this.pcmConsumer = null
    this.stopActiveHandle()
    this.playSeq++

    await this.disposal.disposeAll()
    this.captureHandle = null
    try {
      await this.driver.dispose()
    } catch (err) {
      this.logger.error('audio_driver_dispose_failed', this.ctx, {
        message: err instanceof Error ? err.message : String(err),
      })
    }

    this.status = 'disposed'
    this.bus?.emit('ResourceLifecycle', { resource: 'audio-session', phase: 'disposed' }, { ctx: this.ctx })
    this.logger.info('audio_session_disposed', this.ctx, { reason })
  }
}
