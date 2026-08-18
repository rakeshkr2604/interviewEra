-- Phase 6A: durable interview <-> credit ownership.
--
-- Historical ledger rows intentionally remain NULL: no timestamp heuristic can
-- prove which interview consumed an old debit.

BEGIN;

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS interview_id UUID;

ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_interview_id_fkey;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_interview_id_fkey
    FOREIGN KEY (interview_id)
    REFERENCES public.interviews(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_interview_id
  ON public.credit_transactions (interview_id)
  WHERE interview_id IS NOT NULL;

-- An interview may have one debit plus a later refund credit, but never two
-- debit rows. NULL historical ownership is deliberately excluded.
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_transactions_interview_debit
  ON public.credit_transactions (interview_id)
  WHERE interview_id IS NOT NULL AND type = 'debit';

CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_transactions_interview_start_failed_refund
  ON public.credit_transactions (interview_id)
  WHERE interview_id IS NOT NULL
    AND reason = 'interview_start_failed_refund';

-- Canonical interview creation/debit path. Interview creation, balance update,
-- ownership marker, and ledger insert commit or roll back as one transaction.
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

  SELECT i.*
  INTO v_existing_interview
  FROM public.interviews AS i
  WHERE i.user_id = p_user_id
    AND i.status IN ('pending', 'in_progress')
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
      USING ERRCODE = 'P0001';
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
  'Canonical service-role-only interview creation/debit transaction. Creates one interview and one linked debit atomically.';

-- Linked, idempotent start-failure refund. The same interview may have one
-- debit and one refund credit; credit_deducted prevents repeated refunds.
CREATE OR REPLACE FUNCTION public.refund_credit(
  p_user_id UUID,
  p_interview_id UUID
)
RETURNS TABLE (
  refunded BOOLEAN,
  remaining INTEGER,
  credit_transaction_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_credit_deducted BOOLEAN;
  v_linked_debit_count INTEGER;
  v_remaining INTEGER;
  v_credit_transaction_id UUID;
BEGIN
  SELECT credit_deducted
  INTO v_credit_deducted
  FROM public.interviews
  WHERE id = p_interview_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF v_credit_deducted IS DISTINCT FROM TRUE THEN
    SELECT credits_remaining
    INTO v_remaining
    FROM public.users
    WHERE id = p_user_id;

    RETURN QUERY
      SELECT FALSE, COALESCE(v_remaining, 0), NULL::UUID;
    RETURN;
  END IF;

  SELECT count(*)::INTEGER
  INTO v_linked_debit_count
  FROM public.credit_transactions
  WHERE interview_id = p_interview_id
    AND user_id = p_user_id
    AND type = 'debit'
    AND amount = 1
    AND reason = 'interview_start';

  IF v_linked_debit_count <> 1 THEN
    RAISE EXCEPTION 'Interview is missing its exact linked start debit'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.users
  SET credits_remaining = credits_remaining + 1
  WHERE id = p_user_id
  RETURNING credits_remaining INTO v_remaining;

  UPDATE public.interviews
  SET credit_deducted = FALSE
  WHERE id = p_interview_id
    AND user_id = p_user_id;

  INSERT INTO public.credit_transactions (
    user_id,
    type,
    amount,
    reason,
    interview_id
  )
  VALUES (
    p_user_id,
    'credit',
    1,
    'interview_start_failed_refund',
    p_interview_id
  )
  RETURNING id INTO v_credit_transaction_id;

  RETURN QUERY
    SELECT TRUE, v_remaining, v_credit_transaction_id;
END;
$function$;

COMMENT ON FUNCTION public.refund_credit(UUID, UUID) IS
  'Idempotent service-role-only start-failure refund linked to the original interview.';

-- Disable the two debit-only implementations so future interview starts have
-- one canonical path with an atomic interview row and linked ledger entry.
REVOKE ALL ON FUNCTION public.deduct_credit(UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.deduct_interview_credit(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.deduct_credit(UUID) IS
  'Deprecated and non-executable. Use create_interview_with_credit for interview starts.';
COMMENT ON FUNCTION public.deduct_interview_credit(UUID, UUID, TEXT) IS
  'Deprecated and non-executable. Use create_interview_with_credit for interview starts.';

-- Disable the unlinked overload; start failures must use the interview-scoped
-- overload above. add_credit remains unchanged for rewards/admin/referrals.
REVOKE ALL ON FUNCTION public.refund_credit(UUID) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_interview_with_credit(
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
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_interview_with_credit(
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
) TO service_role;

REVOKE ALL ON FUNCTION public.refund_credit(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credit(UUID, UUID) TO service_role;

COMMIT;
