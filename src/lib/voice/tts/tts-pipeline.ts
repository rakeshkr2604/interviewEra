/**
 * TtsPipeline — single owner of interviewer speech synthesis + playback
 * ordering (audit Phase 5).
 *
 * Guarantees:
 *  - No overlap / no duplicates: each `speak()` supersedes the previous via a
 *    generation token; an identical in-flight utterance is ignored.
 *  - Instant cancel: `cancel()` aborts the in-flight fetch AND stops audio
 *    immediately (delegated to the single AudioSessionManager sink).
 *  - Streaming playback: text is chunked by sentence; chunk N+1 is prefetched
 *    while chunk N plays, minimizing time-to-first-audio.
 *  - Playback is delegated to the injected sink (the AudioSessionManager), so
 *    TTS never touches AudioContext directly — one audio owner.
 *
 * Framework-agnostic and unit-testable via injected synthesizer + sink.
 */
import type { AudioPlaybackCallbacks } from '@/lib/voice/audio/audio-driver'
import { splitIntoSpeechChunks } from '@/lib/voice/tts/speech-chunker'
import { createVoiceLogger, type VoiceLogger } from '@/lib/voice/core/observability'
import type { VoiceEventBus } from '@/lib/voice/core/event-bus'
import type { TurnContext } from '@/lib/voice/core/ids'
import type { TTSOptions } from '@/lib/voice/tts-client'

type LogCtx = Pick<TurnContext, 'interviewId' | 'sessionId' | 'turnId' | 'correlationId'> | null

/** Soft failure — caller should drop to browser speech for the session. */
export class TtsFallbackError extends Error {
  readonly httpStatus?: number
  constructor(message: string, httpStatus?: number) {
    super(message)
    this.name = 'TtsFallbackError'
    this.httpStatus = httpStatus
  }
}

export interface TtsSynthesizer {
  /** Synthesize one chunk. Must honor the abort signal. */
  speak(text: string, options: TTSOptions, signal: AbortSignal): Promise<ArrayBuffer>
}

export interface TtsAudioSink {
  playAudio(buffer: ArrayBuffer, callbacks: AudioPlaybackCallbacks): Promise<void>
  stopAudio(): void
}

export interface TtsSpeakCallbacks {
  onStart?: () => void
  onComplete?: () => void
  onFallback?: (message: string) => void
  onError?: (message: string) => void
}

export interface TtsPipelineOptions {
  synthesizer: TtsSynthesizer
  sink: TtsAudioSink
  logger?: VoiceLogger
  bus?: VoiceEventBus
  chunker?: (text: string) => string[]
  ctx?: LogCtx
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || err.message === 'aborted')
}

export class TtsPipeline {
  private readonly synthesizer: TtsSynthesizer
  private readonly sink: TtsAudioSink
  private readonly logger: VoiceLogger
  private readonly bus?: VoiceEventBus
  private readonly chunker: (text: string) => string[]
  private ctx: LogCtx

  private generation = 0
  private controller: AbortController | null = null
  private speaking = false
  private currentText = ''

  constructor(opts: TtsPipelineOptions) {
    this.synthesizer = opts.synthesizer
    this.sink = opts.sink
    this.logger = opts.logger ?? createVoiceLogger('tts')
    this.bus = opts.bus
    this.chunker = opts.chunker ?? ((t) => splitIntoSpeechChunks(t))
    this.ctx = opts.ctx ?? null
  }

  setContext(ctx: LogCtx): void {
    this.ctx = ctx
  }

  isSpeaking(): boolean {
    return this.speaking
  }

  /**
   * Speak `text`. Supersedes any active utterance. Resolves when this
   * utterance finishes, is superseded, or fails.
   */
  async speak(text: string, options: TTSOptions, callbacks: TtsSpeakCallbacks = {}): Promise<void> {
    const clean = text.trim()
    if (!clean) return

    // Duplicate suppression — same text already playing.
    if (this.speaking && this.currentText === clean) {
      this.logger.debug('tts_duplicate_ignored', this.ctx, {})
      return
    }

    // Instant cancel of whatever is currently speaking.
    this.cancelInternal('superseded')

    const myGen = ++this.generation
    const controller = new AbortController()
    this.controller = controller
    this.speaking = true
    this.currentText = clean

    const chunks = this.chunker(clean)
    this.logger.info('tts_speak_start', this.ctx, { chunks: chunks.length, chars: clean.length })
    this.bus?.emit('QuestionPlaying', { engine: 'elevenlabs', textLength: clean.length }, { ctx: this.ctx })
    callbacks.onStart?.()

    try {
      let prefetch: Promise<ArrayBuffer> | null =
        chunks.length > 0 ? this.synthesizer.speak(chunks[0], options, controller.signal) : null

      for (let i = 0; i < chunks.length; i++) {
        const bufferPromise = prefetch ?? this.synthesizer.speak(chunks[i], options, controller.signal)
        prefetch = null

        const buffer = await bufferPromise
        if (myGen !== this.generation) return // superseded during fetch

        // Kick off next fetch while this chunk plays (streaming).
        if (i + 1 < chunks.length) {
          prefetch = this.synthesizer.speak(chunks[i + 1], options, controller.signal)
          // Swallow rejection so an unawaited prefetch can't crash the process;
          // the real await on the next iteration surfaces it.
          prefetch.catch(() => {})
        }

        await this.playChunk(buffer, myGen)
        if (myGen !== this.generation) return
      }

      this.finish(myGen)
      this.bus?.emit('QuestionFinished', { reason: 'completed' }, { ctx: this.ctx })
      callbacks.onComplete?.()
    } catch (err) {
      if (myGen !== this.generation || isAbortError(err)) return // canceled — silent
      this.finish(myGen)
      if (err instanceof TtsFallbackError) {
        this.logger.warn('tts_fallback', this.ctx, { message: err.message, status: err.httpStatus })
        this.bus?.emit('QuestionFinished', { reason: 'failed' }, { ctx: this.ctx })
        callbacks.onFallback?.(err.message)
        return
      }
      const message = err instanceof Error ? err.message : String(err)
      this.logger.error('tts_error', this.ctx, { message })
      this.bus?.emit('Error', { scope: 'tts', message }, { ctx: this.ctx })
      callbacks.onError?.(message)
    }
  }

  private playChunk(buffer: ArrayBuffer, myGen: number): Promise<void> {
    return new Promise<void>((resolve) => {
      if (myGen !== this.generation) {
        resolve()
        return
      }
      void this.sink.playAudio(buffer, {
        onPlaybackComplete: () => resolve(),
        onPlaybackFailed: () => resolve(),
      })
    })
  }

  private finish(myGen: number): void {
    if (myGen !== this.generation) return
    this.speaking = false
    this.currentText = ''
    this.controller = null
  }

  /** Stop speaking immediately: abort fetch + stop audio. */
  cancel(): void {
    this.cancelInternal('canceled')
  }

  private cancelInternal(reason: 'superseded' | 'canceled'): void {
    this.generation++ // invalidate any in-flight speak()
    const controller = this.controller
    this.controller = null
    const wasSpeaking = this.speaking
    this.speaking = false
    this.currentText = ''
    if (controller) {
      try {
        controller.abort()
      } catch {
        /* */
      }
    }
    this.sink.stopAudio()
    if (wasSpeaking) {
      this.logger.info('tts_canceled', this.ctx, { reason })
      if (reason === 'canceled') {
        this.bus?.emit('QuestionFinished', { reason: 'canceled' }, { ctx: this.ctx })
      }
    }
  }

  async dispose(): Promise<void> {
    this.cancelInternal('canceled')
  }
}
