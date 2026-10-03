-- Migration 110: interview_diagnostic_events
--
-- Durable, privacy-safe failure-oriented diagnostics for V2.1 interviews.
-- Complements (does not replace) product_events funnel milestones,
-- ai_call_logs, and voice_usage_logs.
--
-- Writes: service-role only (via authenticated ingest API after ownership check).
-- Reads: service-role only (admin investigation loader).
-- Candidates have no direct SELECT/INSERT (prevents client-side enumeration).

BEGIN;

CREATE TABLE IF NOT EXISTS public.interview_diagnostic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_version SMALLINT NOT NULL DEFAULT 1
    CHECK (schema_version >= 1 AND schema_version <= 100),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (char_length(event_type) BETWEEN 1 AND 64),
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL
    CHECK (source IN ('client', 'server', 'edge')),
  severity TEXT NOT NULL
    CHECK (severity IN ('info', 'warning', 'error')),
  error_code TEXT
    CHECK (error_code IS NULL OR char_length(error_code) <= 64),
  correlation_id TEXT
    CHECK (correlation_id IS NULL OR char_length(correlation_id) <= 80),
  client_event_id TEXT
    CHECK (client_event_id IS NULL OR char_length(client_event_id) <= 80),
  turn_index INTEGER
    CHECK (turn_index IS NULL OR turn_index >= 0),
  engine TEXT
    CHECK (engine IS NULL OR char_length(engine) <= 32),
  confirmation TEXT NOT NULL DEFAULT 'client_reported'
    CHECK (confirmation IN ('client_reported', 'server_confirmed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- At-most-one row per client_event_id within an interview (dedupe retries).
CREATE UNIQUE INDEX IF NOT EXISTS uq_interview_diagnostic_client_event
  ON public.interview_diagnostic_events (interview_id, client_event_id)
  WHERE client_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interview_diagnostic_interview_occurred
  ON public.interview_diagnostic_events (interview_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_interview_diagnostic_type_recorded
  ON public.interview_diagnostic_events (event_type, recorded_at DESC);

COMMENT ON TABLE public.interview_diagnostic_events IS
  'Best-effort interview diagnostics (mic/STT/TTS/API/client failures). Not funnel SoT. Retention: operational 90d target (cron TBD).';

ALTER TABLE public.interview_diagnostic_events ENABLE ROW LEVEL SECURITY;

-- No authenticated policies — ingest and admin read use service role only.
DROP POLICY IF EXISTS interview_diagnostic_events_service_role ON public.interview_diagnostic_events;
CREATE POLICY interview_diagnostic_events_service_role
  ON public.interview_diagnostic_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON public.interview_diagnostic_events FROM PUBLIC;
REVOKE ALL ON public.interview_diagnostic_events FROM anon;
REVOKE ALL ON public.interview_diagnostic_events FROM authenticated;
GRANT SELECT, INSERT ON public.interview_diagnostic_events TO service_role;

COMMIT;
