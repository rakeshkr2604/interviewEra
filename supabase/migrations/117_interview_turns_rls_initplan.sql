-- 117: Init-plan wrap for interview_turns SELECT (staging/prod drift).
--
-- Production already uses (SELECT auth.uid()) inside
-- "Users can view own interview turns". Staging still had bare auth.uid()
-- after migration 116 (advisor residual). Authorization is unchanged:
-- a user can SELECT turns whose session_id belongs to their interviews.

BEGIN;

ALTER POLICY "Users can view own interview turns"
  ON public.interview_turns
  USING (
    session_id IN (
      SELECT interviews.id
      FROM public.interviews
      WHERE interviews.user_id = (SELECT auth.uid())
    )
  );

COMMIT;
