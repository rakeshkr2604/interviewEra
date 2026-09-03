-- 100_user_attribution.sql
-- Persist first-touch and latest-touch marketing attribution on the application
-- user row. Both columns are nullable JSONB; service-role writes only.
--
-- Security:
--   - No new RLS policies required: existing users_select_own / users_update_own
--     cover read; writes go through service-role (guard_users_privileged_update
--     passes for service_role/postgres).
--   - These columns are NOT added to the authenticated GRANT UPDATE allowlist —
--     they remain inaccessible to the authenticated role for UPDATE.
--   - No effect on payment, credit, or campaign authority.
--
-- Rollback:
--   ALTER TABLE public.users DROP COLUMN IF EXISTS first_touch_attribution;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS latest_touch_attribution;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_touch_attribution JSONB,
  ADD COLUMN IF NOT EXISTS latest_touch_attribution JSONB;

COMMENT ON COLUMN public.users.first_touch_attribution IS
  'First marketing attribution snapshot at signup. Immutable once set. Service-role write only.';

COMMENT ON COLUMN public.users.latest_touch_attribution IS
  'Most recent marketing attribution at authentication time. Service-role write only.';
