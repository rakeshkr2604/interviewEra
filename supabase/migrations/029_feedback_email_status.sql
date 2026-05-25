-- Migration 029: Email delivery tracking for the feedback retry system.
--
-- Adds four columns to `feedbacks` so the retry cron can track delivery state
-- without losing any submissions:
--
--   email_status         'pending' | 'retrying' | 'sent' | 'failed'
--   email_attempts       monotonically-increasing attempt counter
--   last_email_error     last provider error message (≤1000 chars)
--   last_email_attempt_at  when the most-recent attempt started/ended
--
-- Backfill: all existing rows were delivered by the old synchronous code, so
-- they get email_status = 'sent' immediately.

BEGIN;

ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS email_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (email_status IN ('pending', 'retrying', 'sent', 'failed')),
  ADD COLUMN IF NOT EXISTS email_attempts INTEGER NOT NULL DEFAULT 0
    CHECK (email_attempts >= 0),
  ADD COLUMN IF NOT EXISTS last_email_error TEXT
    CHECK (last_email_error IS NULL OR length(last_email_error) <= 1000),
  ADD COLUMN IF NOT EXISTS last_email_attempt_at TIMESTAMPTZ;

-- Rows that existed before this migration were already delivered inline.
UPDATE public.feedbacks
SET email_status = 'sent'
WHERE email_status = 'pending';

-- Partial index used by the retry cron to efficiently find work:
--   • pending orphans (status = pending)
--   • failed rows due for retry (status = failed)
--   • stuck rows to reset (status = retrying)
CREATE INDEX IF NOT EXISTS idx_feedbacks_email_retry
  ON public.feedbacks (email_status, last_email_attempt_at NULLS FIRST, created_at)
  WHERE email_status IN ('pending', 'failed', 'retrying');

-- Grant service_role write access to the new columns (already has full access
-- via existing table grants, but being explicit is safe).
-- No additional grants needed — service_role inherits table-level permissions.

COMMIT;
