import { interviewTelemetry } from '@/lib/telemetry/interview-telemetry'
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'

export type AvatarTelemetryEvent =
  | 'avatar_unlock_required'
  | 'avatar_unlock_success'
  | 'avatar_audio_started'
  | 'avatar_audio_completed'
  | 'avatar_audio_failed'
  | 'avatar_video_started'
  | 'avatar_video_failed'
  | 'avatar_continue_without_audio'

/** Beacon critical avatar events to `/api/product-events`. */
export function trackAvatarTelemetry(
  event: AvatarTelemetryEvent,
  ctx: InterviewTelemetryContext,
  data?: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info',
): void {
  interviewTelemetry('INTERVIEW_FLOW', event, ctx, data, { critical: true, level })
}
