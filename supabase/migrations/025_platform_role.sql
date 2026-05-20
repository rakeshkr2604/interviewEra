-- ============================================================
-- Migration 025 — Platform Role
-- Apply in Supabase Dashboard → SQL Editor
-- ============================================================
--
-- Adds a `platform_role` column to users so platform-admin access
-- is stored in the database rather than relying solely on ADMIN_EMAILS.
--
-- Values:
--   NULL        — regular user (default)
--   'admin'     — InterviewEra founder / platform administrator
--
-- Kept as TEXT (not enum) so future values can be added without
-- an ALTER TYPE migration.
--
-- Auth logic (platform layout):
--   EITHER platform_role = 'admin' in DB
--   OR     email matches ADMIN_EMAILS env var   (migration path)
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS platform_role text DEFAULT NULL;

-- Only allow valid values going forward.
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_platform_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_platform_role_check
    CHECK (platform_role IS NULL OR platform_role = 'admin');

-- Index: fast lookup for the platform layout auth check.
CREATE INDEX IF NOT EXISTS idx_users_platform_role
  ON public.users (platform_role)
  WHERE platform_role IS NOT NULL;

-- RLS: users cannot read or write their own platform_role.
-- Only service_role can set/clear it.
-- (The existing users RLS policy grants users SELECT on their own row,
--  but platform_role will just be a visible NULL — that is acceptable.)

-- ── Seed: promote the founder account ─────────────────────────────────────────
-- Replace the email below with your actual admin email before running.
-- Comment this out if you prefer to set roles via the Dashboard UI.
--
-- UPDATE public.users
--   SET platform_role = 'admin'
-- WHERE email = 'rakesh.kr2604@gmail.com';
