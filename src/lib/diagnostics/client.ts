'use client';

/**
 * Best-effort client diagnostic emitter for V2.1 interviews.
 * Never throws, never blocks interview flow, bounded + deduped.
 */

import {
  DEFAULT_SEVERITY_BY_EVENT,
  DIAGNOSTIC_SCHEMA_VERSION,
  type DiagnosticEventType,
  type DiagnosticSeverity,
} from '@/lib/diagnostics/event-contract';
import { getInterviewTelemetryRunId } from '@/lib/telemetry/interview-telemetry';

const ENDPOINT = '/api/interview/diagnostics';
const MAX_QUEUE = 20;
const DEDUPE_WINDOW_MS = 15_000;
const FETCH_TIMEOUT_MS = 2_000;
const FLUSH_INTERVAL_MS = 1_500;

type QueuedEvent = {
  event_type: DiagnosticEventType;
  occurred_at: string;
  source: 'client';
  severity: DiagnosticSeverity;
  error_code: string | null;
  correlation_id: string | null;
  client_event_id: string;
  turn_index: number | null;
  engine: string;
  metadata: Record<string, string | number | boolean>;
};

type EmitArgs = {
  interviewId: string;
  eventType: DiagnosticEventType;
  errorCode?: string;
  turnIndex?: number;
  severity?: DiagnosticSeverity;
  metadata?: Record<string, string | number | boolean>;
  engine?: string;
};

const queues = new Map<string, QueuedEvent[]>();
const recentKeys = new Map<string, number>();
const flushTimers = new Map<string, ReturnType<typeof setTimeout>>();
let flushing = false;

function makeClientEventId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function dedupeKey(interviewId: string, eventType: string, errorCode?: string): string {
  return `${interviewId}|${eventType}|${errorCode ?? ''}`;
}

function scheduleFlush(interviewId: string): void {
  if (flushTimers.has(interviewId)) return;
  const t = setTimeout(() => {
    flushTimers.delete(interviewId);
    void flushInterviewDiagnostics(interviewId);
  }, FLUSH_INTERVAL_MS);
  flushTimers.set(interviewId, t);
}

/**
 * Queue a diagnostic event for best-effort delivery.
 * Safe to call from event handlers / unmount paths.
 */
export function emitInterviewDiagnostic(args: EmitArgs): void {
  try {
    if (typeof window === 'undefined') return;
    const interviewId = args.interviewId?.trim();
    if (!interviewId) return;

    const key = dedupeKey(interviewId, args.eventType, args.errorCode);
    const now = Date.now();
    const prev = recentKeys.get(key);
    if (prev != null && now - prev < DEDUPE_WINDOW_MS) return;
    recentKeys.set(key, now);

    // Bound recentKeys growth
    if (recentKeys.size > 200) {
      const cutoff = now - DEDUPE_WINDOW_MS;
      for (const [k, ts] of recentKeys) {
        if (ts < cutoff) recentKeys.delete(k);
      }
    }

    const queue = queues.get(interviewId) ?? [];
    if (queue.length >= MAX_QUEUE) {
      queue.shift();
    }

    queue.push({
      event_type: args.eventType,
      occurred_at: new Date().toISOString(),
      source: 'client',
      severity: args.severity ?? DEFAULT_SEVERITY_BY_EVENT[args.eventType],
      error_code: args.errorCode?.slice(0, 64) ?? null,
      correlation_id: getInterviewTelemetryRunId(),
      client_event_id: makeClientEventId(),
      turn_index: typeof args.turnIndex === 'number' ? args.turnIndex : null,
      engine: args.engine ?? 'v2.1',
      metadata: args.metadata ?? {},
    });
    queues.set(interviewId, queue);
    scheduleFlush(interviewId);
  } catch {
    /* never throw into interview */
  }
}

export async function flushInterviewDiagnostics(interviewId: string): Promise<void> {
  if (flushing) return;
  const queue = queues.get(interviewId);
  if (!queue?.length) return;

  flushing = true;
  const batch = queue.splice(0, MAX_QUEUE);
  if (queue.length === 0) queues.delete(interviewId);

  try {
    const body = JSON.stringify({
      schema_version: DIAGNOSTIC_SCHEMA_VERSION,
      interview_id: interviewId,
      events: batch,
    });

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer =
      controller && typeof window !== 'undefined'
        ? window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
        : null;

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'same-origin',
      keepalive: true,
      signal: controller?.signal,
    });

    if (timer != null) window.clearTimeout(timer);

    // On hard failure, drop batch (best-effort; do not infinite-retry).
    void res;
  } catch {
    /* drop — do not requeue forever */
  } finally {
    flushing = false;
    if ((queues.get(interviewId)?.length ?? 0) > 0) {
      scheduleFlush(interviewId);
    }
  }
}

/** Map mic-pipeline critical events onto diagnostic event types. */
export function diagnosticTypeForMicEvent(
  event: string,
): DiagnosticEventType | null {
  switch (event) {
    case 'mic_permission_denied':
    case 'mic_permission_revoked':
      return 'mic_permission_denied';
    case 'mic_acquire_failed':
    case 'interview_audio_failure':
      return 'mic_acquire_failed';
    default:
      return null;
  }
}

/** Test helpers */
export function _resetDiagnosticClientForTests(): void {
  queues.clear();
  recentKeys.clear();
  for (const t of flushTimers.values()) clearTimeout(t);
  flushTimers.clear();
  flushing = false;
}

export function _peekDiagnosticQueueForTests(interviewId: string): number {
  return queues.get(interviewId)?.length ?? 0;
}
