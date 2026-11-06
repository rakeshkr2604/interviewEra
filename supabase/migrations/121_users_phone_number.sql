-- 121_users_phone_number.sql
-- Adds an optional phone_number column collected during onboarding (Step 1,
-- alongside name + target role). Nullable so existing rows are unaffected and
-- the field stays soft-required like the other onboarding fields (name/role/
-- experience/resume) — never a hard DB constraint, since international phone
-- formats vary and we don't want to brick auth/account writes on bad legacy
-- data.
--
-- `users` self-service UPDATE is an explicit column allowlist, not UPDATE-all
-- (050_production_security_hardening.sql REVOKE + column GRANT). The
-- onboarding PATCH route (/api/account/onboarding) writes through the
-- user-scoped client, same as `name` / `candidate_profile` today, so
-- phone_number must be added to that GRANT or the write 42501s silently
-- (050's own "Lesson 033: RLS without GRANT" — do not repeat it here).
-- guard_users_privileged_update() is a denylist of specific privileged
-- columns (plan_tier, credits_remaining, email, ...) and does not mention
-- phone_number, so no trigger change is needed.
--
-- Rollback (manual):
--   REVOKE UPDATE (phone_number) ON public.users FROM authenticated;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS phone_number;

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

COMMENT ON COLUMN public.users.phone_number IS
  'Optional contact number collected during onboarding Step 1. No format constraint at the DB layer — validated at the API boundary (lib/validations/schemas.ts phoneNumberSchema).';

GRANT UPDATE (phone_number) ON public.users TO authenticated;

COMMIT;
