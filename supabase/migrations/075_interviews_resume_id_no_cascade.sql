-- ============================================================================
-- Migration: 20260717000001_interviews_resume_id_no_cascade.sql
--
-- Purpose: stop `resumes` deletes from silently cascading through
-- `interviews` → `script_turns` / `answer_evaluations` (score-v1 audit rows).
--
-- Before: interviews.resume_id REFERENCES resumes(id) ON DELETE CASCADE
--         (001_initial_schema.sql) — any resume hard-delete that bypassed the
--         app-level guard in /api/resume/[id] (service-role scripts, dashboard
--         SQL, migrations) destroyed the interview + its audit trail.
-- After:  ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED.
--
-- Why deferred NO ACTION and not RESTRICT:
--   /api/account/delete-account deletes `users`, which cascades to BOTH
--   `resumes` (resumes.user_id) and `interviews` (interviews.user_id) in the
--   same statement. RESTRICT checks immediately and can fail mid-cascade
--   depending on internal delete order; RESTRICT is also not deferrable.
--   A deferred NO ACTION check runs at COMMIT — by then both sides of the
--   users-cascade are gone, so account deletion keeps working unchanged,
--   while a bare `DELETE FROM resumes` that would orphan interviews now
--   fails at commit instead of cascading.
--
-- Unchanged (deliberately):
--   * interviews.user_id / resumes.user_id ON DELETE CASCADE — account
--     deletion must keep wiping evaluations (transcripts are PII).
--   * script_turns / answer_evaluations → interviews ON DELETE CASCADE —
--     /api/account/delete-interview-data intentionally destroys audit rows
--     (privacy-over-audit; recorded in TECH_DEBT.md).
--
-- Data impact: none. The FK already enforces referential integrity, so the
-- re-add validation scan passes; changing the delete action is constraint
-- metadata, not a table rewrite. The ADD takes an ACCESS EXCLUSIVE lock on
-- `interviews` for the duration of one validation scan of the table.
--
-- Safe to re-run: drops whatever FK currently exists on interviews(resume_id).
-- ============================================================================

BEGIN;

-- Drop the existing FK on interviews.resume_id regardless of its name
-- (001 used the auto-generated name; don't assume it survived unchanged).
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.interviews'::regclass
      AND contype = 'f'
      AND confrelid = 'public.resumes'::regclass
      AND conkey = (
        SELECT ARRAY[attnum]
        FROM pg_attribute
        WHERE attrelid = 'public.interviews'::regclass
          AND attname = 'resume_id'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.interviews DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE public.interviews
  ADD CONSTRAINT interviews_resume_id_fkey
    FOREIGN KEY (resume_id) REFERENCES public.resumes(id)
    ON DELETE NO ACTION
    DEFERRABLE INITIALLY DEFERRED;

COMMIT;
