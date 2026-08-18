-- ============================================================================
-- Migration: 20260717000003_script_interview_reports_harden.sql
--
-- Harden v2.1 report rows for:
--   * generating claim (concurrent View Report idempotency)
--   * insufficient_data (zero scored answers — no fabricated overall)
-- Nullable score columns when status is generating / insufficient_data / failed.
-- ============================================================================

BEGIN;

ALTER TABLE script_interview_reports
  DROP CONSTRAINT IF EXISTS script_interview_reports_status_check;
ALTER TABLE script_interview_reports
  ADD CONSTRAINT script_interview_reports_status_check
    CHECK (status IN ('generating', 'ready', 'partial', 'insufficient_data', 'failed'));

ALTER TABLE script_interview_reports
  ALTER COLUMN overall DROP NOT NULL;
ALTER TABLE script_interview_reports
  ALTER COLUMN dimension_averages DROP NOT NULL;
ALTER TABLE script_interview_reports
  ALTER COLUMN score_band DROP NOT NULL;
ALTER TABLE script_interview_reports
  ALTER COLUMN placement_signal DROP NOT NULL;

ALTER TABLE script_interview_reports
  DROP CONSTRAINT IF EXISTS script_interview_reports_overall_range_check;
ALTER TABLE script_interview_reports
  ADD CONSTRAINT script_interview_reports_overall_range_check
    CHECK (overall IS NULL OR (overall >= 0 AND overall <= 10));

COMMIT;
