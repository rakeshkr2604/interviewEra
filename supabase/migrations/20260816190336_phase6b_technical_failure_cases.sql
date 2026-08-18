-- Phase 6B: manual technical-failure investigation and idempotent restoration.
-- Depends on Phase 6A credit_transactions.interview_id ownership.

BEGIN;

ALTER TABLE public.feedbacks
  DROP CONSTRAINT IF EXISTS feedbacks_feedback_category_check;
ALTER TABLE public.feedbacks
  ADD CONSTRAINT feedbacks_feedback_category_check
    CHECK (
      feedback_category IS NULL OR feedback_category IN (
        'general',
        'bug',
        'feature',
        'interview',
        'report',
        'ai_quality',
        'technical_issue'
      )
    );

CREATE TABLE IF NOT EXISTS public.technical_failure_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  feedback_id UUID NOT NULL REFERENCES public.feedbacks(id) ON DELETE RESTRICT,
  failure_category TEXT NOT NULL CHECK (
    failure_category IN (
      'server_error',
      'initialization_failure',
      'preparation_failure',
      'platform_timeout',
      'ai_provider_failure',
      'transcription_service_failure',
      'unexpected_interruption',
      'other'
    )
  ),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'investigating', 'approved', 'rejected')
  ),
  original_debit_transaction_id UUID
    REFERENCES public.credit_transactions(id) ON DELETE RESTRICT,
  restoration_transaction_id UUID UNIQUE
    REFERENCES public.credit_transactions(id) ON DELETE RESTRICT,
  service_recovery_transaction_id UUID UNIQUE
    REFERENCES public.credit_transactions(id) ON DELETE RESTRICT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  review_started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  service_recovery_granted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_by_email TEXT CHECK (
    reviewed_by_email IS NULL OR char_length(reviewed_by_email) <= 254
  ),
  decision_reason TEXT CHECK (
    decision_reason IS NULL OR char_length(decision_reason) <= 2000
  ),
  service_recovery_reason TEXT CHECK (
    service_recovery_reason IS NULL OR char_length(service_recovery_reason) <= 2000
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT technical_failure_cases_one_case_per_interview UNIQUE (interview_id),
  CONSTRAINT technical_failure_cases_one_case_per_feedback UNIQUE (feedback_id),
  CONSTRAINT technical_failure_cases_resolution_state_check CHECK (
    (
      status IN ('submitted', 'investigating')
      AND resolved_at IS NULL
    )
    OR (
      status IN ('approved', 'rejected')
      AND resolved_at IS NOT NULL
    )
  ),
  CONSTRAINT technical_failure_cases_restoration_state_check CHECK (
    restoration_transaction_id IS NULL
    OR (
      status = 'approved'
      AND restored_at IS NOT NULL
    )
  ),
  CONSTRAINT technical_failure_cases_service_recovery_state_check CHECK (
    service_recovery_transaction_id IS NULL
    OR (
      status = 'approved'
      AND service_recovery_granted_at IS NOT NULL
      AND service_recovery_reason IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_technical_failure_cases_status_submitted
  ON public.technical_failure_cases (status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_technical_failure_cases_user_submitted
  ON public.technical_failure_cases (user_id, submitted_at DESC);

-- Defense in depth: case-row locking is the primary concurrency control; these
-- indexes independently prohibit a second restore/service credit per interview.
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_transactions_technical_restore
  ON public.credit_transactions (interview_id)
  WHERE interview_id IS NOT NULL AND reason = 'technical_failure_restore';
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_transactions_service_recovery
  ON public.credit_transactions (interview_id)
  WHERE interview_id IS NOT NULL AND reason = 'service_recovery_credit';

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_events_technical_case_event
  ON public.product_events (event_name, (props->>'technical_failure_case_id'))
  WHERE event_name IN (
    'technical_issue_reported',
    'technical_issue_approved',
    'technical_issue_rejected',
    'credit_restored',
    'service_recovery_credit_granted'
  );

ALTER TABLE public.technical_failure_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS technical_failure_cases_select_own
  ON public.technical_failure_cases;

REVOKE ALL ON public.technical_failure_cases FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.technical_failure_cases TO service_role;

CREATE OR REPLACE FUNCTION public.create_technical_failure_case(
  p_user_id UUID,
  p_interview_id UUID,
  p_feedback_id UUID,
  p_failure_category TEXT
)
RETURNS TABLE (
  case_id UUID,
  case_status TEXT,
  original_debit_transaction_id UUID,
  created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_case public.technical_failure_cases%ROWTYPE;
  v_debit_id UUID;
BEGIN
  IF p_failure_category NOT IN (
    'server_error',
    'initialization_failure',
    'preparation_failure',
    'platform_timeout',
    'ai_provider_failure',
    'transcription_service_failure',
    'unexpected_interruption',
    'other'
  ) THEN
    RAISE EXCEPTION 'Invalid technical failure category'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.feedbacks
    WHERE id = p_feedback_id
      AND user_id = p_user_id
      AND feedback_category = 'technical_issue'
  ) THEN
    RAISE EXCEPTION 'Feedback does not belong to authenticated user'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.interviews
    WHERE id = p_interview_id
      AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Interview does not belong to authenticated user'
      USING ERRCODE = '42501';
  END IF;

  SELECT id
  INTO v_debit_id
  FROM public.credit_transactions
  WHERE user_id = p_user_id
    AND interview_id = p_interview_id
    AND type = 'debit'
  LIMIT 1;

  INSERT INTO public.technical_failure_cases (
    user_id,
    interview_id,
    feedback_id,
    failure_category,
    original_debit_transaction_id
  )
  VALUES (
    p_user_id,
    p_interview_id,
    p_feedback_id,
    p_failure_category,
    v_debit_id
  )
  ON CONFLICT (interview_id) DO NOTHING
  RETURNING * INTO v_case;

  IF v_case.id IS NOT NULL THEN
    INSERT INTO public.product_events (event_name, user_id, props)
    VALUES (
      'technical_issue_reported',
      p_user_id,
      jsonb_build_object(
        'technical_failure_case_id', v_case.id,
        'interview_id', p_interview_id
      )
    )
    ON CONFLICT DO NOTHING;

    RETURN QUERY
      SELECT v_case.id, v_case.status, v_case.original_debit_transaction_id, TRUE;
    RETURN;
  END IF;

  SELECT *
  INTO v_case
  FROM public.technical_failure_cases
  WHERE interview_id = p_interview_id
    AND user_id = p_user_id;

  IF v_case.id IS NULL THEN
    RAISE EXCEPTION 'Technical failure case conflict could not be resolved'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
    SELECT v_case.id, v_case.status, v_case.original_debit_transaction_id, FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_technical_failure_case(
  p_case_id UUID,
  p_reviewer_id UUID,
  p_reviewer_email TEXT,
  p_action TEXT,
  p_reason TEXT
)
RETURNS TABLE (
  case_id UUID,
  case_status TEXT,
  action_applied BOOLEAN,
  credit_restored BOOLEAN,
  restoration_transaction_id UUID,
  remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_case public.technical_failure_cases%ROWTYPE;
  v_remaining INTEGER;
  v_restore_id UUID;
  v_debit_valid BOOLEAN;
  v_credit_deducted BOOLEAN;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF p_action NOT IN ('investigate', 'approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid technical failure review action'
      USING ERRCODE = '22023';
  END IF;

  IF p_action IN ('approve', 'reject')
    AND char_length(trim(COALESCE(p_reason, ''))) < 3
  THEN
    RAISE EXCEPTION 'A decision reason is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_case
  FROM public.technical_failure_cases
  WHERE id = p_case_id
  FOR UPDATE;

  IF v_case.id IS NULL THEN
    RAISE EXCEPTION 'Technical failure case not found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT credits_remaining
  INTO v_remaining
  FROM public.users
  WHERE id = v_case.user_id;

  IF v_case.status IN ('approved', 'rejected') THEN
    RETURN QUERY
      SELECT v_case.id, v_case.status, FALSE,
        v_case.restoration_transaction_id IS NOT NULL,
        v_case.restoration_transaction_id,
        COALESCE(v_remaining, 0);
    RETURN;
  END IF;

  IF p_action = 'investigate' THEN
    IF v_case.status = 'investigating' THEN
      RETURN QUERY
        SELECT v_case.id, v_case.status, FALSE, FALSE, NULL::UUID,
          COALESCE(v_remaining, 0);
      RETURN;
    END IF;

    UPDATE public.technical_failure_cases
    SET
      status = 'investigating',
      review_started_at = COALESCE(review_started_at, v_now),
      reviewed_by = p_reviewer_id,
      reviewed_by_email = left(p_reviewer_email, 254),
      updated_at = v_now
    WHERE id = v_case.id;

    UPDATE public.feedbacks
    SET is_read = TRUE
    WHERE id = v_case.feedback_id;

    RETURN QUERY
      SELECT v_case.id, 'investigating'::TEXT, TRUE, FALSE, NULL::UUID,
        COALESCE(v_remaining, 0);
    RETURN;
  END IF;

  IF p_action = 'reject' THEN
    UPDATE public.technical_failure_cases
    SET
      status = 'rejected',
      review_started_at = COALESCE(review_started_at, v_now),
      resolved_at = v_now,
      reviewed_by = p_reviewer_id,
      reviewed_by_email = left(p_reviewer_email, 254),
      decision_reason = trim(p_reason),
      updated_at = v_now
    WHERE id = v_case.id;

    UPDATE public.feedbacks
    SET is_read = TRUE, is_resolved = TRUE
    WHERE id = v_case.feedback_id;

    INSERT INTO public.product_events (event_name, user_id, props)
    VALUES (
      'technical_issue_rejected',
      v_case.user_id,
      jsonb_build_object(
        'technical_failure_case_id', v_case.id,
        'interview_id', v_case.interview_id
      )
    )
    ON CONFLICT DO NOTHING;

    RETURN QUERY
      SELECT v_case.id, 'rejected'::TEXT, TRUE, FALSE, NULL::UUID,
        COALESCE(v_remaining, 0);
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.credit_transactions
    WHERE id = v_case.original_debit_transaction_id
      AND user_id = v_case.user_id
      AND interview_id = v_case.interview_id
      AND type = 'debit'
      AND amount = 1
  )
  INTO v_debit_valid;

  SELECT credit_deducted
  INTO v_credit_deducted
  FROM public.interviews
  WHERE id = v_case.interview_id
    AND user_id = v_case.user_id
  FOR UPDATE;

  IF v_debit_valid IS NOT TRUE OR v_credit_deducted IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'No restorable interview credit was found for this interview'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.users
  SET credits_remaining = credits_remaining + 1
  WHERE id = v_case.user_id
  RETURNING credits_remaining INTO v_remaining;

  INSERT INTO public.credit_transactions (
    user_id,
    type,
    amount,
    reason,
    interview_id
  )
  VALUES (
    v_case.user_id,
    'credit',
    1,
    'technical_failure_restore',
    v_case.interview_id
  )
  RETURNING id INTO v_restore_id;

  UPDATE public.interviews
  SET credit_deducted = FALSE
  WHERE id = v_case.interview_id
    AND user_id = v_case.user_id;

  UPDATE public.technical_failure_cases
  SET
    status = 'approved',
    review_started_at = COALESCE(review_started_at, v_now),
    resolved_at = v_now,
    restored_at = v_now,
    reviewed_by = p_reviewer_id,
    reviewed_by_email = left(p_reviewer_email, 254),
    decision_reason = trim(p_reason),
    restoration_transaction_id = v_restore_id,
    updated_at = v_now
  WHERE id = v_case.id;

  UPDATE public.feedbacks
  SET is_read = TRUE, is_resolved = TRUE
  WHERE id = v_case.feedback_id;

  INSERT INTO public.product_events (event_name, user_id, props)
  VALUES
    (
      'technical_issue_approved',
      v_case.user_id,
      jsonb_build_object(
        'technical_failure_case_id', v_case.id,
        'interview_id', v_case.interview_id
      )
    ),
    (
      'credit_restored',
      v_case.user_id,
      jsonb_build_object(
        'technical_failure_case_id', v_case.id,
        'interview_id', v_case.interview_id,
        'amount', 1
      )
    )
  ON CONFLICT DO NOTHING;

  RETURN QUERY
    SELECT v_case.id, 'approved'::TEXT, TRUE, TRUE, v_restore_id, v_remaining;
END;
$function$;

CREATE OR REPLACE FUNCTION public.grant_service_recovery_credit(
  p_case_id UUID,
  p_reviewer_id UUID,
  p_reviewer_email TEXT,
  p_reason TEXT
)
RETURNS TABLE (
  case_id UUID,
  granted BOOLEAN,
  credit_transaction_id UUID,
  remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_case public.technical_failure_cases%ROWTYPE;
  v_remaining INTEGER;
  v_credit_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF char_length(trim(COALESCE(p_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'A service-recovery reason is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_case
  FROM public.technical_failure_cases
  WHERE id = p_case_id
  FOR UPDATE;

  IF v_case.id IS NULL THEN
    RAISE EXCEPTION 'Technical failure case not found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT credits_remaining
  INTO v_remaining
  FROM public.users
  WHERE id = v_case.user_id;

  IF v_case.service_recovery_transaction_id IS NOT NULL THEN
    RETURN QUERY
      SELECT v_case.id, FALSE, v_case.service_recovery_transaction_id,
        COALESCE(v_remaining, 0);
    RETURN;
  END IF;

  IF v_case.status <> 'approved'
    OR v_case.resolved_at IS NULL
    OR v_case.resolved_at <= v_case.submitted_at + INTERVAL '72 hours'
  THEN
    RAISE EXCEPTION 'Service-recovery credit is not eligible for this case'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.users
  SET credits_remaining = credits_remaining + 1
  WHERE id = v_case.user_id
  RETURNING credits_remaining INTO v_remaining;

  INSERT INTO public.credit_transactions (
    user_id,
    type,
    amount,
    reason,
    interview_id
  )
  VALUES (
    v_case.user_id,
    'credit',
    1,
    'service_recovery_credit',
    v_case.interview_id
  )
  RETURNING id INTO v_credit_id;

  UPDATE public.technical_failure_cases
  SET
    service_recovery_transaction_id = v_credit_id,
    service_recovery_granted_at = v_now,
    service_recovery_reason = trim(p_reason),
    reviewed_by = p_reviewer_id,
    reviewed_by_email = left(p_reviewer_email, 254),
    updated_at = v_now
  WHERE id = v_case.id;

  INSERT INTO public.product_events (event_name, user_id, props)
  VALUES (
    'service_recovery_credit_granted',
    v_case.user_id,
    jsonb_build_object(
      'technical_failure_case_id', v_case.id,
      'interview_id', v_case.interview_id,
      'amount', 1
    )
  )
  ON CONFLICT DO NOTHING;

  RETURN QUERY
    SELECT v_case.id, TRUE, v_credit_id, v_remaining;
END;
$function$;

COMMENT ON TABLE public.technical_failure_cases IS
  'Manual-review technical failure cases. One case and at most one restoration/service-recovery credit per interview.';
COMMENT ON COLUMN public.technical_failure_cases.original_debit_transaction_id IS
  'Exact Phase 6A interview-linked debit. NULL only when the reported interview has no restorable debit.';
COMMENT ON FUNCTION public.create_technical_failure_case(UUID, UUID, UUID, TEXT) IS
  'Creates or returns the one technical-failure case for an owned interview. Service-role-only.';
COMMENT ON FUNCTION public.review_technical_failure_case(UUID, UUID, TEXT, TEXT, TEXT) IS
  'Locks and investigates/approves/rejects a case. Approval restores the exact linked debit once. Service-role-only.';
COMMENT ON FUNCTION public.grant_service_recovery_credit(UUID, UUID, TEXT, TEXT) IS
  'Grants at most one additional credit after an approved case exceeded 72 hours. Service-role-only.';

REVOKE ALL ON FUNCTION public.create_technical_failure_case(UUID, UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_technical_failure_case(UUID, UUID, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_service_recovery_credit(UUID, UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_technical_failure_case(UUID, UUID, UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.review_technical_failure_case(UUID, UUID, TEXT, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_service_recovery_credit(UUID, UUID, TEXT, TEXT)
  TO service_role;

COMMIT;
