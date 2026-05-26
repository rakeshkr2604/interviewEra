-- Migration 031: Feedback triage columns for the founder dashboard.
--
-- Adds workflow-state columns that let the founder triage submissions:
--   is_read       — has the founder seen this item
--   is_resolved   — issue is fixed / response sent
--   is_archived   — soft-delete from inbox (never permanently deleted)
--   is_pinned     — keeps the item at the top of the list
--   notes         — private founder-only notes (not visible to users)
--   assigned_to   — future: email of the team member owning this issue
--
-- Backfill: all rows that pre-date this migration were received by email and
-- are presumed read. New rows start as is_read = false (the API sets the
-- default at insert time, but DEFAULT false covers direct DB writes).

BEGIN;

ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS is_read     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pinned   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes       TEXT
    CHECK (notes IS NULL OR char_length(notes) <= 5000),
  ADD COLUMN IF NOT EXISTS assigned_to TEXT
    CHECK (assigned_to IS NULL OR char_length(assigned_to) <= 200);

-- Pre-existing rows were received via email — mark as already read.
UPDATE public.feedbacks
SET is_read = true
WHERE is_read = false;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

-- Fast unread count badge and "unread only" filter.
CREATE INDEX IF NOT EXISTS idx_feedbacks_unread
  ON public.feedbacks (created_at DESC)
  WHERE is_read = false AND is_archived = false;

-- Fast unresolved count badge and "unresolved only" filter.
CREATE INDEX IF NOT EXISTS idx_feedbacks_unresolved
  ON public.feedbacks (created_at DESC)
  WHERE is_resolved = false AND is_archived = false;

-- Pinned items bubble to the top.
CREATE INDEX IF NOT EXISTS idx_feedbacks_pinned
  ON public.feedbacks (created_at DESC)
  WHERE is_pinned = true AND is_archived = false;

-- Archived inbox: separate section.
CREATE INDEX IF NOT EXISTS idx_feedbacks_archived
  ON public.feedbacks (created_at DESC)
  WHERE is_archived = true;

-- Severity triage: quick scan for critical + high across active items.
CREATE INDEX IF NOT EXISTS idx_feedbacks_severity_active
  ON public.feedbacks (severity, created_at DESC)
  WHERE is_archived = false;

COMMENT ON COLUMN public.feedbacks.is_read     IS 'Founder has opened / acknowledged this submission.';
COMMENT ON COLUMN public.feedbacks.is_resolved IS 'Issue addressed or response sent to the user.';
COMMENT ON COLUMN public.feedbacks.is_archived IS 'Soft-deleted from inbox; still queryable for analytics.';
COMMENT ON COLUMN public.feedbacks.is_pinned   IS 'Pinned items sort to the top of the dashboard list.';
COMMENT ON COLUMN public.feedbacks.notes       IS 'Private founder notes — never exposed to the submitting user.';
COMMENT ON COLUMN public.feedbacks.assigned_to IS 'Future: email of the team member assigned to this issue.';

COMMIT;
