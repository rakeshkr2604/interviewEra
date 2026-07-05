'use client'

/**
 * Structured production telemetry for the voice capture pipeline.
 * Every event includes mandatory correlation + runtime snapshot fields.
 */
import { interviewTelemetry, getInterviewTelemetryRunId } from '@/lib/telemetry/interview-telemetry'
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'
import { getPlatformContext } from '@/lib/voice/lifecycle-log'
import { micCaptureCoordinator } from '@/lib/voice/mic-capture-coordinator'
import { getSharedInterviewAudioContext, getCaptureAudioContextStates } from '@/lib/voice/audio-gesture'

export type MicPipelineTelemetryEvent =
  | 'mic_permission_requested'
  | 'mic_permission_granted'
  | 'mic_permission_denied'
  | 'mic_permission_revoked'
  | 'mic_acquire_started'
  | 'mic_acquire_success'
  | 'mic_acquire_failed'
  | 'mic_recovered'
  | 'track_muted'
  | 'track_unmuted'
  | 'track_ended'
  | 'device_changed'
  | 'device_recovered'
  | 'audio_context_suspended'
  | 'audio_context_resumed'
  | 'deepgram_connected'
  | 'deepgram_disconnected'
  | 'speech_started'
  | 'speech_stopped'
  | 'interview_audio_failure'

export interface MicPipelineMetrics {
  micSuccessCount: number
  micFailureCount: number
  permissionDeniedCount: number
  recoverySuccessCount: number
  recoveryAttemptCount: number
  trackEndedCount: number
  reconnectSuccessCount: number
  acquireLatencyMs: number[]
  recoveryLatencyMs: number[]
}

const metrics: MicPipelineMetrics = {
  micSuccessCount: 0,
  micFailureCount: 0,
  permissionDeniedCount: 0,
  recoverySuccessCount: 0,
  recoveryAttemptCount: 0,
  trackEndedCount: 0,
  reconnectSuccessCount: 0,
  acquireLatencyMs: [],
  recoveryLatencyMs: [],
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[idx] ?? 0
}

export function getMicPipelineMetrics(): MicPipelineMetrics & {
  micSuccessRate: number
  micFailureRate: number
  permissionDeniedPct: number
  recoverySuccessPct: number
  trackEndedPct: number
  reconnectSuccessPct: number
  avgCaptureTimeMs: number
  avgRecoveryTimeMs: number
  p95AcquisitionTimeMs: number
} {
  const total = metrics.micSuccessCount + metrics.micFailureCount
  const acquireSum = metrics.acquireLatencyMs.reduce((a, b) => a + b, 0)
  const recoverySum = metrics.recoveryLatencyMs.reduce((a, b) => a + b, 0)
  return {
    ...metrics,
    micSuccessRate: total > 0 ? metrics.micSuccessCount / total : 1,
    micFailureRate: total > 0 ? metrics.micFailureCount / total : 0,
    permissionDeniedPct: total > 0 ? metrics.permissionDeniedCount / total : 0,
    recoverySuccessPct:
      metrics.recoveryAttemptCount > 0
        ? metrics.recoverySuccessCount / metrics.recoveryAttemptCount
        : 1,
    trackEndedPct: total > 0 ? metrics.trackEndedCount / total : 0,
    reconnectSuccessPct:
      metrics.recoveryAttemptCount > 0
        ? metrics.reconnectSuccessCount / metrics.recoveryAttemptCount
        : 1,
    avgCaptureTimeMs:
      metrics.acquireLatencyMs.length > 0 ? acquireSum / metrics.acquireLatencyMs.length : 0,
    avgRecoveryTimeMs:
      metrics.recoveryLatencyMs.length > 0 ? recoverySum / metrics.recoveryLatencyMs.length : 0,
    p95AcquisitionTimeMs: percentile(metrics.acquireLatencyMs, 95),
  }
}

export function recordMicAcquireSuccess(latencyMs: number): void {
  metrics.micSuccessCount += 1
  metrics.acquireLatencyMs.push(latencyMs)
  if (metrics.acquireLatencyMs.length > 500) {
    metrics.acquireLatencyMs = metrics.acquireLatencyMs.slice(-500)
  }
}

export function recordMicAcquireFailure(): void {
  metrics.micFailureCount += 1
}

export function recordMicRecovery(success: boolean, latencyMs?: number): void {
  metrics.recoveryAttemptCount += 1
  if (success) metrics.recoverySuccessCount += 1
  if (latencyMs != null) {
    metrics.recoveryLatencyMs.push(latencyMs)
    if (metrics.recoveryLatencyMs.length > 200) {
      metrics.recoveryLatencyMs = metrics.recoveryLatencyMs.slice(-200)
    }
  }
}

/** @internal */
export function __resetMicPipelineMetricsForTests(): void {
  metrics.micSuccessCount = 0
  metrics.micFailureCount = 0
  metrics.permissionDeniedCount = 0
  metrics.recoverySuccessCount = 0
  metrics.recoveryAttemptCount = 0
  metrics.trackEndedCount = 0
  metrics.reconnectSuccessCount = 0
  metrics.acquireLatencyMs = []
  metrics.recoveryLatencyMs = []
}

async function buildRuntimeSnapshot(): Promise<Record<string, unknown>> {
  const coordinator = await micCaptureCoordinator.getSnapshotAsync()
  const sharedCtx = getSharedInterviewAudioContext()
  const platform = getPlatformContext()
  return {
    platform: platform.platform,
    browser: platform.browser,
    pwa: platform.pwa,
    permission_state: coordinator.permissionState,
    coordinator_owner: coordinator.owner,
    track_count: coordinator.trackCount,
    track_ready_states: coordinator.tracks.map((t) => t.readyState),
    track_muted_flags: coordinator.tracks.map((t) => t.muted),
    track_labels: coordinator.tracks.map((t) => t.label),
    audio_context_state: sharedCtx?.state ?? 'unavailable',
    capture_audio_context_states: getCaptureAudioContextStates(),
    session_id: getInterviewTelemetryRunId(),
  }
}

/**
 * Emit a structured mic pipeline event. Never include secrets or tokens.
 */
export function emitMicPipelineTelemetry(
  event: MicPipelineTelemetryEvent,
  ctx: InterviewTelemetryContext,
  data?: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info',
): void {
  void buildRuntimeSnapshot().then((snapshot) => {
    const payload: Record<string, unknown> = {
      ...snapshot,
      session_id: snapshot.session_id ?? null,
      interview_id: ctx.interviewId,
      retry_count: data?.retry_count ?? data?.attempt ?? 0,
      ...(data ?? {}),
    }

    if (event === 'mic_acquire_success') {
      const latency = typeof payload.latency_ms === 'number' ? payload.latency_ms : 0
      recordMicAcquireSuccess(latency)
    } else if (event === 'mic_acquire_failed') {
      recordMicAcquireFailure()
    } else if (event === 'mic_permission_denied' || event === 'mic_permission_revoked') {
      metrics.permissionDeniedCount += 1
    } else if (event === 'track_ended') {
      metrics.trackEndedCount += 1
    } else if (event === 'mic_recovered' || event === 'device_recovered') {
      recordMicRecovery(true)
    } else if (event === 'interview_audio_failure') {
      recordMicRecovery(false)
    }

    const critical =
      event === 'mic_permission_revoked' ||
      event === 'mic_acquire_failed' ||
      event === 'interview_audio_failure' ||
      event === 'track_ended'

    interviewTelemetry('VOICE', event, ctx, payload, {
      critical,
      level: level ?? (critical ? 'warn' : 'info'),
    })
  })
}

/** Beacon aggregated metrics — call on session end or periodically. */
export function beaconMicPipelineMetrics(ctx: InterviewTelemetryContext): void {
  const metrics = getMicPipelineMetrics()
  interviewTelemetry('VOICE', 'mic_pipeline_metrics', ctx, { ...metrics } as Record<string, unknown>, {
    critical: true,
  })
}
