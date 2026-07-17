-- ============================================================================
-- Migration: 20260716000001_answer_evaluations.sql
--
-- Purpose: Per-answer 5-dimension scoring (score-v1) for the v2.1 script
-- engine. One row per scored answer turn — full audit trail for disputed
-- score review: raw model output, prompt/model versions, and the exact
-- inputs (question + transcript) that produced the score.
--
-- RLS policy (stated explicitly):
--   * INSERT / UPDATE / DELETE: service-role ONLY. There is deliberately NO
--     insert/update policy for `authenticated` — scores are written
--     exclusively by the API route via the service client, matching the
--     Critical Invariant pattern for credit RPCs (service-role-only writes).
--   * SELECT: candidate may read only rows belonging to their own
--     interviews, via the same ownership subquery used by script_turns
--     (interview_id IN (SELECT id FROM interviews WHERE user_id = auth.uid())).
--
-- Safe to re-run: idempotent DDL throughout.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS answer_evaluations (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id     UUID        NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  turn_index       INTEGER     NOT NULL,
  user_id          UUID        REFERENCES users(id) ON DELETE SET NULL,

  -- Inputs that produced the score (auditability / disputed-score review)
  question         TEXT        NOT NULL,
  transcript       TEXT        NOT NULL,
  question_type    TEXT        NOT NULL,
  type_source      TEXT        NOT NULL,
  sub_rubric       TEXT        NOT NULL,

  -- Versioning
  prompt_version   TEXT        NOT NULL,
  model            TEXT        NOT NULL,

  -- Raw model output (verbatim, pre-validation) + validated dimensions
  raw_model_output TEXT        NOT NULL,
  dimensions       JSONB,
  overall          NUMERIC(4,2),

  -- Min Deepgram final-segment confidence for this answer (0–1); NULL when
  -- the client had no voice segments (typed answer / Web Speech fallback).
  stt_min_confidence NUMERIC(4,3),

  -- 'scored' = validated + returned to candidate; 'failed' = both attempts
  -- rejected by validation — kept for audit, never shown as a score.
  status           TEXT        NOT NULL DEFAULT 'scored',
  score_suspect    BOOLEAN     NOT NULL DEFAULT false,
  suspect_reasons  TEXT[]      NOT NULL DEFAULT '{}',

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (interview_id, turn_index)
);

ALTER TABLE answer_evaluations
  DROP CONSTRAINT IF EXISTS answer_evaluations_status_check;
ALTER TABLE answer_evaluations
  ADD CONSTRAINT answer_evaluations_status_check
    CHECK (status IN ('scored', 'failed'));

ALTER TABLE answer_evaluations
  DROP CONSTRAINT IF EXISTS answer_evaluations_question_type_check;
ALTER TABLE answer_evaluations
  ADD CONSTRAINT answer_evaluations_question_type_check
    CHECK (question_type IN ('technical', 'behavioral'));

ALTER TABLE answer_evaluations
  DROP CONSTRAINT IF EXISTS answer_evaluations_type_source_check;
ALTER TABLE answer_evaluations
  ADD CONSTRAINT answer_evaluations_type_source_check
    CHECK (type_source IN ('tagged', 'script_derived', 'inferred', 'fallback_default'));

ALTER TABLE answer_evaluations
  DROP CONSTRAINT IF EXISTS answer_evaluations_sub_rubric_check;
ALTER TABLE answer_evaluations
  ADD CONSTRAINT answer_evaluations_sub_rubric_check
    CHECK (sub_rubric IN ('star', 'logical_flow'));

ALTER TABLE answer_evaluations
  DROP CONSTRAINT IF EXISTS answer_evaluations_overall_range_check;
ALTER TABLE answer_evaluations
  ADD CONSTRAINT answer_evaluations_overall_range_check
    CHECK (overall IS NULL OR (overall >= 0 AND overall <= 10));

CREATE INDEX IF NOT EXISTS idx_answer_evaluations_interview
  ON answer_evaluations (interview_id, turn_index);

CREATE INDEX IF NOT EXISTS idx_answer_evaluations_suspect
  ON answer_evaluations (created_at DESC)
  WHERE score_suspect = true;

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE answer_evaluations ENABLE ROW LEVEL SECURITY;

-- Candidate reads only their own rows (interviews ownership subquery — same
-- pattern as script_turns_select_own).
DROP POLICY IF EXISTS answer_evaluations_select_own ON answer_evaluations;
CREATE POLICY answer_evaluations_select_own ON answer_evaluations
  FOR SELECT
  USING (
    interview_id IN (
      SELECT id FROM interviews WHERE user_id = auth.uid()
    )
  );

-- Service-role full access (matches ai_call_logs "service_role_full" pattern).
-- NO insert/update/delete policy exists for `authenticated` — writes are
-- service-role only, by design.
DROP POLICY IF EXISTS answer_evaluations_service_role_full ON answer_evaluations;
CREATE POLICY answer_evaluations_service_role_full ON answer_evaluations
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grants: authenticated may only SELECT (RLS-scoped); service_role owns writes.
GRANT SELECT ON answer_evaluations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON answer_evaluations TO service_role;

COMMIT;
