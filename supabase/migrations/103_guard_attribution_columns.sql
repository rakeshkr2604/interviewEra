-- 103_guard_attribution_columns.sql
--
-- Closes a security gap introduced in migration 100.
--
-- guard_users_privileged_update() (migration 050) uses a blocklist to prevent
-- authenticated users from writing privileged columns. Migration 100 added
-- first_touch_attribution and latest_touch_attribution to public.users but did
-- NOT add them to the blocklist, leaving them writable by authenticated callers
-- via the Supabase REST API (PATCH /users?id=eq.<own_id>).
--
-- This migration extends the guard to include the new columns so that only
-- service_role / postgres can write them, consistent with the design intent
-- documented in migration 100.
--
-- No RLS, no schema, no grant changes — only the trigger function is updated.
--
-- Rollback:
--   Re-run migration 050 to restore the previous (unguarded) version.

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
  -- Added in migration 100: attribution columns are service-role-only writes.
  IF NEW.first_touch_attribution IS DISTINCT FROM OLD.first_touch_attribution THEN
    RAISE EXCEPTION 'users.first_touch_attribution is not user-writable';
  END IF;
  IF NEW.latest_touch_attribution IS DISTINCT FROM OLD.latest_touch_attribution THEN
    RAISE EXCEPTION 'users.latest_touch_attribution is not user-writable';
  END IF;

  RETURN NEW;
END;
$$;
