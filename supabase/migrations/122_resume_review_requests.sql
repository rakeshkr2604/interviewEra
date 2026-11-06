-- 122_resume_review_requests.sql
--
-- Paid-tier perk: a human resume-review session request, surfaced from the
-- dashboard profile menu. Allowance is per billing cycle (cycle_start =
-- users.plan_started_at at request time, snapshotted so a later renewal
-- doesn't retroactively change what an already-counted request belonged to):
--   starter -> 1 request/cycle, pro -> 2 requests/cycle (see
--   RESUME_REVIEW_ALLOWANCE in src/lib/resume-review/plan.ts).
--
-- Reads/writes: service-role only, same pattern as
-- 110_interview_diagnostic_events.sql. The user-facing API
-- (/api/resume-review) enforces ownership + quota in code before writing;
-- the admin funnel API (/api/admin/resume-reviews) is the fulfillment queue.
-- No direct authenticated RLS policy — avoids a client ever racing the quota
-- check (INSERT must go through the server's count-then-insert logic).
--
-- Rollback (manual):
--   DROP TRIGGER IF EXISTS trg_enforce_resume_review_quota ON public.resume_review_requests;
--   DROP FUNCTION IF EXISTS public.enforce_resume_review_quota();
--   DROP TABLE IF EXISTS public.resume_review_requests;

BEGIN;

CREATE TABLE IF NOT EXISTS public.resume_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  -- Snapshot at request time — survives later plan changes/expiry so history stays accurate.
  plan_tier TEXT NOT NULL
    CHECK (plan_tier IN ('starter', 'pro')),
  cycle_start TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  notes TEXT
    CHECK (notes IS NULL OR char_length(notes) <= 2000),
  admin_notes TEXT
    CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 4000),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_review_requests_user_cycle
  ON public.resume_review_requests (user_id, cycle_start);

CREATE INDEX IF NOT EXISTS idx_resume_review_requests_status_created
  ON public.resume_review_requests (status, created_at DESC);

COMMENT ON TABLE public.resume_review_requests IS
  'Starter (1) / Pro (2) human resume-review session requests per billing cycle. Service-role only; see /api/resume-review and /api/admin/resume-reviews.';

-- Defense-in-depth quota guard. The API route already checks allowance before
-- inserting, but that check-then-insert has a race window under concurrent
-- requests (double-click, two tabs); the advisory lock serializes inserts
-- per user so two concurrent requests can't both pass the count check before
-- either commits.
CREATE OR REPLACE FUNCTION public.enforce_resume_review_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowance INTEGER;
  used_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text)::bigint);

  allowance := CASE NEW.plan_tier WHEN 'starter' THEN 1 WHEN 'pro' THEN 2 ELSE 0 END;

  SELECT COUNT(*) INTO used_count
  FROM public.resume_review_requests
  WHERE user_id = NEW.user_id
    AND cycle_start = NEW.cycle_start
    AND status <> 'cancelled';

  IF used_count >= allowance THEN
    RAISE EXCEPTION 'resume_review_quota_exceeded' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_resume_review_quota ON public.resume_review_requests;
CREATE TRIGGER trg_enforce_resume_review_quota
  BEFORE INSERT ON public.resume_review_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_resume_review_quota();

ALTER TABLE public.resume_review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resume_review_requests_service_role ON public.resume_review_requests;
CREATE POLICY resume_review_requests_service_role
  ON public.resume_review_requests
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON public.resume_review_requests FROM PUBLIC;
REVOKE ALL ON public.resume_review_requests FROM anon;
REVOKE ALL ON public.resume_review_requests FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.resume_review_requests TO service_role;

COMMIT;
