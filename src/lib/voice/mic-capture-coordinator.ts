'use client'

/**
 * Singleton coordinator for browser microphone capture.
 *
 * Chrome treats concurrent getUserMedia + Web Speech as silent input (no-speech).
 * Exactly one owner may hold a live MediaStream at a time.
 */
import { getMicAudioConstraints } from '@/lib/settings/client-preferences'
import {
  buildMicErrorContext,
  getPlatformContext,
  micFlowLog,
  voiceLog,
} from '@/lib/voice/lifecycle-log'
import {
  emitMicPipelineTelemetry,
} from '@/lib/voice/mic-pipeline-telemetry'
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'

export type MicCaptureOwner = 'keep_alive' | 'pcm' | 'debug_meter' | 'settings_test'

export type MicCaptureCoordinatorState = 'idle' | 'acquiring' | 'active'

export type MicCaptureLostReason = 'track_ended' | 'track_muted' | 'released' | 'superseded'

export interface MicTrackSnapshot {
  label: string
  readyState: MediaStreamTrackState
  muted: boolean
  enabled: boolean
}

export interface MicCaptureSnapshot {
  owner: MicCaptureOwner | null
  trackCount: number
  tracks: MicTrackSnapshot[]
  acquiredAtMs: number | null
  permissionState: string | null
}

export interface AcquireMicOptions {
  owner: MicCaptureOwner
  interviewId?: string
  signal?: AbortSignal
  maxAttempts?: number
  acquireTimeoutMs?: number
  telemetryCtx?: InterviewTelemetryContext
  onCaptureLost?: (reason: MicCaptureLostReason) => void
}

const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_ACQUIRE_TIMEOUT_MS = 15_000
const BACKOFF_BASE_MS = 200

function computeBackoff(attempt: number): number {
  return BACKOFF_BASE_MS * 2 ** attempt
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(resolve, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

async function queryMicPermissionState(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return null
  try {
    const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    return permission.state
  } catch {
    return null
  }
}

function snapshotTracks(stream: MediaStream): MicTrackSnapshot[] {
  return stream.getAudioTracks().map((track) => ({
    label: track.label || '<unknown>',
    readyState: track.readyState,
    muted: track.muted,
    enabled: track.enabled,
  }))
}

export class MicCaptureCoordinator {
  private owner: MicCaptureOwner | null = null
  private stream: MediaStream | null = null
  private acquiredAtMs: number | null = null
  private inFlight: Promise<MediaStream> | null = null
  private inFlightOwner: MicCaptureOwner | null = null
  private abortInFlight: AbortController | null = null
  private captureLostCb: ((reason: MicCaptureLostReason) => void) | null = null
  private telemetryCtx: InterviewTelemetryContext | null = null
  private trackHandlers: Array<{
    track: MediaStreamTrack
    onEnded: () => void
    onMute: () => void
    onUnmute: () => void
  }> = []

  getCoordinatorState(): MicCaptureCoordinatorState {
    if (this.inFlight) return 'acquiring'
    if (this.owner && this.hasActiveCapture()) return 'active'
    return 'idle'
  }

  /** Force-release all capture regardless of owner (recovery / unmount). */
  forceRelease(reason = 'forced'): void {
    if (this.inFlight) {
      this.abortInFlight?.abort()
    }
    micFlowLog('mic_force_release', { reason, owner: this.owner })
    this.internalRelease('released')
  }

  getSnapshot(): MicCaptureSnapshot {
    return {
      owner: this.owner,
      trackCount: this.stream?.getAudioTracks().length ?? 0,
      tracks: this.stream ? snapshotTracks(this.stream) : [],
      acquiredAtMs: this.acquiredAtMs,
      permissionState: null,
    }
  }

  async getSnapshotAsync(): Promise<MicCaptureSnapshot> {
    const permissionState = await queryMicPermissionState()
    return { ...this.getSnapshot(), permissionState }
  }

  hasActiveCapture(): boolean {
    return (
      this.stream != null &&
      this.stream.getAudioTracks().some((track) => track.readyState === 'live')
    )
  }

  isOwnerActive(owner: MicCaptureOwner): boolean {
    return this.owner === owner && this.hasActiveCapture()
  }

  async acquire(opts: AcquireMicOptions): Promise<MediaStream> {
    const {
      owner,
      interviewId,
      signal,
      maxAttempts = DEFAULT_MAX_ATTEMPTS,
      acquireTimeoutMs = DEFAULT_ACQUIRE_TIMEOUT_MS,
      telemetryCtx,
      onCaptureLost,
    } = opts

    if (telemetryCtx) this.telemetryCtx = telemetryCtx
    if (telemetryCtx) {
      emitMicPipelineTelemetry('mic_acquire_started', telemetryCtx, {
        owner,
        interview_id: interviewId ?? null,
      })
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new DOMException('Microphone is not available in this browser.', 'NotSupportedError')
    }

    micFlowLog('mic_init_started', { owner, interview_id: interviewId ?? null })

    if (this.owner === owner && this.stream) {
      const live = this.stream.getAudioTracks().some((track) => track.readyState === 'live')
      if (live) {
        if (onCaptureLost) this.captureLostCb = onCaptureLost
        micFlowLog('mic_acquire_reused', { owner })
        return this.stream
      }
      this.internalRelease('superseded')
    }

    if (this.inFlight && this.inFlightOwner === owner) {
      micFlowLog('mic_acquire_coalesced', { owner })
      return this.inFlight
    }

    if (this.inFlight) {
      micFlowLog('mic_acquire_abort_stale_in_flight', {
        prior_owner: this.inFlightOwner,
        owner,
      })
      this.abortInFlight?.abort()
    }

    if (this.owner && this.owner !== owner) {
      micFlowLog('mic_acquire_release_other_owner', { from: this.owner, to: owner })
      this.internalRelease('superseded')
    }

    const abortController = new AbortController()
    this.abortInFlight = abortController

    const abortFromExternal = () => abortController.abort()
    signal?.addEventListener('abort', abortFromExternal, { once: true })

    const task = this.doAcquire(
      owner,
      interviewId,
      maxAttempts,
      acquireTimeoutMs,
      abortController.signal,
      onCaptureLost,
    )
    this.inFlight = task
    this.inFlightOwner = owner

    try {
      return await task
    } finally {
      if (this.inFlight === task) {
        this.inFlight = null
        this.inFlightOwner = null
        this.abortInFlight = null
      }
      signal?.removeEventListener('abort', abortFromExternal)
    }
  }

  private async doAcquire(
    owner: MicCaptureOwner,
    interviewId: string | undefined,
    maxAttempts: number,
    acquireTimeoutMs: number,
    signal: AbortSignal,
    onCaptureLost?: (reason: MicCaptureLostReason) => void,
  ): Promise<MediaStream> {
    let lastErr: unknown

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (signal.aborted) {
        throw signal.reason ?? new DOMException('Aborted', 'AbortError')
      }

      const permissionState = await queryMicPermissionState()
      micFlowLog('mic_permission_state', {
        owner,
        permission_state: permissionState,
        attempt: attempt + 1,
      })

      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()

      try {
        const stream = await this.getUserMediaWithTimeout(acquireTimeoutMs, signal)
        const latencyMs = Math.round(
          (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt,
        )

        this.attachStream(owner, stream, onCaptureLost)

        const tracks = snapshotTracks(stream)
        micFlowLog('mic_stream_acquired', {
          owner,
          interview_id: interviewId ?? null,
          latency_ms: latencyMs,
          track_count: tracks.length,
          tracks,
          permission_state: permissionState,
          ...getPlatformContext(),
        })
        voiceLog('mic_stream_acquired', {
          owner,
          latency_ms: latencyMs,
          track_count: tracks.length,
        })
        if (this.telemetryCtx) {
          emitMicPipelineTelemetry('mic_acquire_success', this.telemetryCtx, {
            owner,
            latency_ms: latencyMs,
            attempt: attempt + 1,
            track_ready_states: tracks.map((t) => t.readyState),
          })
        }

        return stream
      } catch (err) {
        lastErr = err
        const errCtx = buildMicErrorContext(err, {
          owner,
          attempt: attempt + 1,
          permission_state: permissionState,
        })
        micFlowLog('mic_acquire_failed', errCtx)
        voiceLog('mic_acquire_failed', errCtx)
        if (this.telemetryCtx) {
          emitMicPipelineTelemetry(
            'mic_acquire_failed',
            this.telemetryCtx,
            { ...errCtx, attempt: attempt + 1 },
            'warn',
          )
        }

        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err
        }
        if (signal.aborted) {
          throw signal.reason ?? new DOMException('Aborted', 'AbortError')
        }

        const retryable =
          err instanceof DOMException &&
          err.name === 'NotReadableError' &&
          attempt < maxAttempts - 1

        if (!retryable) throw err

        const waitMs = computeBackoff(attempt)
        micFlowLog('mic_retry_scheduled', { owner, attempt: attempt + 1, wait_ms: waitMs })
        await sleep(waitMs, signal)
      }
    }

    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
  }

  private getUserMediaWithTimeout(timeoutMs: number, signal: AbortSignal): Promise<MediaStream> {
    return new Promise<MediaStream>((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
        return
      }
      const timeout = setTimeout(() => {
        reject(new DOMException(`getUserMedia timed out after ${timeoutMs}ms`, 'TimeoutError'))
      }, timeoutMs)
      const onAbort = () => {
        clearTimeout(timeout)
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
      }
      signal.addEventListener('abort', onAbort, { once: true })
      navigator.mediaDevices
        .getUserMedia(getMicAudioConstraints())
        .then((stream) => {
          clearTimeout(timeout)
          signal.removeEventListener('abort', onAbort)
          resolve(stream)
        })
        .catch((err) => {
          clearTimeout(timeout)
          signal.removeEventListener('abort', onAbort)
          reject(err)
        })
    })
  }

  private attachStream(
    owner: MicCaptureOwner,
    stream: MediaStream,
    onCaptureLost?: (reason: MicCaptureLostReason) => void,
  ): void {
    this.detachTrackHandlers()
    this.owner = owner
    this.stream = stream
    this.acquiredAtMs = Date.now()
    this.captureLostCb = onCaptureLost ?? null

    for (const track of stream.getAudioTracks()) {
      const onEnded = () => {
        micFlowLog('track_ended', {
          owner,
          label: track.label || '<unknown>',
          ready_state: track.readyState,
        })
        if (this.telemetryCtx) {
          emitMicPipelineTelemetry('track_ended', this.telemetryCtx, {
            owner,
            label: track.label || '<unknown>',
            ready_state: track.readyState,
          })
        }
        const cb = this.captureLostCb
        this.internalRelease('superseded')
        cb?.('track_ended')
      }
      const onMute = () => {
        micFlowLog('track_muted', {
          owner,
          label: track.label || '<unknown>',
          muted: track.muted,
        })
        if (this.telemetryCtx) {
          emitMicPipelineTelemetry('track_muted', this.telemetryCtx, {
            owner,
            label: track.label || '<unknown>',
          })
        }
        this.captureLostCb?.('track_muted')
      }
      const onUnmute = () => {
        micFlowLog('track_unmuted', {
          owner,
          label: track.label || '<unknown>',
          muted: track.muted,
        })
        if (this.telemetryCtx) {
          emitMicPipelineTelemetry('track_unmuted', this.telemetryCtx, {
            owner,
            label: track.label || '<unknown>',
          })
        }
      }
      track.addEventListener('ended', onEnded)
      track.addEventListener('mute', onMute)
      track.addEventListener('unmute', onUnmute)
      this.trackHandlers.push({ track, onEnded, onMute, onUnmute })
    }
  }

  release(owner: MicCaptureOwner): void {
    if (this.owner !== owner) return
    this.internalRelease('released')
  }

  releaseAll(): void {
    if (this.inFlight) {
      this.abortInFlight?.abort()
    }
    this.internalRelease('released')
  }

  private internalRelease(_reason: MicCaptureLostReason): void {
    this.detachTrackHandlers()
    const releasedOwner = this.owner
    if (this.stream) {
      try {
        this.stream.getTracks().forEach((track) => track.stop())
      } catch {
        /* best-effort */
      }
      micFlowLog('mic_stream_released', { owner: releasedOwner, reason: _reason })
    }
    this.stream = null
    this.owner = null
    this.acquiredAtMs = null
    this.captureLostCb = null
  }

  private detachTrackHandlers(): void {
    for (const { track, onEnded, onMute, onUnmute } of this.trackHandlers) {
      track.removeEventListener('ended', onEnded)
      track.removeEventListener('mute', onMute)
      track.removeEventListener('unmute', onUnmute)
    }
    this.trackHandlers = []
  }

  /** @internal Test-only reset. */
  __resetForTests(): void {
    this.releaseAll()
    this.inFlight = null
    this.inFlightOwner = null
    this.abortInFlight = null
  }
}

export const micCaptureCoordinator = new MicCaptureCoordinator()
