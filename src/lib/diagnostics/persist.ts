import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeMetadataForTests } from '@/lib/diagnostics/validate';
import type { ValidatedDiagnosticEvent } from '@/lib/diagnostics/validate';

const UNIQUE_VIOLATION = '23505';

export type PersistDiagnosticsResult = {
  inserted: number;
  duplicates: number;
  failed: number;
};

/**
 * Insert validated diagnostic rows via service client.
 * Never throws — returns counts for observability.
 */
export async function persistDiagnosticEvents(
  service: SupabaseClient,
  userId: string,
  events: ValidatedDiagnosticEvent[],
): Promise<PersistDiagnosticsResult> {
  let inserted = 0;
  let duplicates = 0;
  let failed = 0;

  for (const event of events) {
    try {
      const { error } = await service.from('interview_diagnostic_events').insert({
        schema_version: event.schema_version,
        interview_id: event.interview_id,
        user_id: userId,
        event_type: event.event_type,
        occurred_at: event.occurred_at,
        source: event.source,
        severity: event.severity,
        error_code: event.error_code,
        correlation_id: event.correlation_id,
        client_event_id: event.client_event_id,
        turn_index: event.turn_index,
        engine: event.engine,
        confirmation: event.confirmation,
        metadata: event.metadata,
      });
      if (!error) {
        inserted += 1;
        continue;
      }
      if (error.code === UNIQUE_VIOLATION) {
        duplicates += 1;
        continue;
      }
      failed += 1;
      console.warn('[diagnostics:persist] insert failed', {
        code: error.code,
        event_type: event.event_type,
      });
    } catch {
      failed += 1;
    }
  }

  return { inserted, duplicates, failed };
}

export type ServerDiagnosticInput = {
  interviewId: string;
  userId: string | null;
  eventType: ValidatedDiagnosticEvent['event_type'];
  severity?: ValidatedDiagnosticEvent['severity'];
  errorCode?: string | null;
  correlationId?: string | null;
  turnIndex?: number | null;
  engine?: string | null;
  metadata?: Record<string, string | number | boolean>;
};

/** Server-confirmed diagnostic (e.g. STT release / TTS failure). Fire-and-forget safe. */
export async function persistServerDiagnosticEvent(
  service: SupabaseClient,
  input: ServerDiagnosticInput,
): Promise<void> {
  try {
    const { DEFAULT_SEVERITY_BY_EVENT } = await import('@/lib/diagnostics/event-contract');
    await service.from('interview_diagnostic_events').insert({
      schema_version: 1,
      interview_id: input.interviewId,
      user_id: input.userId,
      event_type: input.eventType,
      occurred_at: new Date().toISOString(),
      source: 'server',
      severity: input.severity ?? DEFAULT_SEVERITY_BY_EVENT[input.eventType],
      error_code: input.errorCode ?? null,
      correlation_id: input.correlationId ?? null,
      client_event_id: null,
      turn_index: input.turnIndex ?? null,
      engine: input.engine ?? 'v2.1',
      confirmation: 'server_confirmed',
      metadata: sanitizeMetadataForTests(input.metadata ?? {}),
    });
  } catch (err) {
    console.warn('[diagnostics:persist] server event failed', {
      message: err instanceof Error ? err.message : 'unknown',
    });
  }
}
