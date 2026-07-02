-- Campus Workspace completion: invite lifecycle + enrollment sync trigger
BEGIN;

-- ── Invite expiry and extended statuses ─────────────────────────────────────

ALTER TABLE public.campus_invites
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.campus_invites
SET expires_at = invited_at + INTERVAL '7 days'
WHERE expires_at IS NULL;

ALTER TABLE public.campus_invites
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '7 days');

ALTER TABLE public.campus_invites
  DROP CONSTRAINT IF EXISTS campus_invites_status_check;

ALTER TABLE public.campus_invites
  ADD CONSTRAINT campus_invites_status_check
  CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'));

CREATE INDEX IF NOT EXISTS idx_campus_invites_expires_at
  ON public.campus_invites (expires_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_campus_invites_org_status
  ON public.campus_invites (org_id, status);

-- ── Keep enrollment snapshots in sync with user_progress ────────────────────

CREATE OR REPLACE FUNCTION public.sync_college_enrollment_from_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE college_enrollments ce
  SET
    total_sessions = NEW.total_sessions,
    avg_score = NEW.overall_avg_score,
    current_tier = COALESCE(NEW.current_tier, 1),
    placement_ready = COALESCE(NEW.current_tier, 1) >= 3
  FROM users u
  WHERE ce.user_id = NEW.user_id
    AND u.id = NEW.user_id
    AND u.campus_org_id IS NOT NULL
    AND ce.college_id = u.campus_org_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_college_enrollment_from_progress ON user_progress;
CREATE TRIGGER trg_sync_college_enrollment_from_progress
  AFTER INSERT OR UPDATE OF total_sessions, overall_avg_score, current_tier
  ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_college_enrollment_from_progress();

-- Backfill enrollment snapshots from live progress
UPDATE college_enrollments ce
SET
  total_sessions = up.total_sessions,
  avg_score = up.overall_avg_score,
  current_tier = COALESCE(up.current_tier, 1),
  placement_ready = COALESCE(up.current_tier, 1) >= 3
FROM user_progress up
WHERE ce.user_id = up.user_id;

COMMIT;
