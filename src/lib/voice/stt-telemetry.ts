import { interviewTelemetry } from '@/lib/telemetry/interview-telemetry'
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'

export type SttTelemetryEvent =
  | 'stt_session_started'
  | 'stt_session_stopped'
  | 'stt_duplicate_result'
  | 'stt_restart_attempt'
  | 'stt_restart_blocked'
  | 'stt_restart_budget_exhausted'
  | 'stt_stale_session_event'

/** Beacon STT lifecycle events to `/api/product-events`. */
export function trackSttTelemetry(
  event: SttTelemetryEvent,
  ctx: InterviewTelemetryContext | null | undefined,
  data?: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info',
): void {
  if (!ctx) return
  interviewTelemetry('VOICE', event, ctx, data, { critical: true, level })
}

export type SttTelemetryCallback = (
  event: SttTelemetryEvent,
  data?: Record<string, unknown>,
) => void
