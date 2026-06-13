/**
 * Structured Deepgram / voice-session telemetry.
 * Greppable prefixes: [DEEPGRAM] [VOICE-HEALTH] [TOKEN-REFRESH] [RATE-LIMIT]
 */
import { getPlatformContext } from '@/lib/voice/lifecycle-log'
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'
import { interviewTelemetry } from '@/lib/telemetry/interview-telemetry'

export type DeepgramTelemetryEvent =
  | 'deepgram_token_requested'
  | 'deepgram_token_success'
  | 'deepgram_token_failure'
  | 'deepgram_connect_attempt'
  | 'deepgram_connect_success'
  | 'deepgram_connect_failure'
  | 'deepgram_refresh_attempt'
  | 'deepgram_refresh_success'
  | 'deepgram_refresh_failure'
  | 'deepgram_429_received'
  | 'deepgram_ws_closed'
  | 'deepgram_ws_error'
  | 'voice_session_started'
  | 'voice_session_completed'
  | 'voice_session_released'
  | 'voice_session_abandoned'

type TrackFn = (
  type: 'VOICE' | 'RECOVERY',
  event: string,
  data?: Record<string, unknown>,
  options?: { critical?: boolean; level?: 'info' | 'warn' | 'error' },
) => void

export interface DeepgramTelemetryContext extends InterviewTelemetryContext {
  userId?: string
}

function logPrefix(event: DeepgramTelemetryEvent): string {
  if (event.includes('refresh')) return '[TOKEN-REFRESH]'
  if (event.includes('429')) return '[RATE-LIMIT]'
  if (event.startsWith('voice_session')) return '[VOICE-HEALTH]'
  return '[DEEPGRAM]'
}

function resolveTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'unknown'
  }
}

function resolveCountry(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale
    const parts = locale.split('-')
    return parts.length > 1 ? parts[parts.length - 1]!.toUpperCase() : 'unknown'
  } catch {
    return 'unknown'
  }
}

export function buildDeepgramTelemetryPayload(
  ctx: DeepgramTelemetryContext,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const platform = getPlatformContext()
  return {
    session_id: ctx.interviewId,
    interview_id: ctx.interviewId,
    user_id: ctx.userId,
    country: resolveCountry(),
    timezone: resolveTimezone(),
    ...platform,
    ...extra,
  }
}

const CRITICAL_EVENTS = new Set<DeepgramTelemetryEvent>([
  'deepgram_token_failure',
  'deepgram_connect_failure',
  'deepgram_refresh_failure',
  'deepgram_429_received',
  'deepgram_ws_error',
  'voice_session_abandoned',
])

export function trackDeepgramEvent(
  event: DeepgramTelemetryEvent,
  ctx: DeepgramTelemetryContext,
  track: TrackFn,
  extra?: Record<string, unknown>,
): void {
  const payload = buildDeepgramTelemetryPayload(ctx, {
    event,
    timestamp: new Date().toISOString(),
    ...extra,
  })

  const prefix = logPrefix(event)
  const level =
    event.includes('failure') || event.includes('abandoned') || event.includes('429')
      ? 'warn'
      : 'info'

  if (level === 'warn') {
    console.warn(prefix, payload)
  } else {
    console.log(prefix, payload)
  }

  track('VOICE', event, payload, {
    critical: CRITICAL_EVENTS.has(event),
    level,
  })

  interviewTelemetry('VOICE', event, ctx, payload, {
    critical: CRITICAL_EVENTS.has(event),
    level,
  })
}

export function logVoiceHealthSnapshot(snapshot: Record<string, unknown>): void {
  console.log('[VOICE-HEALTH]', {
    ts: new Date().toISOString(),
    ...snapshot,
  })
}
