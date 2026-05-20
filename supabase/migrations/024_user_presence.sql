-- ============================================================
-- Migration 024 — User Presence Tracking
-- Apply in Supabase Dashboard → SQL Editor
-- ============================================================
--
-- Track the last time each authenticated user was seen.
-- One row per user (upsert on every heartbeat).
-- Heartbeats fire every 60 seconds from the frontend.
--
-- Online definitions:
--   Currently online  : last_seen_at >= NOW() - INTERVAL '3 minutes'
--   Active (5 min)    : last_seen_at >= NOW() - INTERVAL '5 minutes'
--   Active (1 hour)   : last_seen_at >= NOW() - INTERVAL '1 hour'
--   Active (24 hours) : last_seen_at >= NOW() - INTERVAL '24 hours'
--
-- Write optimisation: the API route skips the upsert when
-- last_seen_at is within the last 45 seconds (rate-limited at 1/min).

CREATE TABLE IF NOT EXISTS user_activity (
  user_id      uuid        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  current_page text,                -- e.g. '/dashboard', '/interview/session/abc'
  user_agent   text,                -- truncated to 300 chars server-side
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Primary access pattern: "who was active in the last N minutes?"
CREATE INDEX IF NOT EXISTS idx_user_activity_last_seen ON user_activity (last_seen_at DESC);

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Only the service role (server-side API routes) may read or write.
-- Users cannot read each other's presence data.
-- NOTE: requires a valid SUPABASE_SERVICE_ROLE_KEY JWT in the API server env.
DROP POLICY IF EXISTS "service_role_full" ON user_activity;
CREATE POLICY "service_role_full" ON user_activity
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
