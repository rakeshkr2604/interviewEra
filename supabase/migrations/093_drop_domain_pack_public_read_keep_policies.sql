-- Production follow-on to 091_domain_pack_rls_security_remediation.
--
-- 091 creates domain_packs_authenticated_select_active and
-- revokes client grants, but it does not drop leftover production catalog
-- policies:
--   Allow public read domain_packs
--   Allow public read domain_pack_questions
-- Both are PERMISSIVE SELECT TO {public} USING (true). After 091 restores
-- authenticated SELECT on domain_packs, those keep policies OR with the
-- active-only policy and inactive packs remain readable.
--
-- Refuse to drop the keep policies unless the 091 replacement policy
-- already exists. Do not rewrite 091.
--
-- Idempotent: DROP POLICY IF EXISTS.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'domain_packs'
      AND policyname = 'domain_packs_authenticated_select_active'
      AND cmd = 'SELECT'
      AND roles::text = '{authenticated}'
      AND qual = '(is_active IS TRUE)'
  ) THEN
    RAISE EXCEPTION
      'Refusing keep-policy drop: domain_packs_authenticated_select_active is absent or changed. Apply 091 first.';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Allow public read domain_packs" ON public.domain_packs;
DROP POLICY IF EXISTS "Allow public read domain_pack_questions" ON public.domain_pack_questions;
DROP POLICY IF EXISTS "public read packs" ON public.domain_packs;
DROP POLICY IF EXISTS "public read packs" ON public.domain_pack_questions;

DO $$
DECLARE
  leftover text;
BEGIN
  SELECT string_agg(format('%s.%s', tablename, policyname), ', ' ORDER BY tablename, policyname)
  INTO leftover
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('domain_packs', 'domain_pack_questions')
    AND cmd = 'SELECT'
    AND permissive = 'PERMISSIVE'
    AND qual IN ('true', '(true)')
    AND (
      roles::text = '{public}'
      OR roles::text = '{anon}'
      OR roles::text LIKE '%public%'
      OR roles::text LIKE '%anon%'
    );

  IF leftover IS NOT NULL THEN
    RAISE EXCEPTION
      'Refusing to finish: leftover public/anon USING true SELECT policy remains (%).',
      leftover;
  END IF;
END;
$$;

COMMIT;
