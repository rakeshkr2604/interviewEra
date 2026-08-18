-- Stale active-interview policy, one-active-per-user constraint, and
-- conflict-safe create_interview_with_credit.
--
-- Production incident 2026-08-18: POST /api/interview/script/start returned 500
-- wrapping "Another interview is already active". Root causes:
--   1. interviews.created_at did not exist, so the route's 409 pre-check
--      (ORDER BY created_at) failed silently and never ran.
--   2. create_interview_with_credit treated every pending/in_progress row as
--      blocking, including sessions abandoned days earlier.
--   3. No unique partial index, so a user could accumulate many "active" rows
--      (107 for the incident user). credit_deducted was FALSE on those rows,
--      so the RPC reuse path could not apply and raised instead.
--
-- This migration does not delete interview rows, does not refund credits, and
-- does not change debit amounts. Completed interviews are untouched.

BEGIN;

-- ── created_at (application already queried this column; it was missing) ─────

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

-- Backfill from the existing timeline fields. Pending/in_progress rows with
-- no timestamps are treated as already old so they cannot look "fresh" and
-- block a new start after the unique index is applied.
UPDATE public.interviews
SET created_at = COALESCE(started_at, completed_at, NOW() - INTERVAL '1 day')
WHERE created_at IS NULL;

ALTER TABLE public.interviews
  ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE public.interviews
  ALTER COLUMN created_at SET NOT NULL;

-- ── Last-activity helper. 45 minutes must match ACTIVE_INTERVIEW_STALE_AFTER_MS.

CREATE OR REPLACE FUNCTION public.interview_last_activity_at(p_interview_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT GREATEST(
    i.created_at,
    i.started_at,
    (SELECT MAX(st.created_at) FROM public.script_turns st WHERE st.interview_id = i.id),
    (SELECT MAX(it.created_at) FROM public.interview_turns it WHERE it.session_id = i.id),
    (
      SELECT MAX(a.submitted_at)
      FROM public.answers a
      JOIN public.questions q ON q.id = a.question_id
      WHERE q.interview_id = i.id
    )
  )
  FROM public.interviews i
  WHERE i.id = p_interview_id
$$;

REVOKE ALL ON FUNCTION public.interview_last_activity_at(UUID)
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.interview_last_activity_at(UUID) IS
  'Latest of created_at, started_at, script/interview turns, and answers. Used to decide stale vs genuinely active.';

-- Block concurrent interview inserts/updates until COMMIT. ADD COLUMN already
-- takes AccessExclusiveLock when created_at is missing; this lock still
-- serializes writers if the column already exists and ADD COLUMN is a no-op.
LOCK TABLE public.interviews IN SHARE ROW EXCLUSIVE MODE;

-- ── 1) Abandon stale pending/in_progress rows. Keep the row. No credit change.

UPDATE public.interviews AS i
SET
  status = 'abandoned',
  completed_at = COALESCE(i.completed_at, NOW())
WHERE i.status IN ('pending', 'in_progress')
  AND public.interview_last_activity_at(i.id) < NOW() - INTERVAL '45 minutes';

-- ── 2) Remaining duplicates (historical races). Keep the most recently active
-- row per user; abandon older active duplicates. Do not delete.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY
        public.interview_last_activity_at(id) DESC NULLS LAST,
        created_at DESC,
        id DESC
    ) AS rn
  FROM public.interviews
  WHERE status IN ('pending', 'in_progress')
)
UPDATE public.interviews AS i
SET
  status = 'abandoned',
  completed_at = COALESCE(i.completed_at, NOW())
FROM ranked AS r
WHERE i.id = r.id
  AND r.rn > 1;

-- ── 3) Fail closed if duplicates remain. Unique index is 098: Postgres
-- rejects CREATE INDEX on interviews in the same transaction as these
-- UPDATEs (55006 pending trigger events).

DO $$
DECLARE
  v_dup_users INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_dup_users
  FROM (
    SELECT user_id
    FROM public.interviews
    WHERE status IN ('pending', 'in_progress')
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) AS d;

  IF v_dup_users > 0 THEN
    RAISE EXCEPTION
      'Cannot finish stale-active cleanup: % user(s) still have multiple pending/in_progress interviews',
      v_dup_users
      USING ERRCODE = 'P0001';
  END IF;
END
$$;

-- Unique partial index is created in 098_one_active_interview_unique_index.sql
-- immediately after this file commits.

-- ── Canonical start RPC: stale-abandon, then reuse / conflict / create. ──────

CREATE OR REPLACE FUNCTION public.create_interview_with_credit(
  p_user_id UUID,
  p_resume_id UUID,
  p_role TEXT,
  p_difficulty public.interview_difficulty,
  p_question_count INTEGER,
  p_status public.interview_status,
  p_started_at TIMESTAMPTZ,
  p_interviewer_id TEXT,
  p_session_context JSONB,
  p_engine TEXT,
  p_script_type TEXT,
  p_self_intro_enabled BOOLEAN,
  p_follow_up_enabled BOOLEAN,
  p_is_returning_user BOOLEAN,
  p_max_skips INTEGER,
  p_skips_used INTEGER,
  p_current_turn_index INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  remaining INTEGER,
  interview_id UUID,
  credit_transaction_id UUID,
  created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_remaining INTEGER;
  v_interview_id UUID := gen_random_uuid();
  v_credit_transaction_id UUID;
  v_existing_interview public.interviews%ROWTYPE;
  v_stale_before TIMESTAMPTZ := NOW() - INTERVAL '45 minutes';
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.resumes
    WHERE id = p_resume_id
      AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Resume does not belong to interview user'
      USING ERRCODE = '23503';
  END IF;

  -- Serialize starts for one user. A concurrent retry waits here, then sees
  -- the interview/debit committed by the first request and reuses it.
  SELECT credits_remaining
  INTO v_remaining
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  UPDATE public.interviews AS i
  SET
    status = 'abandoned',
    completed_at = COALESCE(i.completed_at, NOW())
  WHERE i.user_id = p_user_id
    AND i.status IN ('pending', 'in_progress')
    AND public.interview_last_activity_at(i.id) < v_stale_before;

  SELECT i.*
  INTO v_existing_interview
  FROM public.interviews AS i
  WHERE i.user_id = p_user_id
    AND i.status IN ('pending', 'in_progress')
  ORDER BY i.created_at DESC
  FOR UPDATE
  LIMIT 1;

  IF v_existing_interview.id IS NOT NULL THEN
    IF v_existing_interview.resume_id = p_resume_id
      AND v_existing_interview.role = p_role
      AND v_existing_interview.difficulty = p_difficulty
      AND v_existing_interview.question_count = p_question_count
      AND v_existing_interview.engine = p_engine
      AND v_existing_interview.script_type IS NOT DISTINCT FROM p_script_type
      AND v_existing_interview.credit_deducted IS TRUE
    THEN
      SELECT id
      INTO v_credit_transaction_id
      FROM public.credit_transactions
      WHERE interview_id = v_existing_interview.id
        AND user_id = p_user_id
        AND type = 'debit';

      IF v_credit_transaction_id IS NULL THEN
        RAISE EXCEPTION 'Active interview is missing its linked debit'
          USING ERRCODE = 'P0001';
      END IF;

      RETURN QUERY
        SELECT TRUE, COALESCE(v_remaining, 0), v_existing_interview.id,
          v_credit_transaction_id, FALSE;
      RETURN;
    END IF;

    RAISE EXCEPTION 'Another interview is already active'
      USING ERRCODE = 'P0001',
            HINT = v_existing_interview.id::TEXT,
            DETAIL = json_build_object(
              'interview_id', v_existing_interview.id,
              'status', v_existing_interview.status,
              'engine', v_existing_interview.engine,
              'started_at', v_existing_interview.started_at
            )::TEXT;
  END IF;

  IF COALESCE(v_remaining, 0) <= 0 THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID, NULL::UUID, FALSE;
    RETURN;
  END IF;

  UPDATE public.users
  SET credits_remaining = credits_remaining - 1
  WHERE id = p_user_id
  RETURNING credits_remaining INTO v_remaining;

  INSERT INTO public.interviews (
    id,
    user_id,
    resume_id,
    role,
    difficulty,
    question_count,
    status,
    started_at,
    interviewer_id,
    session_context,
    engine,
    script_type,
    self_intro_enabled,
    follow_up_enabled,
    is_returning_user,
    max_skips,
    skips_used,
    current_turn_index,
    credit_deducted
  )
  VALUES (
    v_interview_id,
    p_user_id,
    p_resume_id,
    p_role,
    p_difficulty,
    p_question_count,
    p_status,
    p_started_at,
    p_interviewer_id,
    COALESCE(p_session_context, '{}'::JSONB),
    p_engine,
    p_script_type,
    p_self_intro_enabled,
    p_follow_up_enabled,
    p_is_returning_user,
    p_max_skips,
    p_skips_used,
    p_current_turn_index,
    TRUE
  );

  INSERT INTO public.credit_transactions (
    user_id,
    type,
    amount,
    reason,
    interview_id
  )
  VALUES (
    p_user_id,
    'debit',
    1,
    'interview_start',
    v_interview_id
  )
  RETURNING id INTO v_credit_transaction_id;

  RETURN QUERY
    SELECT TRUE, v_remaining, v_interview_id, v_credit_transaction_id, TRUE;
END;
$function$;

COMMENT ON FUNCTION public.create_interview_with_credit(
  UUID,
  UUID,
  TEXT,
  public.interview_difficulty,
  INTEGER,
  public.interview_status,
  TIMESTAMPTZ,
  TEXT,
  JSONB,
  TEXT,
  TEXT,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN,
  INTEGER,
  INTEGER,
  INTEGER
) IS
  'Canonical service-role-only interview creation/debit. Abandons stale actives, reuses a matching in-flight start, otherwise creates one interview and one linked debit atomically. Genuine actives raise P0001.';

COMMIT;
