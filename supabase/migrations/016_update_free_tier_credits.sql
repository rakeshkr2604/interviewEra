-- 016_update_free_tier_credits.sql
-- Free tier reduced from 5 → 3 lifetime credits (pricing rollout, 2026-05-14).
-- Scope:
--   • Updates column default on public.users.credits_remaining.
--   • Rewrites handle_new_user() trigger to grant 3 credits to NEW signups.
--   • Preserves the display-name sanitization introduced in 012.
-- Out of scope:
--   • No UPDATE on existing rows. Existing free users are grandfathered.

BEGIN;

-- 1) New signups via direct INSERT (without specifying credits_remaining) get 3.
ALTER TABLE public.users
  ALTER COLUMN credits_remaining SET DEFAULT 3;

-- 2) Auth signup trigger — must keep the sanitize_user_display_name() call from 012.
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
    3
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Updated 2026-05-14: Free tier reduced from 5 to 3 lifetime credits. '
  'Preserves display-name sanitization from migration 012.';

COMMIT;
