'use client'

/**
 * Real Web Audio / MediaDevices implementation of `AudioDriver`.
 *
 * Consolidates logic previously spread across `audio-gesture.ts`,
 * `useMicrophone.ts`, and `useVoicePlayer.ts` so that — per audit Phase 6 —
 * exactly one object touches `AudioContext`, `MediaStream`, AudioWorklet /
 * ScriptProcessor fallback, and `AudioBufferSourceNode`.
 */
import {
  needsAudioGestureUnlock,
  unlockAudioForInterview,
  getSharedInterviewAudioContext,
  resumeSharedInterviewAudioContext,
  releaseAudioForMicCapture,
  closeSharedInterviewAudioContext,
  registerCaptureAudioContext,
  unregisterCaptureAudioContext,
} from '@/lib/voice/audio-gesture'
import { micCaptureCoordinator } from '@/lib/voice/mic-capture-coordinator'
import { createPcmCaptureGraph } from '@/lib/voice/audio/pcm-capture-graph'
import { createVoiceLogger } from '@/lib/voice/core/observability'
import type {
  AudioDriver,
  AudioPlaybackCallbacks,
  CaptureHandle,
  PcmListener,
  PlaybackHandle,
} from '@/lib/voice/audio/audio-driver'

const CAPTURE_SAMPLE_RATE = 16_000

const log = createVoiceLogger('audio-driver')

export class BrowserAudioDriver implements AudioDriver {
  private captureStream: MediaStream | null = null
  private captureContext: AudioContext | null = null
  private activeSource: AudioBufferSourceNode | null = null
  private activeMediaAudio: HTMLAudioElement | null = null
  private visibilityHandler: (() => void) | null = null

  unlock(): void {
    unlockAudioForInterview()
  }

  needsGestureUnlock(): boolean {
    return needsAudioGestureUnlock()
  }

  async startCapture(onPcm: PcmListener): Promise<CaptureHandle> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone is not available in this browser.')
    }

    const stream = await micCaptureCoordinator.acquire({ owner: 'pcm' })
    this.captureStream = stream

    const ctx = new AudioContext({ sampleRate: CAPTURE_SAMPLE_RATE })
    this.captureContext = ctx
    registerCaptureAudioContext(ctx)
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        log.warn('capture_context_resume_failed', null, { state: ctx.state })
      }
    }
    if (ctx.state === 'running') {
      log.info('capture_context_ready', null, { sampleRate: ctx.sampleRate, state: ctx.state })
    }

    const captureGraph = await createPcmCaptureGraph(ctx, stream, onPcm, {
      onModeSelected: (mode) => {
        log.info('capture_mode_selected', null, { mode })
      },
    })

    this.installCaptureVisibilityResume(ctx)

    log.info('capture_started', null, { sampleRate: ctx.sampleRate, mode: captureGraph.mode })

    let stopped = false
    return {
      stop: () => {
        if (stopped) return
        stopped = true
        try {
          captureGraph.disconnect()
        } catch {
          /* */
        }
        micCaptureCoordinator.release('pcm')
        unregisterCaptureAudioContext(ctx)
        try {
          void ctx.close()
        } catch {
          /* */
        }
        if (this.captureStream === stream) this.captureStream = null
        if (this.captureContext === ctx) this.captureContext = null
        this.removeCaptureVisibilityResume()
        log.info('capture_stopped', null, {})
      },
    }
  }

  private installCaptureVisibilityResume(ctx: AudioContext): void {
    if (typeof document === 'undefined') return
    this.removeCaptureVisibilityResume()
    const handler = () => {
      if (document.visibilityState !== 'visible') return
      void this.resumeCaptureContext(ctx)
    }
    this.visibilityHandler = handler
    document.addEventListener('visibilitychange', handler)
    window.addEventListener('pageshow', handler)
  }

  private removeCaptureVisibilityResume(): void {
    if (typeof document === 'undefined' || !this.visibilityHandler) return
    document.removeEventListener('visibilitychange', this.visibilityHandler)
    window.removeEventListener('pageshow', this.visibilityHandler)
    this.visibilityHandler = null
  }

  private async resumeCaptureContext(ctx: AudioContext): Promise<boolean> {
    if (ctx.state === 'closed') return false
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        log.warn('capture_context_resume_failed', null, { state: ctx.state })
        return false
      }
    }
    const running = ctx.state === 'running'
    if (running) log.info('capture_context_resumed', null, { state: ctx.state })
    return running
  }

  async resumeCapture(): Promise<boolean> {
    const ctx = this.captureContext
    if (!ctx) return false
    return this.resumeCaptureContext(ctx)
  }

  async resumePlayback(): Promise<boolean> {
    return resumeSharedInterviewAudioContext()
  }

  async prepareForCapture(): Promise<void> {
    await releaseAudioForMicCapture()
  }

  async play(buffer: ArrayBuffer, callbacks: AudioPlaybackCallbacks): Promise<PlaybackHandle> {
    const ctx = getSharedInterviewAudioContext()
    if (!ctx) {
      callbacks.onPlaybackFailed?.('Audio context unavailable.')
      throw new Error('Audio context unavailable.')
    }

    // decodeAudioData consumes the ArrayBuffer; copy so retries are possible.
    const decoded = await ctx.decodeAudioData(buffer.slice(0))
    const source = ctx.createBufferSource()
    source.buffer = decoded
    source.connect(ctx.destination)

    this.stopActiveSource()
    this.activeSource = source

    let ended = false
    source.onended = () => {
      if (ended) return
      ended = true
      if (this.activeSource === source) this.activeSource = null
      callbacks.onPlaybackComplete?.()
    }

    source.start(0)
    callbacks.onPlaybackStarted?.()
    log.info('playback_started', null, { durationSec: decoded.duration })

    return {
      durationSec: decoded.duration,
      stop: () => {
        if (this.activeSource === source) this.activeSource = null
        try {
          source.onended = null
          source.stop()
        } catch {
          /* already stopped */
        }
      },
    }
  }

  async playStream(stream: ReadableStream<Uint8Array>, callbacks: AudioPlaybackCallbacks): Promise<PlaybackHandle> {
    const ctx = getSharedInterviewAudioContext()
    if (!ctx) {
      callbacks.onPlaybackFailed?.('Audio context unavailable.')
      throw new Error('Audio context unavailable.')
    }

    if (
      typeof window !== 'undefined' &&
      'MediaSource' in window &&
      typeof MediaSource.isTypeSupported === 'function' &&
      MediaSource.isTypeSupported('audio/mpeg')
    ) {
      return this.playMediaSourceStream(stream, callbacks)
    }

    throw new Error('MediaSource audio/mpeg unsupported')
  }

  private playMediaSourceStream(
    stream: ReadableStream<Uint8Array>,
    callbacks: AudioPlaybackCallbacks,
  ): Promise<PlaybackHandle> {
    const mediaSource = new MediaSource()
    const audio = new Audio()
    audio.src = URL.createObjectURL(mediaSource)

    let active = true
    let started = false
    let ended = false

    const cleanup = () => {
      active = false
      audio.onplaying = null
      audio.onended = null
      audio.onerror = null
      if (this.activeMediaAudio === audio) this.activeMediaAudio = null
      try {
        audio.pause()
        if (audio.src) {
          URL.revokeObjectURL(audio.src)
          audio.src = ''
        }
      } catch {
        /* */
      }
      try {
        if (mediaSource.readyState === 'open') {
          mediaSource.endOfStream()
        }
      } catch {
        /* */
      }
    }

    this.stopActiveSource()
    this.activeMediaAudio = audio

    return new Promise<PlaybackHandle>((resolve, reject) => {
      const onOpen = async () => {
        let sourceBuffer: SourceBuffer
        try {
          sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg')
        } catch (err) {
          cleanup()
          reject(err instanceof Error ? err : new Error(String(err)))
          return
        }

        audio.onplaying = () => {
          if (!started) {
            started = true
            callbacks.onPlaybackStarted?.()
            log.info('stream_playback_started', null, {})
          }
        }

        audio.onended = () => {
          if (!ended) {
            ended = true
            cleanup()
            callbacks.onPlaybackComplete?.()
          }
        }

        audio.onerror = () => {
          if (!ended) {
            ended = true
            cleanup()
            callbacks.onPlaybackFailed?.('MediaSource audio playback error')
          }
        }

        const reader = stream.getReader()
        const queue: Uint8Array[] = []
        let appending = false

        const processQueue = () => {
          if (!active || appending || queue.length === 0 || sourceBuffer.updating) return
          appending = true
          const next = queue.shift()!
          try {
            sourceBuffer.appendBuffer(new Uint8Array(next))
          } catch {
            /* buffer full or closed */
          }
        }

        sourceBuffer.addEventListener('updateend', () => {
          appending = false
          processQueue()
        })

        void audio.play().catch(() => {
          /* browser autoplay handling */
        })

        resolve({
          durationSec: null,
          stop: () => {
            cleanup()
          },
        })

        try {
          while (active) {
            const { done, value } = await reader.read()
            if (!active) break
            if (done) {
              if (mediaSource.readyState === 'open' && !sourceBuffer.updating) {
                try { mediaSource.endOfStream() } catch {}
              }
              break
            }
            if (value) {
              queue.push(value)
              processQueue()
            }
          }
        } catch (err) {
          if (active) {
            cleanup()
            callbacks.onPlaybackFailed?.(err instanceof Error ? err.message : String(err))
          }
        }
      }

      mediaSource.addEventListener('sourceopen', onOpen, { once: true })
    })
  }

  private stopActiveSource(): void {
    const source = this.activeSource
    this.activeSource = null
    if (source) {
      try {
        source.onended = null
        source.stop()
      } catch {
        /* */
      }
    }
    const mediaAudio = this.activeMediaAudio
    this.activeMediaAudio = null
    if (mediaAudio) {
      try {
        mediaAudio.onplaying = null
        mediaAudio.onended = null
        mediaAudio.onerror = null
        mediaAudio.pause()
        if (mediaAudio.src) {
          URL.revokeObjectURL(mediaAudio.src)
          mediaAudio.src = ''
        }
      } catch {
        /* */
      }
    }
  }

  async dispose(): Promise<void> {
    this.stopActiveSource()
    if (this.captureStream) {
      micCaptureCoordinator.release('pcm')
      this.captureStream = null
    }
    if (this.captureContext) {
      try {
        this.removeCaptureVisibilityResume()
        unregisterCaptureAudioContext(this.captureContext)
        await this.captureContext.close()
      } catch {
        /* */
      }
      this.captureContext = null
    }
    closeSharedInterviewAudioContext()
    log.info('driver_disposed', null, {})
  }
}
