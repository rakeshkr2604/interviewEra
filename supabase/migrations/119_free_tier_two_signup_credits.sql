-- 119_free_tier_two_signup_credits.sql
-- Free tier: NEW signups receive 2 lifetime mock-interview credits (was 3, migration 016).
--
-- Scope:
--   • public.users.credits_remaining column default → 2 (direct INSERTs that omit the column).
--   • handle_new_user() trigger grants 2 credits. Body otherwise identical to 016:
--     same columns, same sanitize_user_display_name() call from 012, SECURITY DEFINER,
--     search_path pinned.
--   • Re-asserts the 059 EXECUTE lockdown (CREATE OR REPLACE keeps ACLs; this is belt-and-braces).
--
-- Out of scope (grandfathering — intentional):
--   • NO UPDATE on existing rows. Existing free, paid and campus users keep their balances.
--   • No change to credit_transactions history, credit RPCs or deduction/restore lifecycle.
--
-- App-side mirror: src/lib/pricing/plans.ts FREE_PLAN.credits (used by
-- src/lib/supabase/ensure-public-user.ts fallback). Keep both in sync.
--
-- Rollback (manual): re-run the 016 function body and
--   ALTER TABLE public.users ALTER COLUMN credits_remaining SET DEFAULT 3;

BEGIN;

ALTER TABLE public.users
  ALTER COLUMN credits_remaining SET DEFAULT 2;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, plan_tier, credits_remaining)
  VALUES (
    NEW.id,
    NEW.email,
    public.sanitize_user_display_name(NEW.raw_user_meta_data->>'name'),
    'free',
    2
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Updated by 119: new Free signups receive 2 lifetime credits (existing users grandfathered). '
  'Preserves display-name sanitization from migration 012.';

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;

COMMIT;
