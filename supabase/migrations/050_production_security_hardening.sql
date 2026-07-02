-- Production security hardening (Phase 5 final)
-- 1. Campus org verification gate (no auto campus_admin without approval)
-- 2. users table: column-restricted UPDATE + privileged-column trigger
-- 3. Credit RPCs: service_role EXECUTE only
-- 4. credit_transactions: revoke authenticated INSERT
--
-- Rollback (manual):
--   DROP TRIGGER IF EXISTS trg_guard_users_privileged_update ON public.users;
--   DROP FUNCTION IF EXISTS public.guard_users_privileged_update();
--   GRANT UPDATE ON public.users TO authenticated;
--   REVOKE UPDATE (...) ON public.users FROM authenticated;
--   GRANT EXECUTE ON FUNCTION public.deduct_credit(uuid) TO authenticated;
--   (repeat for add_credit, refund_credit)
--   GRANT INSERT ON public.credit_transactions TO authenticated;
--   ALTER TABLE public.campus_organizations DROP COLUMN IF EXISTS verification_status;

BEGIN;

-- ── 1. Campus organization verification ─────────────────────────────────────

ALTER TABLE public.campus_organizations
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE public.campus_organizations
  DROP CONSTRAINT IF EXISTS campus_organizations_verification_status_check;

ALTER TABLE public.campus_organizations
  ADD CONSTRAINT campus_organizations_verification_status_check
  CHECK (verification_status IN ('pending', 'approved'));

-- Existing workspaces were provisioned before this gate — treat as approved.
UPDATE public.campus_organizations
SET verification_status = 'approved'
WHERE verification_status IS DISTINCT FROM 'approved';

CREATE INDEX IF NOT EXISTS idx_campus_organizations_verification_status
  ON public.campus_organizations (verification_status)
  WHERE verification_status = 'pending';

COMMENT ON COLUMN public.campus_organizations.verification_status IS
  'pending = awaiting sales/platform approval; approved = campus_admin may be granted.';

-- ── 2. users: restrict self-service UPDATE to safe profile columns ───────────

REVOKE UPDATE ON public.users FROM authenticated;

GRANT UPDATE (
  name,
  avatar_path,
  notification_preferences,
  email_digest_unsubscribed,
  onboarding_draft,
  candidate_profile
) ON public.users TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_users_privileged_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT := coalesce(current_setting('request.jwt.claim.role', true), '');
BEGIN
  -- service_role / postgres bypass (server-side billing, admin, triggers)
  IF jwt_role = 'service_role' OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
    RAISE EXCEPTION 'users.plan_tier is not user-writable';
  END IF;
  IF NEW.credits_remaining IS DISTINCT FROM OLD.credits_remaining THEN
    RAISE EXCEPTION 'users.credits_remaining is not user-writable';
  END IF;
  IF NEW.platform_role IS DISTINCT FROM OLD.platform_role THEN
    RAISE EXCEPTION 'users.platform_role is not user-writable';
  END IF;
  IF NEW.campus_org_id IS DISTINCT FROM OLD.campus_org_id THEN
    RAISE EXCEPTION 'users.campus_org_id is not user-writable';
  END IF;
  IF NEW.plan_status IS DISTINCT FROM OLD.plan_status THEN
    RAISE EXCEPTION 'users.plan_status is not user-writable';
  END IF;
  IF NEW.plan_started_at IS DISTINCT FROM OLD.plan_started_at THEN
    RAISE EXCEPTION 'users.plan_started_at is not user-writable';
  END IF;
  IF NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at THEN
    RAISE EXCEPTION 'users.plan_expires_at is not user-writable';
  END IF;
  IF NEW.last_payment_id IS DISTINCT FROM OLD.last_payment_id THEN
    RAISE EXCEPTION 'users.last_payment_id is not user-writable';
  END IF;
  IF NEW.last_order_id IS DISTINCT FROM OLD.last_order_id THEN
    RAISE EXCEPTION 'users.last_order_id is not user-writable';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'users.email is not user-writable';
  END IF;
  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'users.referral_code is not user-writable';
  END IF;
  IF NEW.placement_date IS DISTINCT FROM OLD.placement_date THEN
    RAISE EXCEPTION 'users.placement_date is not user-writable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_users_privileged_update ON public.users;
CREATE TRIGGER trg_guard_users_privileged_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_users_privileged_update();

-- ── 3. Credit RPCs: service_role only ────────────────────────────────────────

REVOKE ALL ON FUNCTION public.deduct_credit(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_credit(UUID, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_credit(UUID) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.deduct_credit(UUID) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.add_credit(UUID, INTEGER, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_credit(UUID) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.deduct_credit(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_credit(UUID, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credit(UUID) TO service_role;

-- ── 4. credit_transactions: audit rows only via service_role / RPC ───────────

REVOKE INSERT ON public.credit_transactions FROM authenticated;

DROP POLICY IF EXISTS "credit_transactions_insert_own" ON public.credit_transactions;

COMMIT;
