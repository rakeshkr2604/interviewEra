-- ─── Migration 005: Campus Organizations + Invites ────────────────────────────
-- Adds campus_admin plan tier value, campus_organizations table,
-- campus_invites table, and campus_org_id column on users.
-- Also adds RLS policies so campus_admin can read their org's student data.

-- ── 0. plan_tier enum (001 normally creates it; guard repairs partial / remote DBs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_type t
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'plan_tier'
  ) THEN
    CREATE TYPE public.plan_tier AS ENUM ('free', 'starter', 'pro', 'campus');
  END IF;
END $$;

ALTER TYPE public.plan_tier ADD VALUE IF NOT EXISTS 'campus_admin';

-- ── 1. Add campus_org_id to users ─────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS campus_org_id uuid;

-- ── 2. Create campus_organizations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campus_organizations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text        NOT NULL,
  admin_user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  seat_count          integer     NOT NULL DEFAULT 50,
  plan_start          date,
  plan_end            date,
  razorpay_payment_id text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campus_organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campus_admin read own org" ON public.campus_organizations;
CREATE POLICY "campus_admin read own org"
  ON public.campus_organizations
  FOR SELECT
  USING (admin_user_id = auth.uid());

-- ── 3. Add FK from users.campus_org_id → campus_organizations ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_campus_org_id_fkey'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_campus_org_id_fkey
      FOREIGN KEY (campus_org_id)
      REFERENCES public.campus_organizations(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ── 4. Create campus_invites ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campus_invites (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid        NOT NULL REFERENCES public.campus_organizations(id) ON DELETE CASCADE,
  email        text        NOT NULL,
  token        text        UNIQUE NOT NULL DEFAULT (
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  ),
  status       text        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'accepted')),
  invited_at   timestamptz NOT NULL DEFAULT now(),
  accepted_at  timestamptz
);

ALTER TABLE public.campus_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campus_admin manage invites" ON public.campus_invites;
CREATE POLICY "campus_admin manage invites"
  ON public.campus_invites
  FOR ALL
  USING (
    org_id IN (
      SELECT id FROM public.campus_organizations
      WHERE admin_user_id = auth.uid()
    )
  );

-- ── 5. RLS policies: campus_admin reads student interviews ─────────────────────
DROP POLICY IF EXISTS "campus_admin read org interviews" ON public.interviews;
CREATE POLICY "campus_admin read org interviews"
  ON public.interviews
  FOR SELECT
  USING (
    user_id IN (
      SELECT u.id
      FROM   public.users u
      JOIN   public.campus_organizations co ON u.campus_org_id = co.id
      WHERE  co.admin_user_id = auth.uid()
    )
  );

-- ── 6. RLS policies: campus_admin reads student reports ───────────────────────
DROP POLICY IF EXISTS "campus_admin read org reports" ON public.reports;
CREATE POLICY "campus_admin read org reports"
  ON public.reports
  FOR SELECT
  USING (
    interview_id IN (
      SELECT i.id
      FROM   public.interviews i
      JOIN   public.users u ON i.user_id = u.id
      JOIN   public.campus_organizations co ON u.campus_org_id = co.id
      WHERE  co.admin_user_id = auth.uid()
    )
  );

-- ── 7. Index for campus_org_id lookups ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_campus_org_id
  ON public.users(campus_org_id);

-- ── 8. Grants ────────────────────────────────────────────────────────────────
-- authenticated needs SELECT on campus_organizations because RLS policies on
-- interviews/reports join through it — Postgres evaluates all policies even for
-- non-campus users.
GRANT SELECT ON campus_organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campus_invites TO authenticated;
GRANT ALL ON campus_organizations, campus_invites TO service_role;
