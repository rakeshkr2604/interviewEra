-- ============================================================================
-- 058_add_missing_fk_indexes.sql
-- ============================================================================
-- Historical migration 058 was manually applied to production before being
-- added to version control (commit 9fb0864). Three index targets are created
-- by later timestamped migrations, so this version is a fresh-replay no-op.
-- All original index operations are reconciled after dependencies exist by
-- 20260817162058.
--
-- Original body retained as commented historical evidence:
/*
-- Purpose: Cover 11 foreign-key columns flagged by Supabase Performance Advisor
-- as lacking a supporting index (speeds joins, FK validation, and cascades).
--
-- Index naming: idx_<table>_<column> (matches 001_initial_schema.sql pattern).
--
-- CONCURRENTLY: NOT used. Migration 009 documents that Supabase migrations run
-- inside a transaction; CREATE INDEX CONCURRENTLY cannot run in a transaction
-- block. Regular CREATE INDEX IF NOT EXISTS takes a brief SHARE lock on write
-- during build — acceptable for manual Dashboard apply with review.
--
-- Apply via Dashboard SQL Editor after review. Do NOT auto-apply from CI.
-- ============================================================================

BEGIN;

-- answer_evaluations.user_id → users(id) ON DELETE SET NULL
-- Verified: 20260716000001_answer_evaluations.sql (FK column user_id; no user_id index)
CREATE INDEX IF NOT EXISTS idx_answer_evaluations_user_id
  ON public.answer_evaluations (user_id);

-- domain_pack_questions.pack_id → domain_packs(id) ON DELETE CASCADE
-- Verified: 004_domain_packs.sql (FK column pack_id; no pack_id index)
CREATE INDEX IF NOT EXISTS idx_domain_pack_questions_pack_id
  ON public.domain_pack_questions (pack_id);

-- email_clicks.user_id → users(id) ON DELETE SET NULL
-- Verified: 037_email_automation_engine.sql (idx_email_clicks_job covers job_id only)
CREATE INDEX IF NOT EXISTS idx_email_clicks_user_id
  ON public.email_clicks (user_id);

-- email_events.user_id → users(id) ON DELETE SET NULL
-- Verified: 037_email_automation_engine.sql (idx_email_events_unprocessed is partial on processed)
CREATE INDEX IF NOT EXISTS idx_email_events_user_id
  ON public.email_events (user_id);

-- email_jobs.event_id → email_events(id) ON DELETE SET NULL
-- Verified: 037_email_automation_engine.sql (idx_email_jobs_user covers user_id only)
CREATE INDEX IF NOT EXISTS idx_email_jobs_event_id
  ON public.email_jobs (event_id);

-- email_logs.job_id → email_jobs(id) ON DELETE SET NULL
-- Verified: 037_email_automation_engine.sql (no index on job_id)
CREATE INDEX IF NOT EXISTS idx_email_logs_job_id
  ON public.email_logs (job_id);

-- email_opens.user_id → users(id) ON DELETE SET NULL
-- Verified: 037_email_automation_engine.sql (idx_email_opens_job covers job_id only)
CREATE INDEX IF NOT EXISTS idx_email_opens_user_id
  ON public.email_opens (user_id);

-- interviews.resume_id → resumes(id) ON DELETE NO ACTION DEFERRABLE
-- Verified: 001_initial_schema.sql + 20260717000001_interviews_resume_id_no_cascade.sql
CREATE INDEX IF NOT EXISTS idx_interviews_resume_id
  ON public.interviews (resume_id);

-- provider_failover_events.user_id → users(id) ON DELETE SET NULL
-- Verified: 023_ai_telemetry.sql (idx_failover_interview covers interview_id only)
CREATE INDEX IF NOT EXISTS idx_provider_failover_events_user_id
  ON public.provider_failover_events (user_id);

-- resume_interview_snapshots.resume_version_id → resume_versions(id) ON DELETE SET NULL
-- Verified: 20260718000001_resume_versions_and_snapshots.sql
--   (idx_resume_interview_snapshots_resume covers resume_id only)
CREATE INDEX IF NOT EXISTS idx_resume_interview_snapshots_resume_version_id
  ON public.resume_interview_snapshots (resume_version_id);

-- resumes.current_version_id → resume_versions(id) ON DELETE SET NULL DEFERRABLE
-- Verified: 20260718000001_resume_versions_and_snapshots.sql (resumes_current_version_id_fkey)
CREATE INDEX IF NOT EXISTS idx_resumes_current_version_id
  ON public.resumes (current_version_id);

COMMIT;
*/
