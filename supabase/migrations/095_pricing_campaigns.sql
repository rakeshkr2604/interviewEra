-- 095: Global pricing campaigns (site-wide sale, no coupon code)
--
-- Distinct from campaign_codes (targeted promo/sponsorship codes).
-- Validity is timestamp-based: is_active AND starts_at <= now < ends_at.
-- Expiration does not require a cron job.
-- Mutations are service-role only (admin APIs). No anon/authenticated grants.

BEGIN;

CREATE TABLE IF NOT EXISTS public.pricing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  slug TEXT NOT NULL CHECK (slug = lower(slug) AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  discount_type public.campaign_discount_type NOT NULL,
  discount_value INTEGER NOT NULL CHECK (discount_value >= 0),
  applies_to_plans TEXT[] NOT NULL DEFAULT '{}',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  display_label TEXT CHECK (display_label IS NULL OR char_length(display_label) <= 120),
  display_badge TEXT CHECK (display_badge IS NULL OR char_length(display_badge) <= 80),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pricing_campaigns_window CHECK (starts_at < ends_at),
  CONSTRAINT pricing_campaigns_percent_range CHECK (
    discount_type <> 'percent'
    OR (discount_value >= 0 AND discount_value <= 50)
  ),
  CONSTRAINT pricing_campaigns_plans CHECK (
    applies_to_plans <@ ARRAY['starter', 'pro']::TEXT[]
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_campaigns_slug
  ON public.pricing_campaigns (slug);

CREATE INDEX IF NOT EXISTS idx_pricing_campaigns_live_window
  ON public.pricing_campaigns (starts_at, ends_at)
  WHERE is_active;

ALTER TABLE public.pricing_campaigns ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.pricing_campaigns
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.pricing_campaigns TO service_role;

DROP POLICY IF EXISTS pricing_campaigns_service ON public.pricing_campaigns;
CREATE POLICY pricing_campaigns_service ON public.pricing_campaigns
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS pricing_campaign_id UUID
    REFERENCES public.pricing_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_pricing_campaign
  ON public.payments (pricing_campaign_id)
  WHERE pricing_campaign_id IS NOT NULL;

COMMIT;
