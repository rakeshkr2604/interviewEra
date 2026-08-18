-- Historical migration 056 was manually applied to production before being
-- added to version control (commit 9fb0864). Its target table was introduced
-- by timestamped migration 20260718000001, which runs later in a fresh CLI
-- replay. It must therefore be a no-op here; the intended FK reconciliation
-- is applied after all dependencies by 20260817162058.
--
-- Original body retained as commented historical evidence:
/*
-- Fix: resume_interview_snapshots.resume_id FK should cascade deletes
-- to prevent FK blocks during user hard-deletes.
--
-- Background:
--  - resume_interview_snapshots.interview_id already has ON DELETE CASCADE.
--  - However, resume_interview_snapshots.resume_id was created with
--    ON DELETE NO ACTION, which can block DELETEs when the deletion plan
--    reaches deletes for public.resumes before the snapshot rows are removed.
--
-- We intentionally switch resume_id -> snapshots to ON DELETE CASCADE.
-- This matches the app's usage where snapshots are historical interview
-- context tied to a user/interview lifecycle (and resumes are soft-deleted
-- in normal UX, not physically removed).

BEGIN;

ALTER TABLE public.resume_interview_snapshots
  DROP CONSTRAINT IF EXISTS resume_interview_snapshots_resume_id_fkey;

ALTER TABLE public.resume_interview_snapshots
  ADD CONSTRAINT resume_interview_snapshots_resume_id_fkey
  FOREIGN KEY (resume_id)
  REFERENCES public.resumes(id)
  ON DELETE CASCADE;

COMMIT;
*/

