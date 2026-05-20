-- ============================================================
-- Migration 023 — AI Telemetry, Voice Quota, Abuse Detection
-- Apply in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. ai_call_logs
--    Every LLM call (OpenAI / OpenRouter / Mistral).
--    Fire-and-forget inserts via service role.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_call_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        REFERENCES users(id) ON DELETE SET NULL,
  interview_id     uuid        REFERENCES interviews(id) ON DELETE SET NULL,
  operation        text        NOT NULL,   -- 'answer_evaluation' | 'question_generation' | ...
  provider         text        NOT NULL,   -- 'openai' | 'openrouter' | 'mistral'
  model            text        NOT NULL,   -- exact model string e.g. 'gpt-4o-mini'
  input_tokens     int,
  output_tokens    int,
  total_tokens     int GENERATED ALWAYS AS (COALESCE(input_tokens,0) + COALESCE(output_tokens,0)) STORED,
  cost_usd         numeric(12,8),
  latency_ms       int,
  retries          smallint    DEFAULT 0,
  success          boolean     NOT NULL,
  is_fallback      boolean     DEFAULT false,  -- true when not the primary provider for this op
  error_category   text,       -- 'timeout' | 'quota' | 'parse_failure' | 'http_error' | 'circuit_open'
  error_code       text,       -- HTTP status or error code string
  json_parse_ok    boolean,    -- null for non-structured ops, true/false for JSON ops
  circuit_was_open boolean     DEFAULT false,
  ip               text,
  user_agent       text,
  session_id       text,       -- STT/TTS session correlation ID
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_ai_call_logs_user_date     ON ai_call_logs (user_id, created_at DESC);
CREATE INDEX idx_ai_call_logs_interview     ON ai_call_logs (interview_id, created_at DESC);
CREATE INDEX idx_ai_call_logs_operation     ON ai_call_logs (operation, created_at DESC);
CREATE INDEX idx_ai_call_logs_provider      ON ai_call_logs (provider, model, created_at DESC);
CREATE INDEX idx_ai_call_logs_date          ON ai_call_logs (created_at DESC);
CREATE INDEX idx_ai_call_logs_errors        ON ai_call_logs (error_category, created_at DESC)
  WHERE success = false;

-- RLS: only service role writes; no direct user reads (admin dashboard uses service role)
ALTER TABLE ai_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full" ON ai_call_logs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- 2. voice_usage_logs
--    Every ElevenLabs TTS + Deepgram STT session.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_usage_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        REFERENCES users(id) ON DELETE SET NULL,
  interview_id     uuid        REFERENCES interviews(id) ON DELETE SET NULL,
  provider         text        NOT NULL,   -- 'elevenlabs' | 'deepgram' | 'web_speech'
  voice_type       text        NOT NULL,   -- 'tts' | 'stt'
  -- TTS fields
  tts_chars        int,        -- characters sent to ElevenLabs
  tts_model        text,       -- 'eleven_turbo_v2_5'
  tts_voice_id     text,       -- voice ID used (first 8 chars logged only)
  -- STT fields
  stt_duration_ms  int,        -- connection duration in ms
  stt_model        text,       -- 'nova-3'
  stt_language     text,       -- 'en-IN'
  -- Common
  cost_usd         numeric(12,8),
  latency_ms       int,
  success          boolean     NOT NULL,
  error_category   text,
  ip               text,
  session_id       text,       -- links TTS+STT events for same interview turn
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_usage_user_date  ON voice_usage_logs (user_id, created_at DESC);
CREATE INDEX idx_voice_usage_interview  ON voice_usage_logs (interview_id);
CREATE INDEX idx_voice_usage_provider   ON voice_usage_logs (provider, voice_type, created_at DESC);

ALTER TABLE voice_usage_logs ENABLE ROW LEVEL SECURITY;
-- Users can read their own voice usage (for quota display)
CREATE POLICY "users_read_own" ON voice_usage_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service_role_full" ON voice_usage_logs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- 3. abuse_detection_logs
--    Immutable audit trail of all abuse events.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS abuse_detection_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        REFERENCES users(id) ON DELETE SET NULL,
  ip               text,
  event_type       text        NOT NULL,   -- 'rate_limit_hit' | 'score_threshold' | 'block' | 'rapid_tokens' | ...
  risk_score       smallint,               -- 0-100 at time of event
  threshold        smallint,               -- threshold that triggered this event
  details          jsonb,                  -- arbitrary context
  action_taken     text,       -- 'blocked' | 'warned' | 'logged' | 'rate_limited'
  block_duration_s int,        -- seconds of block applied (null = no block)
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_abuse_logs_user       ON abuse_detection_logs (user_id, created_at DESC);
CREATE INDEX idx_abuse_logs_ip         ON abuse_detection_logs (ip, created_at DESC);
CREATE INDEX idx_abuse_logs_event_type ON abuse_detection_logs (event_type, created_at DESC);
CREATE INDEX idx_abuse_logs_date       ON abuse_detection_logs (created_at DESC);

ALTER TABLE abuse_detection_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full" ON abuse_detection_logs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- 4. provider_health_logs
--    Hourly snapshots of per-provider circuit breaker + perf.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_health_logs (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider           text        NOT NULL,
  model              text        NOT NULL,
  snapshot_at        timestamptz NOT NULL DEFAULT now(),
  success_rate       numeric(5,4),   -- 0.0000 – 1.0000
  p95_latency_ms     int,
  avg_latency_ms     int,
  json_validity_rate numeric(5,4),
  timeout_rate       numeric(5,4),
  quota_rate         numeric(5,4),
  sample_count       int,
  circuit_open       boolean     DEFAULT false,
  total_cost_usd     numeric(14,8)   -- lifetime cost at snapshot time
);

CREATE INDEX idx_provider_health_snapshot ON provider_health_logs (provider, model, snapshot_at DESC);
CREATE INDEX idx_provider_health_date     ON provider_health_logs (snapshot_at DESC);

ALTER TABLE provider_health_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full" ON provider_health_logs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- 5. user_ai_usage_rollups
--    Daily per-user cost and usage aggregates (pre-computed).
--    Populated by a nightly aggregation job.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_ai_usage_rollups (
  user_id           uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rollup_date       date        NOT NULL,
  plan_tier         text,
  -- LLM
  llm_calls         int         DEFAULT 0,
  llm_input_tokens  bigint      DEFAULT 0,
  llm_output_tokens bigint      DEFAULT 0,
  llm_cost_usd      numeric(12,6) DEFAULT 0,
  llm_failures      int         DEFAULT 0,
  llm_fallbacks     int         DEFAULT 0,
  -- Voice
  tts_chars         int         DEFAULT 0,
  tts_cost_usd      numeric(12,6) DEFAULT 0,
  stt_seconds       int         DEFAULT 0,
  stt_cost_usd      numeric(12,6) DEFAULT 0,
  -- Combined
  total_cost_usd    numeric(12,6) GENERATED ALWAYS AS (llm_cost_usd + tts_cost_usd + stt_cost_usd) STORED,
  interview_count   int         DEFAULT 0,
  voice_interview_count int     DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, rollup_date)
);

CREATE INDEX idx_rollups_date         ON user_ai_usage_rollups (rollup_date DESC);
CREATE INDEX idx_rollups_cost         ON user_ai_usage_rollups (total_cost_usd DESC);
CREATE INDEX idx_rollups_plan_date    ON user_ai_usage_rollups (plan_tier, rollup_date DESC);

ALTER TABLE user_ai_usage_rollups ENABLE ROW LEVEL SECURITY;
-- Users can see their own rollups (for a "my usage" page)
CREATE POLICY "users_read_own" ON user_ai_usage_rollups
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service_role_full" ON user_ai_usage_rollups
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- 6. realtime_session_metrics
--    Per-interview session summary written on completion.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS realtime_session_metrics (
  interview_id      uuid        PRIMARY KEY REFERENCES interviews(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_tier         text,
  -- LLM
  total_llm_calls   int         DEFAULT 0,
  total_llm_tokens  int         DEFAULT 0,
  llm_cost_usd      numeric(12,8) DEFAULT 0,
  evaluations_ok    int         DEFAULT 0,
  evaluations_failed int        DEFAULT 0,
  fallbacks_used    int         DEFAULT 0,
  -- Voice
  used_elevenlabs   boolean     DEFAULT false,
  used_deepgram     boolean     DEFAULT false,
  tts_chars         int         DEFAULT 0,
  stt_seconds       int         DEFAULT 0,
  voice_cost_usd    numeric(12,8) DEFAULT 0,
  -- Total
  total_cost_usd    numeric(12,8) GENERATED ALWAYS AS (llm_cost_usd + voice_cost_usd) STORED,
  -- Timing
  session_start     timestamptz,
  session_end       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_metrics_user   ON realtime_session_metrics (user_id, created_at DESC);
CREATE INDEX idx_session_metrics_cost   ON realtime_session_metrics (total_cost_usd DESC);
CREATE INDEX idx_session_metrics_date   ON realtime_session_metrics (created_at DESC);

ALTER TABLE realtime_session_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full" ON realtime_session_metrics
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- 7. provider_failover_events
--    Every time routing falls back to a secondary provider.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_failover_events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        REFERENCES users(id) ON DELETE SET NULL,
  interview_id      uuid        REFERENCES interviews(id) ON DELETE SET NULL,
  operation         text        NOT NULL,
  from_provider     text        NOT NULL,
  from_model        text        NOT NULL,
  to_provider       text        NOT NULL,
  to_model          text        NOT NULL,
  reason            text        NOT NULL,   -- 'timeout' | 'quota' | 'circuit_open' | 'parse_failure'
  latency_before_ms int,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_failover_date      ON provider_failover_events (created_at DESC);
CREATE INDEX idx_failover_from      ON provider_failover_events (from_provider, reason, created_at DESC);
CREATE INDEX idx_failover_interview ON provider_failover_events (interview_id);

ALTER TABLE provider_failover_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full" ON provider_failover_events
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- 8. Nightly rollup function
--    Call via pg_cron or a Vercel cron endpoint.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION compute_daily_user_rollup(target_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_ai_usage_rollups (
    user_id, rollup_date, plan_tier,
    llm_calls, llm_input_tokens, llm_output_tokens, llm_cost_usd, llm_failures, llm_fallbacks,
    tts_chars, tts_cost_usd, stt_seconds, stt_cost_usd,
    interview_count, voice_interview_count, updated_at
  )
  SELECT
    u.id                                      AS user_id,
    target_date                               AS rollup_date,
    u.plan_tier,
    COUNT(a.id)                               AS llm_calls,
    COALESCE(SUM(a.input_tokens), 0)          AS llm_input_tokens,
    COALESCE(SUM(a.output_tokens), 0)         AS llm_output_tokens,
    COALESCE(SUM(a.cost_usd), 0)              AS llm_cost_usd,
    COUNT(a.id) FILTER (WHERE NOT a.success)  AS llm_failures,
    COUNT(a.id) FILTER (WHERE a.is_fallback)  AS llm_fallbacks,
    COALESCE(SUM(v.tts_chars), 0)             AS tts_chars,
    COALESCE(SUM(v.cost_usd) FILTER (WHERE v.voice_type='tts'), 0) AS tts_cost_usd,
    COALESCE(SUM(v.stt_duration_ms)/1000, 0)  AS stt_seconds,
    COALESCE(SUM(v.cost_usd) FILTER (WHERE v.voice_type='stt'), 0) AS stt_cost_usd,
    COUNT(DISTINCT i.id)                      AS interview_count,
    COUNT(DISTINCT rsm.interview_id)
      FILTER (WHERE rsm.used_elevenlabs OR rsm.used_deepgram) AS voice_interview_count,
    now()
  FROM users u
  LEFT JOIN ai_call_logs a
    ON a.user_id = u.id
    AND date_trunc('day', a.created_at) = target_date
  LEFT JOIN voice_usage_logs v
    ON v.user_id = u.id
    AND date_trunc('day', v.created_at) = target_date
  LEFT JOIN interviews i
    ON i.user_id = u.id
    AND date_trunc('day', i.started_at) = target_date
  LEFT JOIN realtime_session_metrics rsm
    ON rsm.user_id = u.id
    AND date_trunc('day', rsm.created_at) = target_date
  WHERE
    a.id IS NOT NULL OR v.id IS NOT NULL
  GROUP BY u.id, u.plan_tier
  ON CONFLICT (user_id, rollup_date) DO UPDATE SET
    plan_tier             = EXCLUDED.plan_tier,
    llm_calls             = EXCLUDED.llm_calls,
    llm_input_tokens      = EXCLUDED.llm_input_tokens,
    llm_output_tokens     = EXCLUDED.llm_output_tokens,
    llm_cost_usd          = EXCLUDED.llm_cost_usd,
    llm_failures          = EXCLUDED.llm_failures,
    llm_fallbacks         = EXCLUDED.llm_fallbacks,
    tts_chars             = EXCLUDED.tts_chars,
    tts_cost_usd          = EXCLUDED.tts_cost_usd,
    stt_seconds           = EXCLUDED.stt_seconds,
    stt_cost_usd          = EXCLUDED.stt_cost_usd,
    interview_count       = EXCLUDED.interview_count,
    voice_interview_count = EXCLUDED.voice_interview_count,
    updated_at            = now();
END;
$$;
