-- Migration 032: Auto-generated labels array for feedback triage.
--
-- Each submission is tagged at insert time by autoTagFeedback() in the API.
-- Possible labels:
--   UX, Mobile, Performance, AI Accuracy, Audio Issue, Camera Issue,
--   Payment, Login, Credits Confusion, Dashboard Bug, Interview Crash
--
-- Stored as TEXT[] so PostgREST can filter by array containment:
--   SELECT * FROM feedbacks WHERE labels @> ARRAY['Mobile'];
--
-- Pre-existing rows get an empty array by default — that is intentional.
-- They were not tagged at submission time; the founder can manually triage.

BEGIN;

ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS labels TEXT[] NOT NULL DEFAULT '{}';

-- GIN index for fast array containment queries (@> operator).
-- Partial: only index rows that actually have labels (saves space).
CREATE INDEX IF NOT EXISTS idx_feedbacks_labels
  ON public.feedbacks USING GIN (labels)
  WHERE array_length(labels, 1) > 0;

COMMENT ON COLUMN public.feedbacks.labels IS
  'Auto-generated category labels detected at submission time. '
  'One or more of: UX, Mobile, Performance, AI Accuracy, Audio Issue, '
  'Camera Issue, Payment, Login, Credits Confusion, Dashboard Bug, '
  'Interview Crash. Empty array means no label was matched.';

COMMIT;
