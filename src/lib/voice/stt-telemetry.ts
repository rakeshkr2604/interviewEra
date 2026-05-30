import { getPlatformContext } from '@/lib/voice/lifecycle-log'
import { interviewTelemetry } from '@/lib/telemetry/interview-telemetry'
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'

export type SttTelemetryEvent =
  | 'stt_start_requested'
  | 'stt_start_success'
  | 'stt_start_failed'
  | 'stt_permission_state'
  | 'stt_session_started'
  | 'stt_session_stopped'
  | 'stt_onstart'
  | 'stt_onaudiostart'
  | 'stt_onspeechstart'
  | 'stt_onresult'
  | 'stt_onend'
  | 'stt_onerror'
  | 'stt_duplicate_result'
  | 'stt_restart_attempt'
  | 'stt_restart_blocked'
  | 'stt_restart_budget_exhausted'
  | 'stt_restart_exhausted'
  | 'stt_stale_session_event'

function withPlatform(data?: Record<string, unknown>): Record<string, unknown> {
  const ctx = getPlatformContext()
  return {
    platform: ctx.platform,
    browser: ctx.browser,
    pwa: ctx.pwa,
    ...(data ?? {}),
  }
}

/** Beacon STT lifecycle events to `/api/product-events`. */
export function trackSttTelemetry(
  event: SttTelemetryEvent,
  ctx: InterviewTelemetryContext | null | undefined,
  data?: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info',
): void {
  if (!ctx) return
  interviewTelemetry('VOICE', event, ctx, withPlatform(data), { critical: true, level })
}

export type SttTelemetryCallback = (
  event: SttTelemetryEvent,
  data?: Record<string, unknown>,
) => void

/** Attach platform context for hook-level console/product beacons. */
export function sttTelemetryPayload(data?: Record<string, unknown>): Record<string, unknown> {
  return withPlatform(data)
}
