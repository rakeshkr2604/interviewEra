-- Domain packs: authenticated catalogue read for active packs only.
-- Domain pack questions: service-role only (rubric / evaluation IP).
--
-- Access model (staging remediation):
--   domain_packs            -> authenticated SELECT WHERE is_active IS TRUE
--                           -> service_role SELECT/INSERT/UPDATE
--   domain_pack_questions   -> no client policies / grants
--                           -> service_role SELECT/INSERT/UPDATE
--
-- Do not create a USING (true) policy. Inactive packs must remain unreadable to clients.

BEGIN;

REVOKE ALL ON TABLE
  public.domain_packs,
  public.domain_pack_questions
FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.domain_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_pack_questions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.domain_packs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.domain_packs TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.domain_pack_questions TO service_role;

DROP POLICY IF EXISTS domain_packs_authenticated_select_active ON public.domain_packs;

CREATE POLICY domain_packs_authenticated_select_active
  ON public.domain_packs
  FOR SELECT
  TO authenticated
  USING (is_active IS TRUE);

COMMIT;
