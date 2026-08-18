-- 069: Remove the production-only duplicate index on interviews(is_returning_user).
--
-- Supplied production metadata shows these definitions are identical:
--   interviews_is_returning_user_idx
--   interviews_is_returning_user_idx1
--
-- Keep the canonical suffixless name. Never use CASCADE. The guard aborts if
-- the live definitions diverged or if the duplicate became constraint-backed.
-- A short lock timeout prevents this cleanup from waiting behind production
-- traffic; retry the migration in a reviewed maintenance window if necessary.

BEGIN;

DO $$
DECLARE
  keep_oid oid := to_regclass('public.interviews_is_returning_user_idx');
  duplicate_oid oid := to_regclass('public.interviews_is_returning_user_idx1');
  keep_signature text;
  duplicate_signature text;
BEGIN
  IF duplicate_oid IS NULL THEN
    RAISE NOTICE 'Duplicate index is already absent; no cleanup needed';
    RETURN;
  END IF;

  IF keep_oid IS NULL THEN
    RAISE EXCEPTION
      'Refusing index cleanup: retained index public.interviews_is_returning_user_idx is absent';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_index
    WHERE indexrelid = keep_oid
      AND indisvalid
      AND indisready
      AND indislive
  ) THEN
    RAISE EXCEPTION
      'Refusing index cleanup: retained index is not valid, ready, and live';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conindid = duplicate_oid
  ) THEN
    RAISE EXCEPTION
      'Refusing index cleanup: public.interviews_is_returning_user_idx1 backs a constraint';
  END IF;

  -- indnatts = total attrs (key + INCLUDE); indnkeyatts = key attrs only.
  -- Both are required so KEY(a) INCLUDE(b) cannot match KEY(a) or KEY(a,b).
  SELECT concat_ws(
    '|',
    i.indrelid::text,
    c.relam::text,
    i.indisunique::text,
    i.indisprimary::text,
    i.indisexclusion::text,
    i.indisvalid::text,
    i.indisready::text,
    i.indislive::text,
    i.indnatts::text,
    i.indnkeyatts::text,
    i.indkey::text,
    i.indclass::text,
    i.indcollation::text,
    i.indoption::text,
    coalesce(pg_get_expr(i.indexprs, i.indrelid), ''),
    coalesce(pg_get_expr(i.indpred, i.indrelid), '')
  )
  INTO keep_signature
  FROM pg_index AS i
  JOIN pg_class AS c ON c.oid = i.indexrelid
  WHERE i.indexrelid = keep_oid;

  SELECT concat_ws(
    '|',
    i.indrelid::text,
    c.relam::text,
    i.indisunique::text,
    i.indisprimary::text,
    i.indisexclusion::text,
    i.indisvalid::text,
    i.indisready::text,
    i.indislive::text,
    i.indnatts::text,
    i.indnkeyatts::text,
    i.indkey::text,
    i.indclass::text,
    i.indcollation::text,
    i.indoption::text,
    coalesce(pg_get_expr(i.indexprs, i.indrelid), ''),
    coalesce(pg_get_expr(i.indpred, i.indrelid), '')
  )
  INTO duplicate_signature
  FROM pg_index AS i
  JOIN pg_class AS c ON c.oid = i.indexrelid
  WHERE i.indexrelid = duplicate_oid;

  IF keep_signature IS NULL
     OR duplicate_signature IS NULL
     OR keep_signature <> duplicate_signature THEN
    RAISE EXCEPTION
      'Refusing index cleanup: the two live index definitions are not identical';
  END IF;
END;
$$;

SET LOCAL lock_timeout = '5s';
DROP INDEX IF EXISTS public.interviews_is_returning_user_idx1;

COMMIT;

-- Post-apply read-only verification:
--
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'interviews'
--   AND indexname LIKE 'interviews_is_returning_user_idx%';
--
-- Expected: exactly one row, interviews_is_returning_user_idx.
