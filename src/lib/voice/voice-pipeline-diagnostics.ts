'use client'

/**
 * End-to-end voice pipeline diagnostics + automatic failure classification.
 * Low-volume structured logs: `[VOICE_PIPELINE] <event>`.
 */
import { getPlatformContext } from '@/lib/voice/lifecycle-log'
import { getCaptureAudioContextStates } from '@/lib/voice/audio-gesture'
import { micCaptureCoordinator } from '@/lib/voice/mic-capture-coordinator'

export type VoicePipelineFailureClass =
  | 'MIC_PERMISSION'
  | 'NO_MEDIA_TRACK'
  | 'AUDIO_CONTEXT_SUSPENDED'
  | 'WORKLET_NOT_RUNNING'
  | 'ZERO_PCM'
  | 'PCM_NOT_BUFFERED'
  | 'BUFFER_NOT_FLUSHING'
  | 'WS_NOT_CONNECTED'
  | 'WS_CONNECTED_NO_SEND'
  | 'WS_SEND_NO_RESPONSE'
  | 'DEEPGRAM_TIMEOUT'
  | 'TRANSCRIPT_NOT_UPDATED'
  | 'SPEECH_NO_RESULT'
  | 'UNKNOWN'

export interface VoicePipelineSnapshot {
  mic_track_live: boolean
  audio_context_running: boolean
  worklet_running: boolean
  pcm_generated: boolean
  pcm_frames: number
  pcm_nonzero_frames: number
  pcm_zero_streak: number
  ring_buffer_size: number
  ring_buffer_flushes: number
  bytes_sent: number
  bytes_received: number
  deepgram_partials: number
  deepgram_finals: number
  transcript_updates: number
  ws_reconnect_count: number
  ws_ready_state: number | null
  packets_sent: number
  packets_queued: number
  packets_dropped: number
  speech_onspeechstart: boolean
  speech_onresult: boolean
  speech_no_speech_count: number
  failure_class: VoicePipelineFailureClass | null
  capture_mode: string | null
  input_sample_rate: number | null
  worklet_callbacks_per_sec: number
  avg_chunk_latency_ms: number
  permission_state: string | null
  track_ready_state: string | null
  track_muted: boolean | null
  device_label: string | null
}

const metrics = {
  pcm_frames: 0,
  pcm_nonzero_frames: 0,
  pcm_zero_streak: 0,
  pcm_queued: 0,
  pcm_dropped: 0,
  pcm_sent: 0,
  bytes_sent: 0,
  bytes_received: 0,
  ring_buffer_size: 0,
  ring_buffer_flushes: 0,
  deepgram_partials: 0,
  deepgram_finals: 0,
  transcript_updates: 0,
  ws_reconnect_count: 0,
  packets_sent: 0,
  packets_queued: 0,
  packets_dropped: 0,
  speech_onspeechstart: false,
  speech_onresult: false,
  speech_no_speech_count: 0,
  worklet_running: false,
  capture_mode: null as string | null,
  input_sample_rate: null as number | null,
  ws_ready_state: null as number | null,
  audio_context_running: false,
  worklet_callback_times: [] as number[],
  chunk_latencies: [] as number[],
  last_failure_class: null as VoicePipelineFailureClass | null,
}

let lastWorkletCallbackAt = 0

function log(event: string, data?: Record<string, unknown>): void {
  const payload = { ...getPlatformContext(), ts: Date.now(), ...(data ?? {}) }
  console.log(`[VOICE_PIPELINE] ${event}`, payload)
}

function pcmIsNonZero(buffer: ArrayBuffer): boolean {
  const view = new Int16Array(buffer)
  for (let i = 0; i < view.length; i++) {
    if (view[i] !== 0) return true
  }
  return false
}

export const voicePipelineDiagnostics = {
  recordMicTrack(live: boolean, readyState?: string, muted?: boolean, label?: string): void {
    log('mic_track_live', { live, ready_state: readyState, muted, label })
  },

  recordAudioContext(state: string, sampleRate?: number): void {
    metrics.audio_context_running = state === 'running'
    if (sampleRate) metrics.input_sample_rate = sampleRate
    log('audio_context_state', { state, sample_rate: sampleRate })
    if (state === 'suspended') {
      metrics.last_failure_class = 'AUDIO_CONTEXT_SUSPENDED'
    }
  },

  recordCaptureMode(mode: string): void {
    metrics.capture_mode = mode
    metrics.worklet_running = mode === 'audio_worklet'
    log('pcm_capture_mode', { mode })
  },

  recordPcmFrame(buffer: ArrayBuffer): void {
    const now = Date.now()
    metrics.pcm_frames += 1
    const nonzero = pcmIsNonZero(buffer)
    if (nonzero) {
      metrics.pcm_nonzero_frames += 1
      metrics.pcm_zero_streak = 0
    } else {
      metrics.pcm_zero_streak += 1
    }
    if (lastWorkletCallbackAt > 0) {
      metrics.worklet_callback_times.push(now - lastWorkletCallbackAt)
      if (metrics.worklet_callback_times.length > 100) {
        metrics.worklet_callback_times = metrics.worklet_callback_times.slice(-100)
      }
    }
    lastWorkletCallbackAt = now
    if (metrics.pcm_frames === 1 || metrics.pcm_frames % 100 === 0) {
      log('pcm_generated', {
        frame: metrics.pcm_frames,
        bytes: buffer.byteLength,
        nonzero,
        zero_streak: metrics.pcm_zero_streak,
      })
    }
    if (metrics.pcm_zero_streak >= 50) {
      metrics.last_failure_class = 'ZERO_PCM'
    }
  },

  recordPcmQueued(bytes: number): void {
    metrics.pcm_queued += 1
    metrics.packets_queued += 1
    metrics.ring_buffer_size = bytes
    log('pcm_queued', { bytes, queued: metrics.packets_queued })
  },

  recordPcmDropped(bytes: number): void {
    metrics.pcm_dropped += 1
    metrics.packets_dropped += 1
    metrics.last_failure_class = 'PCM_NOT_BUFFERED'
    log('pcm_dropped', { bytes })
  },

  recordBufferFlush(count: number): void {
    metrics.ring_buffer_flushes += 1
    log('ring_buffer_flushes', { count, total_flushes: metrics.ring_buffer_flushes })
  },

  recordWsPacket(sent: number, readyState: number, queueDelayMs?: number): void {
    metrics.packets_sent += 1
    metrics.pcm_sent += 1
    metrics.bytes_sent += sent
    metrics.ws_ready_state = readyState
    if (queueDelayMs != null) {
      metrics.chunk_latencies.push(queueDelayMs)
      if (metrics.chunk_latencies.length > 200) {
        metrics.chunk_latencies = metrics.chunk_latencies.slice(-200)
      }
    }
    if (metrics.packets_sent === 1 || metrics.packets_sent % 50 === 0) {
      log('bytes_sent', {
        packet: metrics.packets_sent,
        bytes: sent,
        ws_ready_state: readyState,
        queue_delay_ms: queueDelayMs ?? null,
      })
    }
  },

  recordWsReconnect(reason: string): void {
    metrics.ws_reconnect_count += 1
    log('ws_reconnect', { reason, count: metrics.ws_reconnect_count })
  },

  recordDeepgramPartial(chars: number): void {
    metrics.deepgram_partials += 1
    metrics.bytes_received += chars
    log('deepgram_partials', { count: metrics.deepgram_partials, chars })
  },

  recordDeepgramFinal(chars: number): void {
    metrics.deepgram_finals += 1
    log('deepgram_finals', { count: metrics.deepgram_finals, chars })
  },

  recordTranscriptUpdate(chars: number): void {
    metrics.transcript_updates += 1
    metrics.last_failure_class = null
    log('transcript_updates', { count: metrics.transcript_updates, chars })
  },

  recordSpeechEvent(
    event: 'onspeechstart' | 'onresult' | 'no-speech' | 'onaudiostart' | 'onsoundstart',
  ): void {
    log(`speech_${event}`, {})
    if (event === 'onspeechstart') metrics.speech_onspeechstart = true
    if (event === 'onresult') {
      metrics.speech_onresult = true
      metrics.last_failure_class = null
    }
    if (event === 'no-speech') {
      metrics.speech_no_speech_count += 1
      if (!metrics.speech_onresult) {
        metrics.last_failure_class = 'SPEECH_NO_RESULT'
      }
    }
  },

  classify(): VoicePipelineFailureClass {
    const snap = micCaptureCoordinator.getSnapshot()
    const track = snap.tracks[0]
    if (!track || track.readyState !== 'live') {
      metrics.last_failure_class = 'NO_MEDIA_TRACK'
      return 'NO_MEDIA_TRACK'
    }
    if (!metrics.audio_context_running && metrics.pcm_frames > 0) {
      metrics.last_failure_class = 'AUDIO_CONTEXT_SUSPENDED'
      return 'AUDIO_CONTEXT_SUSPENDED'
    }
    if (metrics.pcm_frames > 0 && metrics.pcm_nonzero_frames === 0) {
      metrics.last_failure_class = 'ZERO_PCM'
      return 'ZERO_PCM'
    }
    if (metrics.ws_ready_state !== 1 && metrics.pcm_frames > 0) {
      metrics.last_failure_class = 'WS_NOT_CONNECTED'
      return 'WS_NOT_CONNECTED'
    }
    if (metrics.ws_ready_state === 1 && metrics.bytes_sent === 0 && metrics.pcm_nonzero_frames > 10) {
      metrics.last_failure_class = 'WS_CONNECTED_NO_SEND'
      return 'WS_CONNECTED_NO_SEND'
    }
    if (metrics.bytes_sent > 0 && metrics.deepgram_partials === 0 && metrics.deepgram_finals === 0) {
      metrics.last_failure_class = 'WS_SEND_NO_RESPONSE'
      return 'WS_SEND_NO_RESPONSE'
    }
    if (metrics.speech_onspeechstart && !metrics.speech_onresult) {
      metrics.last_failure_class = 'SPEECH_NO_RESULT'
      return 'SPEECH_NO_RESULT'
    }
    if (metrics.pcm_nonzero_frames > 0 && metrics.transcript_updates === 0 && metrics.deepgram_partials === 0) {
      metrics.last_failure_class = 'TRANSCRIPT_NOT_UPDATED'
      return 'TRANSCRIPT_NOT_UPDATED'
    }
    return metrics.last_failure_class ?? 'UNKNOWN'
  },

  getSnapshot(): VoicePipelineSnapshot {
    const coord = micCaptureCoordinator.getSnapshot()
    const track = coord.tracks[0]
    const wct = metrics.worklet_callback_times
    const avgGap =
      wct.length > 0 ? wct.reduce((a, b) => a + b, 0) / wct.length : 0
    const cLat =
      metrics.chunk_latencies.length > 0
        ? metrics.chunk_latencies.reduce((a, b) => a + b, 0) / metrics.chunk_latencies.length
        : 0
    return {
      mic_track_live: coord.tracks.some((t) => t.readyState === 'live'),
      audio_context_running: metrics.audio_context_running,
      worklet_running: metrics.worklet_running,
      pcm_generated: metrics.pcm_frames > 0,
      pcm_frames: metrics.pcm_frames,
      pcm_nonzero_frames: metrics.pcm_nonzero_frames,
      pcm_zero_streak: metrics.pcm_zero_streak,
      ring_buffer_size: metrics.ring_buffer_size,
      ring_buffer_flushes: metrics.ring_buffer_flushes,
      bytes_sent: metrics.bytes_sent,
      bytes_received: metrics.bytes_received,
      deepgram_partials: metrics.deepgram_partials,
      deepgram_finals: metrics.deepgram_finals,
      transcript_updates: metrics.transcript_updates,
      ws_reconnect_count: metrics.ws_reconnect_count,
      ws_ready_state: metrics.ws_ready_state,
      packets_sent: metrics.packets_sent,
      packets_queued: metrics.packets_queued,
      packets_dropped: metrics.packets_dropped,
      speech_onspeechstart: metrics.speech_onspeechstart,
      speech_onresult: metrics.speech_onresult,
      speech_no_speech_count: metrics.speech_no_speech_count,
      failure_class: this.classify(),
      capture_mode: metrics.capture_mode,
      input_sample_rate: metrics.input_sample_rate,
      worklet_callbacks_per_sec: avgGap > 0 ? Math.round(1000 / avgGap) : 0,
      avg_chunk_latency_ms: Math.round(cLat),
      permission_state: coord.permissionState,
      track_ready_state: track?.readyState ?? null,
      track_muted: track?.muted ?? null,
      device_label: track?.label ?? null,
    }
  },

  logSnapshot(reason: string): void {
    const snap = this.getSnapshot()
    log('snapshot', { reason, ...snap, capture_audio_context_states: getCaptureAudioContextStates() })
  },

  /** @internal */
  __resetForTests(): void {
    Object.assign(metrics, {
      pcm_frames: 0,
      pcm_nonzero_frames: 0,
      pcm_zero_streak: 0,
      pcm_queued: 0,
      pcm_dropped: 0,
      pcm_sent: 0,
      bytes_sent: 0,
      bytes_received: 0,
      ring_buffer_size: 0,
      ring_buffer_flushes: 0,
      deepgram_partials: 0,
      deepgram_finals: 0,
      transcript_updates: 0,
      ws_reconnect_count: 0,
      packets_sent: 0,
      packets_queued: 0,
      packets_dropped: 0,
      speech_onspeechstart: false,
      speech_onresult: false,
      speech_no_speech_count: 0,
      worklet_running: false,
      capture_mode: null,
      input_sample_rate: null,
      ws_ready_state: null,
      audio_context_running: false,
      worklet_callback_times: [],
      chunk_latencies: [],
      last_failure_class: null,
    })
    lastWorkletCallbackAt = 0
  },
}
