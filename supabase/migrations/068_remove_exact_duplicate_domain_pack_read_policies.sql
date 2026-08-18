-- 068: Remove two exact duplicate public catalogue read policies.
--
-- Production evidence showed two permissive SELECT USING (true) policies on
-- each domain pack table. PostgreSQL OR-combines them, so retaining one
-- preserves the same public read access while avoiding duplicate evaluation.
--
-- Repository history: migration 004 creates the tables and GRANT SELECT only
-- ("No RLS needed") and never creates these policy names. The retained /
-- duplicate policy pair is a production-catalog artifact, not a fresh-chain
-- object. On a clean replay both policies are absent — treat that as a no-op.
-- Still fail closed if a keep policy is missing while a same-named duplicate
-- exists (unsafe to drop the only remaining public-read policy).

BEGIN;

DO $$
DECLARE
  table_name text;
  keep_policy text;
  duplicate_policy text := 'public read packs';
  keep_matches boolean;
  duplicate_matches boolean;
  duplicate_named boolean;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['domain_packs', 'domain_pack_questions']
  LOOP
    keep_policy := CASE table_name
      WHEN 'domain_packs' THEN 'Allow public read domain_packs'
      ELSE 'Allow public read domain_pack_questions'
    END;

    SELECT EXISTS (
      SELECT 1
      FROM pg_policies AS p
      WHERE p.schemaname = 'public'
        AND p.tablename = table_name
        AND p.policyname = keep_policy
        AND p.permissive = 'PERMISSIVE'
        AND p.roles::text = '{public}'
        AND p.cmd = 'SELECT'
        AND p.qual = 'true'
        AND p.with_check IS NULL
    )
    INTO keep_matches;

    SELECT EXISTS (
      SELECT 1
      FROM pg_policies AS p
      WHERE p.schemaname = 'public'
        AND p.tablename = table_name
        AND p.policyname = duplicate_policy
        AND p.permissive = 'PERMISSIVE'
        AND p.roles::text = '{public}'
        AND p.cmd = 'SELECT'
        AND p.qual = 'true'
        AND p.with_check IS NULL
    )
    INTO duplicate_matches;

    SELECT EXISTS (
      SELECT 1
      FROM pg_policies AS p
      WHERE p.schemaname = 'public'
        AND p.tablename = table_name
        AND p.policyname = duplicate_policy
    )
    INTO duplicate_named;

    IF NOT keep_matches THEN
      IF NOT duplicate_named THEN
        RAISE NOTICE
          'Retained policy "%" and duplicate "%" on public.% are absent; no cleanup needed',
          keep_policy,
          duplicate_policy,
          table_name;
        CONTINUE;
      END IF;

      RAISE EXCEPTION
        'Refusing policy cleanup: expected retained policy "%" on public.% is absent or changed while duplicate "%" still exists',
        keep_policy,
        table_name,
        duplicate_policy;
    END IF;

    IF duplicate_matches THEN
      EXECUTE format(
        'DROP POLICY %I ON public.%I',
        duplicate_policy,
        table_name
      );
    ELSIF duplicate_named THEN
      RAISE EXCEPTION
        'Refusing policy cleanup: duplicate policy "%" on public.% has changed',
        duplicate_policy,
        table_name;
    END IF;
  END LOOP;
END;
$$;

COMMIT;

-- Post-apply read-only verification:
--
-- SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('domain_packs', 'domain_pack_questions')
-- ORDER BY tablename, policyname;
--
-- Fresh replay: zero rows expected (004 uses GRANT SELECT without RLS policies).
-- Populated production-like catalog: one retained USING (true) policy per table.
