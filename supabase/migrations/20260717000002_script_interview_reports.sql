-- ============================================================================
-- Migration: 20260717000002_script_interview_reports.sql
--
-- Purpose: Persist the v2.1 end-of-interview report once, keyed by interview_id.
-- Built from answer_evaluations (score-v1.2 dimensions) + script_turns.
-- Does NOT reuse the v1 `reports` table (incompatible dimension keys / radar).
--
-- RLS:
--   * SELECT: candidate may read only their own interview's report
--   * INSERT / UPDATE / DELETE: service-role ONLY
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS script_interview_reports (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id     UUID        NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  user_id          UUID        REFERENCES users(id) ON DELETE SET NULL,

  -- Aggregation inputs / versioning
  prompt_versions  TEXT[]      NOT NULL DEFAULT '{}',
  scored_answer_count INTEGER  NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'ready',

  -- Deterministic aggregates (always present when status=ready; neutral when 0 answers)
  overall          NUMERIC(4,2) NOT NULL,
  dimension_averages JSONB     NOT NULL,
  score_band       TEXT        NOT NULL,
  placement_signal TEXT        NOT NULL,

  -- Per-question analysis payload (array of objects)
  per_question     JSONB       NOT NULL DEFAULT '[]',

  -- Optional LLM synthesis (null when synthesis failed — UI falls back to deterministic copy)
  synthesis        JSONB,
  synthesis_model  TEXT,
  synthesis_raw    TEXT,

  generated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (interview_id)
);

ALTER TABLE script_interview_reports
  DROP CONSTRAINT IF EXISTS script_interview_reports_status_check;
ALTER TABLE script_interview_reports
  ADD CONSTRAINT script_interview_reports_status_check
    CHECK (status IN ('ready', 'partial', 'failed'));

ALTER TABLE script_interview_reports
  DROP CONSTRAINT IF EXISTS script_interview_reports_overall_range_check;
ALTER TABLE script_interview_reports
  ADD CONSTRAINT script_interview_reports_overall_range_check
    CHECK (overall >= 0 AND overall <= 10);

CREATE INDEX IF NOT EXISTS idx_script_interview_reports_user
  ON script_interview_reports (user_id, generated_at DESC);

ALTER TABLE script_interview_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS script_interview_reports_select_own ON script_interview_reports;
CREATE POLICY script_interview_reports_select_own ON script_interview_reports
  FOR SELECT
  USING (
    interview_id IN (
      SELECT id FROM interviews WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS script_interview_reports_service_role_full ON script_interview_reports;
CREATE POLICY script_interview_reports_service_role_full ON script_interview_reports
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT SELECT ON script_interview_reports TO authenticated;
GRANT ALL ON script_interview_reports TO service_role;

COMMIT;
