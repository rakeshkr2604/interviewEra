/**
 * Structured, fully-attributed observability for the voice pipeline
 * (audit Phase 10). Every record carries interview/session/turn/correlation
 * ids so an entire interview is traceable end-to-end. No anonymous logs.
 *
 * This is a thin, dependency-free sink. A bridge to the existing telemetry
 * (`useInterviewTelemetry` / server beacons) is installed by the orchestrator
 * via `setVoiceLogSink` — keeping this module pure and unit-testable.
 */
import type { TurnContext } from '@/lib/voice/core/ids'

export type VoiceLogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface VoiceLogRecord {
  level: VoiceLogLevel
  /** Subsystem: 'fsm' | 'audio' | 'stt' | 'tts' | 'conversation' | 'orchestrator' | 'bus'. */
  scope: string
  /** Stable event name, e.g. 'state_transition', 'stt_first_partial'. */
  event: string
  ts: number
  interviewId: string | null
  sessionId: string | null
  turnId: string | null
  correlationId: string | null
  data?: Record<string, unknown>
}

export type VoiceLogSink = (record: VoiceLogRecord) => void

const consoleSink: VoiceLogSink = (record) => {
  const tag = `[voice:${record.scope}] ${record.event}`
  const meta = {
    interviewId: record.interviewId,
    sessionId: record.sessionId,
    turnId: record.turnId,
    correlationId: record.correlationId,
    ...record.data,
  }
  switch (record.level) {
    case 'error':
      console.error(tag, meta)
      break
    case 'warn':
      console.warn(tag, meta)
      break
    default:
      console.log(tag, meta)
  }
}

let activeSink: VoiceLogSink = consoleSink

/** Replace the sink (e.g. bridge to telemetry). Returns a restore function. */
export function setVoiceLogSink(sink: VoiceLogSink): () => void {
  const previous = activeSink
  activeSink = sink
  return () => {
    activeSink = previous
  }
}

export interface VoiceLogContext {
  scope: string
  ctx?: Pick<TurnContext, 'interviewId' | 'sessionId' | 'turnId' | 'correlationId'> | null
}

function emit(
  level: VoiceLogLevel,
  scope: string,
  event: string,
  ctx: VoiceLogContext['ctx'],
  data?: Record<string, unknown>,
): void {
  const record: VoiceLogRecord = {
    level,
    scope,
    event,
    ts: Date.now(),
    interviewId: ctx?.interviewId ?? null,
    sessionId: ctx?.sessionId ?? null,
    turnId: ctx?.turnId ?? null,
    correlationId: ctx?.correlationId ?? null,
    data,
  }
  try {
    activeSink(record)
  } catch {
    // A logging sink must never break the pipeline.
  }
}

/**
 * Create a scoped logger bound to a subsystem. The bound context can be passed
 * per-call (turn context changes every turn) so a single logger instance is
 * reused for a subsystem across the whole session.
 */
export function createVoiceLogger(scope: string) {
  return {
    debug: (event: string, ctx: VoiceLogContext['ctx'], data?: Record<string, unknown>) =>
      emit('debug', scope, event, ctx, data),
    info: (event: string, ctx: VoiceLogContext['ctx'], data?: Record<string, unknown>) =>
      emit('info', scope, event, ctx, data),
    warn: (event: string, ctx: VoiceLogContext['ctx'], data?: Record<string, unknown>) =>
      emit('warn', scope, event, ctx, data),
    error: (event: string, ctx: VoiceLogContext['ctx'], data?: Record<string, unknown>) =>
      emit('error', scope, event, ctx, data),
  }
}

export type VoiceLogger = ReturnType<typeof createVoiceLogger>
