-- 097: Global pricing campaign overlap exclusion + RLS initplan
--
-- Follow-on to 095. Do not rewrite 095.
-- 1. Evaluate auth.role() once per statement (InitPlan), matching 057/067.
-- 2. Prevent two is_active campaigns from overlapping on [starts_at, ends_at).

BEGIN;

DROP POLICY IF EXISTS pricing_campaigns_service ON public.pricing_campaigns;
CREATE POLICY pricing_campaigns_service ON public.pricing_campaigns
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

ALTER TABLE public.pricing_campaigns
  DROP CONSTRAINT IF EXISTS pricing_campaigns_no_overlap_active;

ALTER TABLE public.pricing_campaigns
  ADD CONSTRAINT pricing_campaigns_no_overlap_active
  EXCLUDE USING gist (
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (is_active);

COMMIT;
