-- 104_standardize_campaign_operations.sql
--
-- Standardize Global Offers / Campaign Management lifecycle, plan-aware overlap,
-- audit history, and marketing tracking links.
--
-- Key enhancements:
--   1. Drop table-wide UNIQUE on pricing_campaigns(slug) so display names can be
--      reused across campaign instances.
--   2. Add explicit status column: ('draft', 'scheduled', 'active', 'paused', 'ended', 'archived').
--   3. Add parent_campaign_id for continued/restarted campaign lineage.
--   4. Backfill existing campaigns: past-ended campaigns set to 'ended' + is_active=false.
--   5. Enforce status/is_active invariant via CHECK constraint.
--   6. Replace coarse GiST exclusion with a plan-aware overlap trigger that allows
--      Starter and Pro offers to run in parallel while forbidding conflicting offers.
--   7. Create public.campaign_audit_logs for financial and operational traceability.
--      Uses ON DELETE SET NULL + stores campaign_name so audit records are preserved forever.
--   8. Create public.marketing_tracking_links for Meta Ads & multi-channel UTM tracking.
--   9. Grant DELETE permission on pricing_campaigns to service_role (safe delete support).

BEGIN;

-- ── 1. Update pricing_campaigns schema ────────────────────────────────────────

ALTER TABLE public.pricing_campaigns
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'ended', 'archived')),
  ADD COLUMN IF NOT EXISTS parent_campaign_id UUID REFERENCES public.pricing_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Drop unique constraint on slug to allow reusable campaign display names
DROP INDEX IF EXISTS public.idx_pricing_campaigns_slug;
CREATE INDEX IF NOT EXISTS idx_pricing_campaigns_slug ON public.pricing_campaigns (slug);

-- Index on status and dates for operational filtering
CREATE INDEX IF NOT EXISTS idx_pricing_campaigns_status_dates
  ON public.pricing_campaigns (status, starts_at, ends_at);

-- Grant DELETE to service_role (was omitted in migration 095)
GRANT DELETE ON TABLE public.pricing_campaigns TO service_role;

-- ── 2. Backfill existing campaigns ───────────────────────────────────────────

UPDATE public.pricing_campaigns
SET
  status = CASE
    WHEN ends_at <= clock_timestamp() THEN 'ended'
    WHEN is_active IS TRUE AND starts_at <= clock_timestamp() AND ends_at > clock_timestamp() THEN 'active'
    WHEN is_active IS TRUE AND starts_at > clock_timestamp() THEN 'scheduled'
    ELSE 'draft'
  END,
  is_active = CASE
    WHEN ends_at <= clock_timestamp() THEN FALSE
    ELSE is_active
  END;

-- Enforce strict status <-> is_active consistency invariant
ALTER TABLE public.pricing_campaigns
  DROP CONSTRAINT IF EXISTS pricing_campaigns_status_active_consistency;

ALTER TABLE public.pricing_campaigns
  ADD CONSTRAINT pricing_campaigns_status_active_consistency CHECK (
    (status = 'active' AND is_active = TRUE)
    OR (status = 'scheduled' AND is_active = TRUE)
    OR (status IN ('draft', 'paused', 'ended', 'archived') AND is_active = FALSE)
  );

-- ── 3. Plan-Aware Overlap Guard ──────────────────────────────────────────────

-- Drop coarse exclusion constraint from 097
ALTER TABLE public.pricing_campaigns
  DROP CONSTRAINT IF EXISTS pricing_campaigns_no_overlap_active;

CREATE OR REPLACE FUNCTION public.guard_pricing_campaign_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict RECORD;
  v_plans_new TEXT[];
BEGIN
  -- Normalize plans (empty array means applies to both starter and pro)
  IF NEW.applies_to_plans IS NULL OR array_length(NEW.applies_to_plans, 1) IS NULL THEN
    v_plans_new := ARRAY['starter', 'pro']::TEXT[];
  ELSE
    v_plans_new := NEW.applies_to_plans;
  END IF;

  -- Only enforce overlap constraint when campaign is marked active or scheduled
  IF NEW.is_active IS TRUE AND NEW.status IN ('active', 'scheduled') THEN
    IF NEW.ends_at <= NEW.starts_at THEN
      RAISE EXCEPTION 'Campaign end must be after its start'
        USING ERRCODE = '22007';
    END IF;

    -- Check for conflicts against other active or scheduled campaigns
    SELECT id, name, starts_at, ends_at, applies_to_plans
    INTO v_conflict
    FROM public.pricing_campaigns
    WHERE id <> NEW.id
      AND is_active IS TRUE
      AND status IN ('active', 'scheduled')
      AND ends_at > clock_timestamp()
      AND tstzrange(starts_at, ends_at, '[)') && tstzrange(NEW.starts_at, NEW.ends_at, '[)')
      AND (
        applies_to_plans IS NULL
        OR array_length(applies_to_plans, 1) IS NULL
        OR applies_to_plans && v_plans_new
      )
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'Active campaign window overlaps existing campaign "%" (% to %)',
        v_conflict.name, v_conflict.starts_at, v_conflict.ends_at
        USING ERRCODE = '23P01';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_pricing_campaign_overlap ON public.pricing_campaigns;
CREATE TRIGGER trg_guard_pricing_campaign_overlap
  BEFORE INSERT OR UPDATE ON public.pricing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_pricing_campaign_overlap();

-- ── 4. Audit Logging Table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaign_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.pricing_campaigns(id) ON DELETE SET NULL,
  campaign_name TEXT NOT NULL,
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_audit_logs_campaign
  ON public.campaign_audit_logs (campaign_id, created_at DESC);

ALTER TABLE public.campaign_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.campaign_audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.campaign_audit_logs TO service_role;

DROP POLICY IF EXISTS campaign_audit_logs_service ON public.campaign_audit_logs;
CREATE POLICY campaign_audit_logs_service ON public.campaign_audit_logs
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ── 5. Marketing Tracking Links Table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.marketing_tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  channel TEXT NOT NULL DEFAULT 'meta' CHECK (channel IN ('meta', 'google', 'creator', 'linkedin', 'twitter', 'email', 'custom')),
  pricing_campaign_id UUID REFERENCES public.pricing_campaigns(id) ON DELETE SET NULL,
  utm_source TEXT NOT NULL CHECK (char_length(btrim(utm_source)) BETWEEN 1 AND 128),
  utm_medium TEXT NOT NULL CHECK (char_length(btrim(utm_medium)) BETWEEN 1 AND 128),
  utm_campaign TEXT NOT NULL CHECK (char_length(btrim(utm_campaign)) BETWEEN 1 AND 128),
  utm_content TEXT CHECK (utm_content IS NULL OR char_length(utm_content) <= 128),
  utm_term TEXT CHECK (utm_term IS NULL OR char_length(utm_term) <= 128),
  platform_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  creator_id TEXT CHECK (creator_id IS NULL OR char_length(creator_id) <= 64),
  destination_path TEXT NOT NULL DEFAULT '/',
  full_url TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_tracking_links_campaign
  ON public.marketing_tracking_links (pricing_campaign_id)
  WHERE pricing_campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_tracking_links_utms
  ON public.marketing_tracking_links (utm_source, utm_medium, utm_campaign);

ALTER TABLE public.marketing_tracking_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.marketing_tracking_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.marketing_tracking_links TO service_role;

DROP POLICY IF EXISTS marketing_tracking_links_service ON public.marketing_tracking_links;
CREATE POLICY marketing_tracking_links_service ON public.marketing_tracking_links
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

COMMIT;
