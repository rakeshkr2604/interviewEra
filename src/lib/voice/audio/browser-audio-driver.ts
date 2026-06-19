'use client'

/**
 * Real Web Audio / MediaDevices implementation of `AudioDriver`.
 *
 * Consolidates logic previously spread across `audio-gesture.ts`,
 * `useMicrophone.ts`, and `useVoicePlayer.ts` so that — per audit Phase 6 —
 * exactly one object touches `AudioContext`, `MediaStream`, ScriptProcessor,
 * and `AudioBufferSourceNode`. The manager above owns policy; this owns plumbing.
 *
 * Two AudioContexts are used by design: a shared playback context (native rate,
 * required by `decodeAudioData`) and a dedicated 16 kHz capture context (the
 * rate Deepgram expects). Both are disposed by `dispose()`. This is still a
 * single owner — there is no other code path that creates audio contexts.
 *
 * NOTE: ScriptProcessorNode is retained for cross-browser PCM access to match
 * existing production behaviour; migration to AudioWorklet is tracked for the
 * performance pass (audit Phase 11) and isolated to this file.
 */
import {
  needsAudioGestureUnlock,
  unlockAudioForInterview,
  getSharedInterviewAudioContext,
  resumeSharedInterviewAudioContext,
  releaseAudioForMicCapture,
  closeSharedInterviewAudioContext,
} from '@/lib/voice/audio-gesture'
import { getMicAudioConstraints } from '@/lib/settings/client-preferences'
import { createVoiceLogger } from '@/lib/voice/core/observability'
import type {
  AudioDriver,
  AudioPlaybackCallbacks,
  CaptureHandle,
  PcmListener,
  PlaybackHandle,
} from '@/lib/voice/audio/audio-driver'

const CAPTURE_SAMPLE_RATE = 16_000
const SCRIPT_PROCESSOR_BUFFER = 4_096

const log = createVoiceLogger('audio-driver')

function floatToInt16(input: Float32Array): ArrayBuffer {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out.buffer
}

export class BrowserAudioDriver implements AudioDriver {
  private captureStream: MediaStream | null = null
  private captureContext: AudioContext | null = null
  private activeSource: AudioBufferSourceNode | null = null

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
    const source = ctx.createMediaStreamSource(stream)
    const processor = ctx.createScriptProcessor(SCRIPT_PROCESSOR_BUFFER, 1, 1)

    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      const channel = e.inputBuffer.getChannelData(0)
      onPcm(floatToInt16(channel))
    }

    // ScriptProcessor must be wired into the graph to fire, routed through a
    // silent gain so mic audio is never played back through the speakers.
    const silentSink = ctx.createGain()
    silentSink.gain.value = 0
    source.connect(processor)
    processor.connect(silentSink)
    silentSink.connect(ctx.destination)

    log.info('capture_started', null, { sampleRate: ctx.sampleRate })

    let stopped = false
    return {
      stop: () => {
        if (stopped) return
        stopped = true
        try {
          processor.disconnect()
        } catch {
          /* */
        }
        try {
          source.disconnect()
        } catch {
          /* */
        }
        try {
          silentSink.disconnect()
        } catch {
          /* */
        }
        try {
          stream.getTracks().forEach((t) => t.stop())
        } catch {
          /* */
        }
        try {
          void ctx.close()
        } catch {
          /* */
        }
        if (this.captureStream === stream) this.captureStream = null
        if (this.captureContext === ctx) this.captureContext = null
        log.info('capture_stopped', null, {})
      },
    }
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
