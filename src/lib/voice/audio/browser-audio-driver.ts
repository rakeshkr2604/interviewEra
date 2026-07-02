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
import { getMicAudioConstraints } from '@/lib/settings/client-preferences'
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

    const stream = await navigator.mediaDevices.getUserMedia(getMicAudioConstraints())
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
        try {
          stream.getTracks().forEach((t) => t.stop())
        } catch {
          /* */
        }
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
  }

  async dispose(): Promise<void> {
    this.stopActiveSource()
    if (this.captureStream) {
      try {
        this.captureStream.getTracks().forEach((t) => t.stop())
      } catch {
        /* */
      }
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
