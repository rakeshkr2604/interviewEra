import {
  DEFAULT_SEVERITY_BY_EVENT,
  DIAGNOSTIC_COMPONENTS,
  DIAGNOSTIC_METADATA_KEYS,
  DIAGNOSTIC_SCHEMA_VERSION,
  DIAGNOSTIC_SEVERITIES,
  DIAGNOSTIC_SOURCES,
  MAX_CLIENT_EVENT_ID_LEN,
  MAX_CORRELATION_ID_LEN,
  MAX_DIAGNOSTIC_EVENTS_PER_REQUEST,
  MAX_DIAGNOSTIC_METADATA_STRING,
  isDiagnosticEventType,
  type DiagnosticConfirmation,
  type DiagnosticEventType,
  type DiagnosticSeverity,
  type DiagnosticSource,
} from '@/lib/diagnostics/event-contract';

export type ValidatedDiagnosticEvent = {
  schema_version: typeof DIAGNOSTIC_SCHEMA_VERSION;
  interview_id: string;
  event_type: DiagnosticEventType;
  occurred_at: string;
  source: DiagnosticSource;
  severity: DiagnosticSeverity;
  error_code: string | null;
  correlation_id: string | null;
  client_event_id: string | null;
  turn_index: number | null;
  engine: string | null;
  confirmation: DiagnosticConfirmation;
  metadata: Record<string, string | number | boolean>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SENSITIVE_KEY =
  /authorization|cookie|token|password|secret|api[_-]?key|bearer|transcript|answer|resume/i;

function asTrimmedString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function sanitizeMetadata(raw: unknown): Record<string, string | number | boolean> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string | number | boolean> = {};
  const allow = new Set<string>(DIAGNOSTIC_METADATA_KEYS);
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!allow.has(key)) continue;
    if (SENSITIVE_KEY.test(key)) continue;
    if (typeof value === 'boolean') {
      out[key] = value;
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = Math.max(-1_000_000, Math.min(1_000_000, value));
      continue;
    }
    if (typeof value === 'string') {
      const cleaned = value.trim().slice(0, MAX_DIAGNOSTIC_METADATA_STRING);
      if (!cleaned) continue;
      if (key === 'component' && !(DIAGNOSTIC_COMPONENTS as readonly string[]).includes(cleaned)) {
        out[key] = 'unknown';
        continue;
      }
      if (key === 'endpoint') {
        // Path only — strip query/hash.
        const path = cleaned.split('?')[0]?.split('#')[0] ?? cleaned;
        if (path.startsWith('/api/')) out[key] = path.slice(0, MAX_DIAGNOSTIC_METADATA_STRING);
        continue;
      }
      out[key] = cleaned;
    }
  }
  return out;
}

function parseOccurredAt(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  // Reject absurd future skew (>10m) or ancient past (>30d).
  const now = Date.now();
  if (ms > now + 10 * 60_000) return null;
  if (ms < now - 30 * 24 * 60 * 60_000) return null;
  return new Date(ms).toISOString();
}

export type ValidateBatchResult =
  | { ok: true; events: ValidatedDiagnosticEvent[]; interviewId: string }
  | { ok: false; error: string; status: number };

/**
 * Validate a client ingest batch. Unknown event names / fields are rejected
 * (or stripped for metadata). Does not trust client user_id.
 */
export function validateDiagnosticIngestBody(body: unknown): ValidateBatchResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Invalid body', status: 400 };
  }
  const root = body as Record<string, unknown>;
  const interviewId = asTrimmedString(root.interview_id, 80);
  if (!interviewId || !UUID_RE.test(interviewId)) {
    return { ok: false, error: 'Invalid interview_id', status: 400 };
  }

  const rawEvents = root.events;
  if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
    return { ok: false, error: 'events required', status: 400 };
  }
  if (rawEvents.length > MAX_DIAGNOSTIC_EVENTS_PER_REQUEST) {
    return { ok: false, error: 'Too many events', status: 400 };
  }

  const events: ValidatedDiagnosticEvent[] = [];
  for (const item of rawEvents) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    if (!isDiagnosticEventType(row.event_type)) {
      return { ok: false, error: 'Unknown event_type', status: 400 };
    }
    const eventType = row.event_type;
    const occurredAt = parseOccurredAt(row.occurred_at);
    if (!occurredAt) {
      return { ok: false, error: 'Invalid occurred_at', status: 400 };
    }

    let severity: DiagnosticSeverity = DEFAULT_SEVERITY_BY_EVENT[eventType];
    if (
      typeof row.severity === 'string' &&
      (DIAGNOSTIC_SEVERITIES as readonly string[]).includes(row.severity)
    ) {
      severity = row.severity as DiagnosticSeverity;
    }

    let source: DiagnosticSource = 'client';
    if (
      typeof row.source === 'string' &&
      (DIAGNOSTIC_SOURCES as readonly string[]).includes(row.source)
    ) {
      // Clients may only claim client; server routes set server_confirmed separately.
      source = row.source === 'client' ? 'client' : 'client';
    }

    const turnRaw = row.turn_index;
    const turn_index =
      typeof turnRaw === 'number' && Number.isInteger(turnRaw) && turnRaw >= 0 && turnRaw < 500
        ? turnRaw
        : null;

    events.push({
      schema_version: DIAGNOSTIC_SCHEMA_VERSION,
      interview_id: interviewId,
      event_type: eventType,
      occurred_at: occurredAt,
      source,
      severity,
      error_code: asTrimmedString(row.error_code, 64),
      correlation_id: asTrimmedString(row.correlation_id, MAX_CORRELATION_ID_LEN),
      client_event_id: asTrimmedString(row.client_event_id, MAX_CLIENT_EVENT_ID_LEN),
      turn_index,
      engine: asTrimmedString(row.engine, 32) ?? 'v2.1',
      confirmation: 'client_reported',
      metadata: sanitizeMetadata(row.metadata),
    });
  }

  if (events.length === 0) {
    return { ok: false, error: 'No valid events', status: 400 };
  }

  return { ok: true, events, interviewId };
}

export function sanitizeMetadataForTests(raw: unknown): Record<string, string | number | boolean> {
  return sanitizeMetadata(raw);
}
