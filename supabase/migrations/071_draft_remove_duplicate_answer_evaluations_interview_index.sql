-- 071 DRAFT ONLY — DO NOT APPLY without reviewed runtime/query-plan evidence.
--
-- Repository migration and supplied production catalog evidence show:
--   retained:  public.answer_evaluations_interview_id_turn_index_key
--              UNIQUE btree (interview_id, turn_index)
--   candidate: public.idx_answer_evaluations_interview
--              non-unique btree (interview_id, turn_index)
--
-- Active scans exist. This guarded draft proves structural redundancy at apply
-- time but does not itself approve production application. Never use CASCADE.
--
-- QUARANTINED: this migration version is intentionally retained as a true
-- no-op. The historical draft body remains below only as commented evidence.

/*
BEGIN;

SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  expected_table_oid oid := to_regclass('public.answer_evaluations');
  retained_oid oid := to_regclass('public.answer_evaluations_interview_id_turn_index_key');
  candidate_oid oid := to_regclass('public.idx_answer_evaluations_interview');
  retained_signature text;
  candidate_signature text;
BEGIN
  IF candidate_oid IS NULL THEN
    RAISE NOTICE 'Candidate index public.idx_answer_evaluations_interview is already absent; no cleanup needed';
    RETURN;
  END IF;

  IF expected_table_oid IS NULL THEN
    RAISE EXCEPTION
      'Refusing index cleanup: expected table public.answer_evaluations is absent';
  END IF;

  IF retained_oid IS NULL THEN
    RAISE EXCEPTION
      'Refusing index cleanup: retained unique index public.answer_evaluations_interview_id_turn_index_key is absent';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_index AS i
    WHERE i.indexrelid = retained_oid
      AND i.indrelid = expected_table_oid
      AND i.indisunique
      AND NOT i.indisprimary
      AND NOT i.indisexclusion
      AND i.indisvalid
      AND i.indisready
      AND i.indislive
  ) THEN
    RAISE EXCEPTION
      'Refusing index cleanup: retained structure is not the expected live UNIQUE index on public.answer_evaluations';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = expected_table_oid
      AND conname = 'answer_evaluations_interview_id_turn_index_key'
      AND contype = 'u'
      AND conindid = retained_oid
  ) THEN
    RAISE EXCEPTION
      'Refusing index cleanup: retained index does not back the expected UNIQUE constraint';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_index AS i
    WHERE i.indexrelid = candidate_oid
      AND i.indrelid = expected_table_oid
      AND NOT i.indisunique
      AND NOT i.indisprimary
      AND NOT i.indisexclusion
      AND i.indisvalid
      AND i.indisready
      AND i.indislive
  ) THEN
    RAISE EXCEPTION
      'Refusing index cleanup: candidate is not the expected live non-unique index on public.answer_evaluations';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conindid = candidate_oid
  ) THEN
    RAISE EXCEPTION
      'Refusing index cleanup: public.idx_answer_evaluations_interview backs a constraint';
  END IF;

  -- Uniqueness/primary/exclusion flags are validated above because retained
  -- and candidate intentionally differ on uniqueness. This signature compares
  -- every access-path field that must be identical, including the INCLUDE
  -- boundary (indnatts vs indnkeyatts), key order/options, opclasses,
  -- collations, expressions, and predicate.
  SELECT concat_ws(
    '|',
    i.indrelid::text,
    c.relam::text,
    i.indnatts::text,
    i.indnkeyatts::text,
    i.indkey::text,
    i.indclass::text,
    i.indcollation::text,
    i.indoption::text,
    coalesce(pg_get_expr(i.indexprs, i.indrelid), ''),
    coalesce(pg_get_expr(i.indpred, i.indrelid), '')
  )
  INTO retained_signature
  FROM pg_index AS i
  JOIN pg_class AS c ON c.oid = i.indexrelid
  WHERE i.indexrelid = retained_oid;

  SELECT concat_ws(
    '|',
    i.indrelid::text,
    c.relam::text,
    i.indnatts::text,
    i.indnkeyatts::text,
    i.indkey::text,
    i.indclass::text,
    i.indcollation::text,
    i.indoption::text,
    coalesce(pg_get_expr(i.indexprs, i.indrelid), ''),
    coalesce(pg_get_expr(i.indpred, i.indrelid), '')
  )
  INTO candidate_signature
  FROM pg_index AS i
  JOIN pg_class AS c ON c.oid = i.indexrelid
  WHERE i.indexrelid = candidate_oid;

  IF retained_signature IS NULL
     OR candidate_signature IS NULL
     OR retained_signature <> candidate_signature THEN
    RAISE EXCEPTION
      'Refusing index cleanup: retained and candidate access-path signatures differ';
  END IF;
END;
$$;

DROP INDEX IF EXISTS public.idx_answer_evaluations_interview;

COMMIT;
*/

-- DRAFT STATUS: QUARANTINED; NO EXECUTABLE DDL.
-- Required before approval: representative query plans, dated observation
-- window, and reviewed rollback/maintenance-window procedure.
