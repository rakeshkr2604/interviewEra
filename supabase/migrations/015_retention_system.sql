-- InterviewEra — Retention System Migration
-- Spec: hybrid-retention-system-spec.md v1.0
-- Adds Progress Gates (tier unlocks) and Quality Streak tracking.
--
-- Scope of this file:
--   • user_progress       — per-user tier/streak/XP state, designed for high-read leaderboards
--   • session_quality_log — immutable per-session quality + scoring audit log
--   • supporting enums, indexes, RLS, updated_at trigger, and progress-row bootstrap trigger
--
-- All FKs target public.users (matching the pattern used by 001..014). Auth FK is handled
-- transitively by handle_new_user() in 001_initial_schema.sql.

BEGIN;

-- ─── ENUMs (idempotent) ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE retention_tier AS ENUM ('tier_1', 'tier_2', 'tier_3', 'tier_4');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE retention_badge AS ENUM (
    'consistent_learner',  -- 3-day streak
    'dedicated_preparer',  -- 7-day streak
    'interview_ready',     -- 14-day streak
    'placement_warrior'    -- 30-day streak
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE unlock_reason AS ENUM (
    'tier_2_three_sessions_dim_score',
    'tier_3_rolling_avg_5',
    'tier_4_overall_avg',
    'admin_grant',
    'migration_backfill'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- user_progress: hot-read state per user. One row per user. Read on every dashboard
-- load and every session-complete event. Writes funnel through SECURITY DEFINER RPCs.
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- ── Progress Gates ─────────────────────────────────────────────────────────
  current_tier INTEGER NOT NULL DEFAULT 1
    CHECK (current_tier BETWEEN 1 AND 4),
  tier_unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_sessions INTEGER NOT NULL DEFAULT 0
    CHECK (total_sessions >= 0),
  sessions_at_current_tier INTEGER NOT NULL DEFAULT 0
    CHECK (sessions_at_current_tier >= 0),

  -- ── Score tracking (NUMERIC(4,2) — 0.00..10.00 with one extra digit for rounding) ──
  overall_avg_score NUMERIC(4,2)
    CHECK (overall_avg_score IS NULL OR (overall_avg_score >= 0 AND overall_avg_score <= 10)),
  max_dimension_score NUMERIC(4,2)
    CHECK (max_dimension_score IS NULL OR (max_dimension_score >= 0 AND max_dimension_score <= 10)),
  last_5_sessions_avg NUMERIC(4,2)
    CHECK (last_5_sessions_avg IS NULL OR (last_5_sessions_avg >= 0 AND last_5_sessions_avg <= 10)),

  -- ── Lifetime XP (sum of session_score * 10, integer for cheap comparison) ──
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),

  -- ── Quality Streaks ────────────────────────────────────────────────────────
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_quality_session_date DATE,

  -- ── Badges (immutable append-only JSONB array) ─────────────────────────────
  --   Shape: [{ "badge": <retention_badge>, "earned_at": <ISO timestamp>, "streak_length": <int> }]
  badges_earned JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- ── Unlock metadata (cooldown + anti-abuse) ────────────────────────────────
  last_unlock_at TIMESTAMPTZ,           -- most recent successful tier unlock
  last_check_at TIMESTAMPTZ,            -- last time checkAndUnlockTier ran
  unlock_attempts INTEGER NOT NULL DEFAULT 0 CHECK (unlock_attempts >= 0),
  consecutive_rejections INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_rejections >= 0),
  flagged_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
  flagged_reason TEXT,

  -- ── Timestamps ────────────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT longest_ge_current CHECK (longest_streak >= current_streak)
);

-- Hot path: O(1) lookup by user_id.
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
-- Tier distribution dashboards, future per-tier leaderboard.
CREATE INDEX IF NOT EXISTS idx_user_progress_tier ON user_progress(current_tier);
-- Leaderboards by streak / XP. DESC so default ORDER BY ... DESC LIMIT N stays cheap.
CREATE INDEX IF NOT EXISTS idx_user_progress_streak_desc ON user_progress(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_xp_desc ON user_progress(total_xp DESC);
-- Abuse triage queue.
CREATE INDEX IF NOT EXISTS idx_user_progress_flagged
  ON user_progress(flagged_suspicious)
  WHERE flagged_suspicious = TRUE;

COMMENT ON TABLE user_progress IS
  'Per-user retention state: tier progression, quality streaks, XP, badges, anti-abuse flags.';
COMMENT ON COLUMN user_progress.badges_earned IS
  'Append-only JSONB array: [{badge, earned_at, streak_length}]. Use jsonb_path_exists for dedupe.';
COMMENT ON COLUMN user_progress.total_xp IS
  'Lifetime XP = sum(session_score * 10) over all quality_met sessions. Integer for cheap comparison.';

-- session_quality_log: append-only per-session audit. Drives streak calc, retention
-- analytics, and abuse detection. Never updated after insert.
CREATE TABLE IF NOT EXISTS session_quality_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,

  -- ── Quality criteria (spec §Quality Streaks) ──────────────────────────────
  questions_answered INTEGER NOT NULL CHECK (questions_answered >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions >= 1),
  questions_skipped INTEGER NOT NULL DEFAULT 0 CHECK (questions_skipped >= 0),
  avg_answer_duration_sec INTEGER NOT NULL CHECK (avg_answer_duration_sec >= 0),
  session_score NUMERIC(4,2) NOT NULL
    CHECK (session_score >= 0 AND session_score <= 10),
  quality_met BOOLEAN NOT NULL,

  -- ── Scoring breakdown (per-dimension; same keys as DimensionScores) ───────
  --   Persisted so we can recompute max_dimension_score / explain unlocks without
  --   re-joining to evaluations.
  dimension_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  max_dimension_score NUMERIC(4,2)
    CHECK (max_dimension_score IS NULL OR (max_dimension_score >= 0 AND max_dimension_score <= 10)),

  -- ── Unlock contribution: what this session changed in progression state ──
  --   Shape: { "tier_unlocked": null | 2|3|4,
  --            "streak_delta": -N|0|+1,
  --            "badge_earned": null | retention_badge,
  --            "xp_gained": int }
  unlock_contribution JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- ── Engagement metrics (used for abuse detection) ─────────────────────────
  total_typing_ms INTEGER CHECK (total_typing_ms IS NULL OR total_typing_ms >= 0),
  total_speaking_ms INTEGER CHECK (total_speaking_ms IS NULL OR total_speaking_ms >= 0),
  tab_blur_count INTEGER CHECK (tab_blur_count IS NULL OR tab_blur_count >= 0),
  device_fingerprint TEXT,
  ip_hash TEXT,

  -- ── Anti-cheat flags (lightweight booleans for filtering) ────────────────
  flagged_low_engagement BOOLEAN NOT NULL DEFAULT FALSE,
  flagged_duplicate_fingerprint BOOLEAN NOT NULL DEFAULT FALSE,
  flagged_impossible_speed BOOLEAN NOT NULL DEFAULT FALSE,
  flag_notes TEXT,

  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One quality log per interview. Avoids double-counting under client retries.
  CONSTRAINT session_quality_log_unique_interview UNIQUE (interview_id),

  CONSTRAINT answered_le_total CHECK (questions_answered <= total_questions),
  CONSTRAINT skipped_le_total CHECK (questions_skipped <= total_questions)
);

-- Hot path: streak calc reads "latest N sessions per user" (ORDER BY completed_at DESC).
CREATE INDEX IF NOT EXISTS idx_session_quality_user_completed
  ON session_quality_log(user_id, completed_at DESC);
-- Retention analytics: "quality sessions in last 7d" type queries.
CREATE INDEX IF NOT EXISTS idx_session_quality_completed
  ON session_quality_log(completed_at);
-- Abuse triage: list flagged sessions per user, newest first.
CREATE INDEX IF NOT EXISTS idx_session_quality_flagged_user
  ON session_quality_log(user_id, completed_at DESC)
  WHERE flagged_low_engagement OR flagged_duplicate_fingerprint OR flagged_impossible_speed;
-- Cross-user duplicate fingerprint detection.
CREATE INDEX IF NOT EXISTS idx_session_quality_fingerprint
  ON session_quality_log(device_fingerprint)
  WHERE device_fingerprint IS NOT NULL;

COMMENT ON TABLE session_quality_log IS
  'Append-only quality audit per interview. One row per interview (UNIQUE), drives streak + unlock logic.';

-- ─── updated_at trigger for user_progress ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_user_progress_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_progress_touch_updated_at ON user_progress;
CREATE TRIGGER trg_user_progress_touch_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_user_progress_updated_at();

-- ─── Bootstrap trigger: ensure every user has a user_progress row ───────────
-- Idempotent on conflict so re-running the migration / replays don't blow up.
CREATE OR REPLACE FUNCTION public.bootstrap_user_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_progress (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_bootstrap_progress ON users;
CREATE TRIGGER trg_users_bootstrap_progress
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_user_progress();

-- Backfill existing users (defaults to tier 1, streak 0). Safe to re-run.
INSERT INTO user_progress (user_id)
SELECT u.id FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_progress up WHERE up.user_id = u.id);

-- ─── Atomic tier unlock RPC ────────────────────────────────────────────────
-- Optimistic concurrency: only updates if current_tier still matches expected_from_tier.
-- This is the canonical write path for tier unlocks — callers should not UPDATE the
-- user_progress.current_tier column directly.
CREATE OR REPLACE FUNCTION public.unlock_user_tier(
  p_user_id UUID,
  p_expected_from_tier INTEGER,
  p_to_tier INTEGER,
  p_reason unlock_reason
)
RETURNS TABLE (
  success BOOLEAN,
  new_tier INTEGER,
  unlocked_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_tier INTEGER;
  v_unlocked_at TIMESTAMPTZ;
BEGIN
  IF p_to_tier <= p_expected_from_tier THEN
    RETURN QUERY SELECT FALSE, p_expected_from_tier, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  UPDATE user_progress
  SET
    current_tier = p_to_tier,
    tier_unlocked_at = NOW(),
    last_unlock_at = NOW(),
    sessions_at_current_tier = 0,
    last_check_at = NOW(),
    consecutive_rejections = 0
  WHERE user_id = p_user_id
    AND current_tier = p_expected_from_tier
  RETURNING current_tier, tier_unlocked_at
    INTO v_new_tier, v_unlocked_at;

  IF v_new_tier IS NULL THEN
    -- Lost the race or no such user — update last_check_at + rejection counter.
    UPDATE user_progress
    SET
      last_check_at = NOW(),
      consecutive_rejections = consecutive_rejections + 1
    WHERE user_id = p_user_id;

    RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- The reason is preserved in flagged_reason only when null — that's not its
  -- purpose. We persist it via the unlock_contribution JSON on the matching
  -- session_quality_log row (written by the caller).
  PERFORM p_reason;  -- silence unused-param lint
  RETURN QUERY SELECT TRUE, v_new_tier, v_unlocked_at;
END;
$$;

COMMENT ON FUNCTION public.unlock_user_tier(UUID, INTEGER, INTEGER, unlock_reason) IS
  'Atomic tier unlock with optimistic concurrency. Increments only when current_tier matches expected_from_tier.';

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_quality_log ENABLE ROW LEVEL SECURITY;

-- user_progress: users see only their own; writes flow through SECURITY DEFINER RPCs
-- + service-role API routes.
DROP POLICY IF EXISTS "user_progress_select_own" ON user_progress;
CREATE POLICY "user_progress_select_own" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

-- session_quality_log: read-only for the owner. All writes happen via service role.
DROP POLICY IF EXISTS "session_quality_log_select_own" ON session_quality_log;
CREATE POLICY "session_quality_log_select_own" ON session_quality_log
  FOR SELECT USING (auth.uid() = user_id);

-- ─── Role grants (matching 001_initial_schema.sql pattern) ─────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON user_progress, session_quality_log TO service_role;
GRANT SELECT ON user_progress, session_quality_log TO authenticated;

GRANT EXECUTE ON FUNCTION public.unlock_user_tier(UUID, INTEGER, INTEGER, unlock_reason) TO service_role;

COMMIT;
