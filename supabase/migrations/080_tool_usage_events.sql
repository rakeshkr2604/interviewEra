-- ============================================================
-- Migration 20260720000001 — Free-tool usage events
--
-- Aggregate, anonymized usage counters for the three free
-- marketing tools (ATS checker, Question Generator, STAR
-- builder), powering the admin "Free Tools" dashboard.
--
-- Privacy (scoped exception to the GA4-only telemetry rule):
-- aggregate counters ONLY — no user_id, no ip, no user agent,
-- no PII of any kind. Fire-and-forget inserts via service role.
-- ============================================================

CREATE TABLE IF NOT EXISTS tool_usage_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tool        text        NOT NULL CHECK (tool IN ('ats', 'question_generator', 'star')),
  mode        text,       -- QG generation mode ('role' | 'jd' | 'topic' | 'company' | 'answer'); null for other tools
  event       text        NOT NULL CHECK (event IN ('run', 'cache_hit', 'rate_limited', 'error')),
  cost_usd    numeric(12,8),        -- null when unknown at the action level (ai_call_logs is cost source of truth)
  signed_in   boolean     NOT NULL DEFAULT false,  -- cookie-presence heuristic, not a verified session
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_created ON tool_usage_events (tool, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_usage_created      ON tool_usage_events (created_at DESC);

-- RLS: only service role reads/writes (admin dashboard uses service role)
ALTER TABLE tool_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tool_usage_events_service_full ON tool_usage_events
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON tool_usage_events TO service_role;
