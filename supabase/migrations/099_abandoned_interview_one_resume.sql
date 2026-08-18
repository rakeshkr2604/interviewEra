-- One continue from history for an abandoned interview that already consumed
-- a credit. Same row, same questions/turns, no extra debit, no refund.
--
-- After this resume, abandoned_resume_used is true. A second Exit is terminal.
-- Unpaid abandoned rows (credit_deducted IS NOT TRUE) are not eligible.
-- Unique one-active index is preserved: stale other actives are abandoned
-- first (same 45-minute last-activity window as 096).

BEGIN;

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS abandoned_resume_used BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS abandoned_resumed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.interviews.abandoned_resume_used IS
  'True after the candidate used their one history-continue on an abandoned interview. A later abandon cannot be reopened.';

COMMENT ON COLUMN public.interviews.abandoned_resumed_at IS
  'When the one history-continue reopened this row. Counts as last activity so a just-resumed session is not immediately stale.';

CREATE OR REPLACE FUNCTION public.interview_last_activity_at(p_interview_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT GREATEST(
    i.created_at,
    i.started_at,
    i.abandoned_resumed_at,
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

CREATE OR REPLACE FUNCTION public.resume_abandoned_interview(
  p_user_id UUID,
  p_interview_id UUID
)
RETURNS TABLE (
  ok BOOLEAN,
  interview_id UUID,
  engine TEXT,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_target public.interviews%ROWTYPE;
  v_other public.interviews%ROWTYPE;
  v_stale_before TIMESTAMPTZ := NOW() - INTERVAL '45 minutes';
BEGIN
  PERFORM 1
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, 'not_found';
    RETURN;
  END IF;

  SELECT i.*
  INTO v_target
  FROM public.interviews AS i
  WHERE i.id = p_interview_id
    AND i.user_id = p_user_id
  FOR UPDATE;

  IF v_target.id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, 'not_found';
    RETURN;
  END IF;

  IF v_target.status IN ('pending', 'in_progress') THEN
    RETURN QUERY SELECT TRUE, v_target.id, v_target.engine, 'already_active';
    RETURN;
  END IF;

  IF v_target.status = 'completed' THEN
    RETURN QUERY SELECT FALSE, v_target.id, v_target.engine, 'completed';
    RETURN;
  END IF;

  IF v_target.status IS DISTINCT FROM 'abandoned' THEN
    RETURN QUERY SELECT FALSE, v_target.id, v_target.engine, 'not_abandoned';
    RETURN;
  END IF;

  IF v_target.abandoned_resume_used IS TRUE THEN
    RETURN QUERY SELECT FALSE, v_target.id, v_target.engine, 'already_resumed';
    RETURN;
  END IF;

  IF v_target.credit_deducted IS DISTINCT FROM TRUE THEN
    RETURN QUERY SELECT FALSE, v_target.id, v_target.engine, 'no_credit';
    RETURN;
  END IF;

  UPDATE public.interviews AS i
  SET
    status = 'abandoned',
    completed_at = COALESCE(i.completed_at, NOW())
  WHERE i.user_id = p_user_id
    AND i.id <> p_interview_id
    AND i.status IN ('pending', 'in_progress')
    AND public.interview_last_activity_at(i.id) < v_stale_before;

  SELECT i.*
  INTO v_other
  FROM public.interviews AS i
  WHERE i.user_id = p_user_id
    AND i.id <> p_interview_id
    AND i.status IN ('pending', 'in_progress')
  ORDER BY i.created_at DESC
  FOR UPDATE
  LIMIT 1;

  IF v_other.id IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, v_other.id, v_other.engine, 'other_active';
    RETURN;
  END IF;

  UPDATE public.interviews
  SET
    status = 'in_progress',
    abandoned_resume_used = TRUE,
    abandoned_resumed_at = NOW(),
    completed_at = NULL
  WHERE id = p_interview_id
    AND user_id = p_user_id;

  RETURN QUERY SELECT TRUE, v_target.id, v_target.engine, 'reopened';
END;
$function$;

REVOKE ALL ON FUNCTION public.resume_abandoned_interview(UUID, UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.resume_abandoned_interview(UUID, UUID)
  TO service_role;

COMMENT ON FUNCTION public.resume_abandoned_interview(UUID, UUID) IS
  'Service-role-only. Reopens one abandoned credit-owned interview to in_progress. No credit change. One resume per interview.';

COMMIT;
