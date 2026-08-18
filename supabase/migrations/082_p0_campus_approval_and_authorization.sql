-- InterviewEra P0 authorization remediation
-- 1. Founder/platform-admin campus review state machine + immutable audit trail
-- 2. Approved-campus enforcement in campus RLS
-- 3. Authenticated SELECT-only access to authoritative interview/financial state
-- 4. Preserve users signup INSERT and six-column profile UPDATE allowlist
--
-- Application deployment dependency:
--   Deploy the matching founder approval API/UI and campus service-role guards
--   with this migration. Service-role bypasses RLS, so database policies alone
--   do not protect service-backed routes.
--
-- Rollback (manual, intentionally not automatic):
--   Restore the prior operation policies/grants from migrations 001/005/018/057
--   only after identifying the exact required client writer. Do not restore the
--   production-only broad "user owns ..." FOR ALL policies.

BEGIN;

-- ── Campus review state and audit trail ──────────────────────────────────────

ALTER TABLE public.campus_organizations
  DROP CONSTRAINT IF EXISTS campus_organizations_verification_status_check;

ALTER TABLE public.campus_organizations
  ADD CONSTRAINT campus_organizations_verification_status_check
  CHECK (verification_status IN ('pending', 'approved', 'rejected'));

CREATE TABLE IF NOT EXISTS public.campus_organization_review_events (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id              uuid NOT NULL
    REFERENCES public.campus_organizations(id) ON DELETE RESTRICT,
  actor_user_id                 uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE RESTRICT,
  action                        text NOT NULL
    CHECK (action IN ('approved', 'rejected')),
  previous_verification_status  text NOT NULL,
  new_verification_status       text NOT NULL,
  previous_plan_tier            text,
  new_plan_tier                 text,
  reason                        text,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campus_review_reason_length
    CHECK (
      reason IS NULL
      OR (
        char_length(reason) BETWEEN 3 AND 500
        AND reason !~ '[<>]'
      )
    ),
  CONSTRAINT campus_review_transition
    CHECK (
      previous_verification_status = 'pending'
      AND new_verification_status = action
    )
);

ALTER TABLE public.campus_organization_review_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.campus_organization_review_events
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.campus_organization_review_events TO service_role;

DROP POLICY IF EXISTS "campus_review_events_service_role_full"
  ON public.campus_organization_review_events;
DROP POLICY IF EXISTS "campus_review_events_service_role_select"
  ON public.campus_organization_review_events;
DROP POLICY IF EXISTS "campus_review_events_service_role_insert"
  ON public.campus_organization_review_events;

CREATE POLICY "campus_review_events_service_role_select"
  ON public.campus_organization_review_events
  FOR SELECT TO service_role
  USING (true);

CREATE POLICY "campus_review_events_service_role_insert"
  ON public.campus_organization_review_events
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.reject_campus_review_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Campus organization review events are immutable'
    USING ERRCODE = '55000';
END;
$$;

REVOKE ALL ON FUNCTION public.reject_campus_review_event_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_reject_campus_review_event_mutation
  ON public.campus_organization_review_events;
CREATE TRIGGER trg_reject_campus_review_event_mutation
  BEFORE UPDATE OR DELETE ON public.campus_organization_review_events
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_campus_review_event_mutation();

CREATE OR REPLACE FUNCTION public.review_campus_organization(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org public.campus_organizations%ROWTYPE;
  v_previous_plan_tier text;
  v_new_plan_tier text;
  v_reason text := NULLIF(btrim(p_reason), '');
BEGIN
  IF p_action NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_campus_review_action';
  END IF;

  IF p_action = 'rejected'
     AND (
       v_reason IS NULL
       OR char_length(v_reason) < 3
       OR char_length(v_reason) > 500
       OR v_reason ~ '[<>]'
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'campus_rejection_reason_required';
  END IF;

  SELECT *
  INTO v_org
  FROM public.campus_organizations
  WHERE id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'campus_organization_not_found';
  END IF;

  IF v_org.verification_status <> 'pending' THEN
    RAISE EXCEPTION USING
      ERRCODE = '40001',
      MESSAGE = 'campus_organization_not_pending';
  END IF;

  IF v_org.admin_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23502',
      MESSAGE = 'campus_organization_admin_missing';
  END IF;

  SELECT plan_tier::text
  INTO v_previous_plan_tier
  FROM public.users
  WHERE id = v_org.admin_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'campus_organization_admin_profile_not_found';
  END IF;

  UPDATE public.campus_organizations
  SET verification_status = p_action
  WHERE id = v_org.id
    AND verification_status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '40001',
      MESSAGE = 'campus_organization_not_pending';
  END IF;

  IF p_action = 'approved' THEN
    UPDATE public.users
    SET plan_tier = 'campus_admin'
    WHERE id = v_org.admin_user_id;
    v_new_plan_tier := 'campus_admin';
  ELSE
    v_new_plan_tier := v_previous_plan_tier;
  END IF;

  INSERT INTO public.campus_organization_review_events (
    organization_id,
    actor_user_id,
    action,
    previous_verification_status,
    new_verification_status,
    previous_plan_tier,
    new_plan_tier,
    reason
  )
  VALUES (
    v_org.id,
    p_actor_user_id,
    p_action,
    v_org.verification_status,
    p_action,
    v_previous_plan_tier,
    v_new_plan_tier,
    v_reason
  );

  RETURN jsonb_build_object(
    'organization_id', v_org.id,
    'verification_status', p_action,
    'admin_user_id', v_org.admin_user_id,
    'previous_plan_tier', v_previous_plan_tier,
    'new_plan_tier', v_new_plan_tier
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_campus_organization(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_campus_organization(uuid, uuid, text, text)
  TO service_role;

-- ── Approved-campus RLS ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "campus_admin manage invites" ON public.campus_invites;
CREATE POLICY "campus_admin manage invites"
  ON public.campus_invites
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campus_organizations co
      WHERE co.id = campus_invites.org_id
        AND co.admin_user_id = (SELECT auth.uid())
        AND co.verification_status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.campus_organizations co
      WHERE co.id = campus_invites.org_id
        AND co.admin_user_id = (SELECT auth.uid())
        AND co.verification_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "campus_admin_manage_deadlines" ON public.college_deadlines;
CREATE POLICY "campus_admin_manage_deadlines"
  ON public.college_deadlines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campus_organizations co
      WHERE co.id = college_deadlines.college_id
        AND co.admin_user_id = (SELECT auth.uid())
        AND co.verification_status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.campus_organizations co
      WHERE co.id = college_deadlines.college_id
        AND co.admin_user_id = (SELECT auth.uid())
        AND co.verification_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "campus_admin_manage_enrollments" ON public.college_enrollments;
DROP POLICY IF EXISTS "campus_admin_read_enrollments" ON public.college_enrollments;
CREATE POLICY "campus_admin_read_enrollments"
  ON public.college_enrollments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campus_organizations co
      WHERE co.id = college_enrollments.college_id
        AND co.admin_user_id = (SELECT auth.uid())
        AND co.verification_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "campus_admin read org interviews" ON public.interviews;
CREATE POLICY "campus_admin read org interviews"
  ON public.interviews
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.campus_organizations co ON co.id = u.campus_org_id
      WHERE u.id = interviews.user_id
        AND co.admin_user_id = (SELECT auth.uid())
        AND co.verification_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "campus_admin read org reports" ON public.reports;
CREATE POLICY "campus_admin read org reports"
  ON public.reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.interviews i
      JOIN public.users u ON u.id = i.user_id
      JOIN public.campus_organizations co ON co.id = u.campus_org_id
      WHERE i.id = reports.interview_id
        AND co.admin_user_id = (SELECT auth.uid())
        AND co.verification_status = 'approved'
    )
  );

-- ── Authoritative tables: authenticated SELECT only ─────────────────────────

-- Remove production-only broad ownership policies.
DROP POLICY IF EXISTS "user owns answers" ON public.answers;
DROP POLICY IF EXISTS "user owns evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "user owns reports" ON public.reports;
DROP POLICY IF EXISTS "user owns credits" ON public.credit_transactions;
DROP POLICY IF EXISTS "user owns subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "user owns questions" ON public.questions;
DROP POLICY IF EXISTS "user owns interviews" ON public.interviews;

-- Remove canonical client mutation policies. Existing owner SELECT policies stay.
DROP POLICY IF EXISTS "answers_insert_own" ON public.answers;
DROP POLICY IF EXISTS "evaluations_insert_own" ON public.evaluations;
DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
DROP POLICY IF EXISTS "subscriptions_insert_own" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_own" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
DROP POLICY IF EXISTS "questions_insert_own" ON public.questions;
DROP POLICY IF EXISTS "questions_delete_own" ON public.questions;
DROP POLICY IF EXISTS "interviews_insert_own" ON public.interviews;
DROP POLICY IF EXISTS "interviews_update_own" ON public.interviews;
DROP POLICY IF EXISTS "interviews_delete_own" ON public.interviews;

REVOKE INSERT, UPDATE, DELETE ON public.answers FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.evaluations FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.reports FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.questions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.interviews FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.credit_transactions FROM authenticated;

-- ── users: preserve signup/profile behavior, remove direct DELETE ─────────────

DROP POLICY IF EXISTS "user can access own profile" ON public.users;

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- users_select_own and users_update_own remain. Migration 050's six-column
-- authenticated UPDATE grant remains exactly unchanged.
REVOKE DELETE ON public.users FROM authenticated;

COMMIT;
