/**
 * Temporary Web Speech input-path diagnostics (DEBUG ONLY).
 * No STT behavior changes — console traces + optional level meter UI.
 *
 * Enable in production: localStorage.setItem('STT_INPUT_DEBUG', '1')
 * Dev builds: always on.
 */

import { micCaptureCoordinator } from '@/lib/voice/mic-capture-coordinator'

const DEV_ALWAYS_ON = process.env.NODE_ENV !== 'production'

/** Normalized RMS above this ≈ audible input on typical laptop mics. */
export const STT_INPUT_RMS_SPEECH_THRESHOLD = 0.012

/** Samples above threshold before issuing a verdict while listening. */
const VERDICT_SAMPLE_MS = 2_500
const METER_POLL_MS = 100

export interface MicTrackSnapshot {
  deviceId: string
  label: string
  enabled: boolean
  muted: boolean
  readyState: MediaStreamTrackState
  gen: number
  ts: number
}

export type SttInputVerdict =
  | 'idle'
  | 'collecting'
  | 'mic_silent'
  | 'web_speech_engine'
  | 'speech_pipeline_ok'
  | 'mic_active_awaiting_vad'

export interface SttInputDebugFlags {
  onaudiostart: boolean
  onsoundstart: boolean
  onsoundend: boolean
  onaudioend: boolean
  onspeechstart: boolean
  onresult: boolean
}

export interface SttInputDebugState {
  enabled: boolean
  meterActive: boolean
  rms: number
  peak: number
  verdict: SttInputVerdict
  verdictDetail: string
  trackSnapshot: MicTrackSnapshot | null
  flags: SttInputDebugFlags
  recentTraces: Array<{ event: string; ts: number; data?: Record<string, unknown> }>
  gen: number
}

const EMPTY_FLAGS: SttInputDebugFlags = {
  onaudiostart: false,
  onsoundstart: false,
  onsoundend: false,
  onaudioend: false,
  onspeechstart: false,
  onresult: false,
}

let state: SttInputDebugState = {
  enabled: false,
  meterActive: false,
  rms: 0,
  peak: 0,
  verdict: 'idle',
  verdictDetail: 'Start mic to collect input-path samples.',
  trackSnapshot: null,
  flags: { ...EMPTY_FLAGS },
  recentTraces: [],
  gen: 0,
}

const listeners = new Set<() => void>()

let meterStream: MediaStream | null = null
let meterContext: AudioContext | null = null
let meterAnalyser: AnalyserNode | null = null
let meterInterval: ReturnType<typeof setInterval> | null = null
let meterPeak = 0
let listeningSince = 0
let highRmsSince = 0
let lowRmsSince = 0

function notify(): void {
  listeners.forEach((cb) => cb())
}

function setState(patch: Partial<SttInputDebugState>): void {
  state = { ...state, ...patch }
  notify()
}

export function isSttInputDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  if (DEV_ALWAYS_ON) return true
  try {
    return window.localStorage?.getItem('STT_INPUT_DEBUG') === '1'
  } catch {
    return false
  }
}

export function getSttInputDebugState(): SttInputDebugState {
  return state
}

export function subscribeSttInputDebug(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function sttInputTrace(
  event: string,
  data?: Record<string, unknown>,
): void {
  if (!isSttInputDebugEnabled()) return
  const entry = { event, ts: Date.now(), data }
  console.log('[STT_INPUT_TRACE]', event, data ?? {})
  const recent = [...state.recentTraces, entry].slice(-24)
  setState({ recentTraces: recent })
}

export function snapshotMicTracks(stream: MediaStream | null, gen: number): MicTrackSnapshot | null {
  if (!stream) return null
  const track = stream.getAudioTracks()[0]
  if (!track) return null
  const settings = track.getSettings()
  return {
    deviceId: settings.deviceId ?? '<unknown>',
    label: track.label || '<unknown>',
    enabled: track.enabled,
    muted: track.muted,
    readyState: track.readyState,
    gen,
    ts: Date.now(),
  }
}

export function logMicTracksBeforeRecognitionStart(
  stream: MediaStream | null,
  gen: number,
): void {
  if (!isSttInputDebugEnabled()) return
  const tracks = stream?.getAudioTracks() ?? []
  const snapshots = tracks.map((track) => {
    const settings = track.getSettings()
    return {
      deviceId: settings.deviceId ?? '<unknown>',
      label: track.label || '<unknown>',
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
    }
  })
  sttInputTrace('pre_start_track_snapshot', { gen, tracks: snapshots })
  const primary = snapshotMicTracks(stream, gen)
  if (primary) setState({ trackSnapshot: primary, gen })
}

export function resetSttInputDebugFlags(gen: number): void {
  if (!isSttInputDebugEnabled()) return
  setState({
    gen,
    flags: { ...EMPTY_FLAGS },
    verdict: 'collecting',
    verdictDetail: 'Listening — speak normally; meter samples for 2.5s.',
    rms: 0,
    peak: 0,
  })
  meterPeak = 0
  listeningSince = Date.now()
  highRmsSince = 0
  lowRmsSince = listeningSince
}

export function markSttInputDebugFlag(
  flag: keyof SttInputDebugFlags,
  gen: number,
): void {
  if (!isSttInputDebugEnabled()) return
  setState({
    gen,
    flags: { ...state.flags, [flag]: true },
  })
  recomputeVerdict(gen)
}

function recomputeVerdict(gen: number): void {
  if (state.gen !== gen) return
  const { flags, rms, peak } = state
  const now = Date.now()
  const elapsed = listeningSince > 0 ? now - listeningSince : 0

  if (flags.onresult || flags.onspeechstart) {
    setState({
      verdict: 'speech_pipeline_ok',
      verdictDetail:
        'Web Speech detected speech (onspeechstart/onresult). Input path is working.',
    })
    return
  }

  if (elapsed < VERDICT_SAMPLE_MS) {
    setState({
      verdict: 'collecting',
      verdictDetail: `Collecting samples (${Math.max(0, VERDICT_SAMPLE_MS - elapsed)}ms left)…`,
    })
    return
  }

  const rmsActive = rms >= STT_INPUT_RMS_SPEECH_THRESHOLD || peak >= STT_INPUT_RMS_SPEECH_THRESHOLD * 2

  if (!rmsActive && now - lowRmsSince >= VERDICT_SAMPLE_MS) {
    setState({
      verdict: 'mic_silent',
      verdictDetail:
        'RMS stayed near zero while listening — microphone/audio path issue (wrong device, muted OS input, or no signal).',
    })
    sttInputTrace('verdict_mic_silent', { gen, rms, peak })
    return
  }

  if (rmsActive && !flags.onsoundstart && elapsed >= VERDICT_SAMPLE_MS) {
    setState({
      verdict: 'mic_silent',
      verdictDetail:
        'Web Audio sees input but Web Speech onsoundstart never fired — mic may not reach Chrome speech capture (device routing).',
    })
    sttInputTrace('verdict_mic_routing', { gen, rms, peak, onsoundstart: flags.onsoundstart })
    return
  }

  if (flags.onsoundstart && !flags.onspeechstart && elapsed >= VERDICT_SAMPLE_MS) {
    setState({
      verdict: 'web_speech_engine',
      verdictDetail:
        'onsoundstart fired but onspeechstart/onresult never did — Chrome Web Speech VAD/engine issue (not raw mic silence).',
    })
    sttInputTrace('verdict_web_speech_engine', { gen, rms, peak })
    return
  }

  if (rmsActive && !flags.onspeechstart) {
    setState({
      verdict: 'mic_active_awaiting_vad',
      verdictDetail:
        'Input level detected; waiting for onsoundstart/onspeechstart…',
    })
    return
  }

  setState({
    verdict: 'collecting',
    verdictDetail: 'Still evaluating input path…',
  })
}

function sampleMeterLevels(): void {
  if (!meterAnalyser) return
  const buf = new Float32Array(meterAnalyser.fftSize)
  meterAnalyser.getFloatTimeDomainData(buf)
  let sumSq = 0
  let peak = 0
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i]
    sumSq += v * v
    const abs = Math.abs(v)
    if (abs > peak) peak = abs
  }
  const rms = Math.sqrt(sumSq / buf.length)
  if (peak > meterPeak) meterPeak = peak
  const now = Date.now()
  if (rms >= STT_INPUT_RMS_SPEECH_THRESHOLD) {
    if (highRmsSince === 0) highRmsSince = now
  } else {
    lowRmsSince = now
    highRmsSince = 0
  }
  setState({ rms, peak: meterPeak })
  recomputeVerdict(state.gen)
}

/**
 * Debug-only RMS meter via a separate getUserMedia stream.
 * MUST NOT run while SpeechRecognition is active — Chrome treats concurrent
 * mic captures as silent input (no-speech / onsoundstart never fires).
 * Event flags (onaudiostart, onresult, …) remain the live debug signal.
 */
export async function startSttInputLevelMeter(): Promise<void> {
  if (!isSttInputDebugEnabled()) return
  await stopSttInputLevelMeter()

  if (!navigator?.mediaDevices?.getUserMedia) return

  try {
    const stream = await micCaptureCoordinator.acquire({ owner: 'debug_meter' })
    meterStream = stream
    meterContext = new AudioContext()
    if (meterContext.state === 'suspended') {
      await meterContext.resume()
    }
    const source = meterContext.createMediaStreamSource(stream)
    meterAnalyser = meterContext.createAnalyser()
    meterAnalyser.fftSize = 2048
    source.connect(meterAnalyser)
    meterInterval = setInterval(sampleMeterLevels, METER_POLL_MS)
    setState({ meterActive: true })
    sttInputTrace('level_meter_started', {
      track: snapshotMicTracks(stream, state.gen),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    sttInputTrace('level_meter_failed', { error: msg })
    setState({
      meterActive: false,
      verdictDetail: `Debug meter failed: ${msg}`,
    })
  }
}

export async function stopSttInputLevelMeter(): Promise<void> {
  if (meterInterval) {
    clearInterval(meterInterval)
    meterInterval = null
  }
  meterAnalyser = null
  if (meterStream) {
    micCaptureCoordinator.release('debug_meter')
    meterStream = null
  }
  if (meterContext) {
    try {
      await meterContext.close()
    } catch {
      /* ignore */
    }
    meterContext = null
  }
  meterPeak = 0
  listeningSince = 0
  highRmsSince = 0
  lowRmsSince = 0
  setState({ meterActive: false, rms: 0, peak: 0 })
}

export function initSttInputDebugModule(): void {
  if (!isSttInputDebugEnabled()) return
  setState({ enabled: true })
}
