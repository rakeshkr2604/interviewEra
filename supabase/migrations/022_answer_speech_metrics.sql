-- Phase A: persist speech metrics at answer submission time.
-- Three additive nullable columns — fully backward-compatible.
-- Apply in Supabase Dashboard → SQL Editor.

ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS speech_metrics   JSONB;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS summary          JSONB;

-- Optional constraint: duration_seconds must be non-negative when set.
ALTER TABLE answers
  ADD CONSTRAINT answers_duration_non_negative
    CHECK (duration_seconds IS NULL OR duration_seconds >= 0);
