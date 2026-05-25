-- InterviewEra — Feedback severity scoring
-- Adds an auto-derived severity level to each feedback submission so the founder
-- can triage by urgency. The value is computed server-side in
-- src/lib/email/feedback-notification.ts (assessFeedback) and written by /api/feedback.

BEGIN;

ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'low'
    CHECK (severity IN ('low', 'medium', 'high', 'critical'));

-- Triage queue: list newest critical/high items first.
CREATE INDEX IF NOT EXISTS idx_feedbacks_severity_created
  ON public.feedbacks(severity, created_at DESC);

COMMENT ON COLUMN public.feedbacks.severity IS
  'Auto-scored urgency (low|medium|high|critical) derived from rating + keyword analysis at submit time.';

COMMIT;
