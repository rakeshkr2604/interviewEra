import { interviewTelemetry } from '@/lib/telemetry/interview-telemetry'
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'

export type MicTelemetryEvent =
  | 'mic_started'
  | 'mic_restarted'
  | 'mic_watchdog_restart'
  | 'mic_session_expired'
  | 'mic_permission_lost'
  | 'mic_capture_active'

/** Beacon critical mic events to `/api/product-events`. */
export function trackMicTelemetry(
  event: MicTelemetryEvent,
  ctx: InterviewTelemetryContext,
  data?: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info',
): void {
  interviewTelemetry('VOICE', event, ctx, data, { critical: true, level })
}
