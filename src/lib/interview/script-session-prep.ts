/**
 * Script v2.1 session boot prep — tracks three parallel readiness tracks so the
 * branded loading screen reflects real work (not cosmetic timers) and so the
 * first question / mic path do not serialize needlessly.
 *
 * Tracks:
 *   profile — session fetch + interview metadata
 *   turn    — first (or current) script turn generation
 *   mic     — permission / capability probe (does NOT open Deepgram; no lease burn)
 */

export type PrepTrackId = 'profile' | 'turn' | 'mic'

export type PrepTrackStatus = 'idle' | 'running' | 'ready' | 'failed' | 'skipped'

export type MicPrepDetail =
  | 'granted'
  | 'prompt'
  | 'denied'
  | 'unsupported'
  | 'unknown'

export type PrepSnapshot = {
  profile: PrepTrackStatus
  turn: PrepTrackStatus
  mic: PrepTrackStatus
  micDetail: MicPrepDetail
  error: string | null
  /** Wall-clock when the controller started (ms). */
  startedAt: number
}

export type ScriptSessionPrepListener = (snap: PrepSnapshot) => void

export type ScriptSessionPrepController = {
  snapshot: () => PrepSnapshot
  subscribe: (listener: ScriptSessionPrepListener) => () => void
  setTrack: (id: PrepTrackId, status: PrepTrackStatus, opts?: { error?: string | null }) => void
  setMicDetail: (detail: MicPrepDetail) => void
  /** profile+turn ready (mic may be failed → text fallback). */
  criticalReady: () => boolean
  reset: () => void
}

function emptySnapshot(startedAt = Date.now()): PrepSnapshot {
  return {
    profile: 'idle',
    turn: 'idle',
    mic: 'idle',
    micDetail: 'unknown',
    error: null,
    startedAt,
  }
}

export function createScriptSessionPrepController(): ScriptSessionPrepController {
  let snap = emptySnapshot()
  const listeners = new Set<ScriptSessionPrepListener>()

  const emit = () => {
    const copy = { ...snap }
    for (const listener of listeners) listener(copy)
  }

  return {
    snapshot: () => ({ ...snap }),
    subscribe: (listener) => {
      listeners.add(listener)
      listener({ ...snap })
      return () => {
        listeners.delete(listener)
      }
    },
    setTrack: (id, status, opts) => {
      snap = {
        ...snap,
        [id]: status,
        error: opts?.error !== undefined ? opts.error : snap.error,
      }
      emit()
    },
    setMicDetail: (detail) => {
      snap = { ...snap, micDetail: detail }
      emit()
    },
    criticalReady: () => snap.profile === 'ready' && snap.turn === 'ready',
    reset: () => {
      snap = emptySnapshot()
      emit()
    },
  }
}

export type MicProbeResult = {
  status: Extract<PrepTrackStatus, 'ready' | 'failed' | 'skipped'>
  detail: MicPrepDetail
}

/**
 * Lightweight mic readiness probe.
 * - Prefer Permissions API (no prompt).
 * - If still unknown/`prompt`, optionally warm getUserMedia then immediately stop
 *   tracks so the later Deepgram start skips the browser permission dialog.
 * Does NOT call /api/stt/token (avoids burning STT session leases).
 */
export async function probeMicrophoneReadiness(opts?: {
  /** When false, never call getUserMedia (e.g. waiting for iOS audio unlock). */
  allowGetUserMedia?: boolean
  unsupported?: boolean
}): Promise<MicProbeResult> {
  if (opts?.unsupported) {
    return { status: 'failed', detail: 'unsupported' }
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { status: 'failed', detail: 'unsupported' }
  }

  try {
    const perms = navigator.permissions
    if (perms?.query) {
      const result = await perms.query({ name: 'microphone' as PermissionName })
      if (result.state === 'granted') return { status: 'ready', detail: 'granted' }
      if (result.state === 'denied') return { status: 'failed', detail: 'denied' }
      if (result.state === 'prompt' && opts?.allowGetUserMedia === false) {
        return { status: 'skipped', detail: 'prompt' }
      }
    }
  } catch {
    /* Permissions API unavailable — fall through */
  }

  if (opts?.allowGetUserMedia === false) {
    return { status: 'skipped', detail: 'unknown' }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    })
    for (const track of stream.getTracks()) {
      track.stop()
    }
    return { status: 'ready', detail: 'granted' }
  } catch {
    return { status: 'failed', detail: 'denied' }
  }
}

/** Map prep tracks → branded checklist rows (order = UI order). */
export const PREP_CHECKLIST: Array<{ id: PrepTrackId; label: string }> = [
  { id: 'mic', label: 'Checking your microphone' },
  { id: 'profile', label: 'Reading your profile' },
  { id: 'turn', label: 'Crafting your questions' },
]
