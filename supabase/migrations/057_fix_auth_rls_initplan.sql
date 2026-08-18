-- ============================================================================
-- 057_fix_auth_rls_initplan.sql
-- ============================================================================
-- Historical migration 057 was manually applied to production before being
-- added to version control (commit 9fb0864). Its static policy list includes
-- tables created by later timestamped migrations, so this version is a
-- fresh-replay no-op. The generic policy reconciliation is rerun after every
-- dependency exists by 20260817162058.
--
-- Original body retained as commented historical evidence:
/*
-- Purpose: Fix Supabase Performance Advisor `auth_rls_initplan` warnings.
--
-- Problem: RLS policies that call auth.uid() / auth.role() / auth.jwt() /
-- current_setting(...) directly are re-evaluated once per row. Wrapping as
-- (select auth.uid()) makes Postgres InitPlan the value once per query.
--
-- Reference:
--   https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- Scope: ONLY wrap auth.* / current_setting() calls. No other logic changes.
--         Does NOT consolidate duplicate/overlapping policies.
--
-- Source of policy list: reconstructed from SQL files in supabase/migrations
-- (live pg_policies unavailable — Management API token unauthorized).
--
-- Counts (migration-reconstructed):
--   77 policies total, 76 need initplan wrap (~92 bare auth.* call sites)
--   Advisor reported 179 warnings — gap is expected if production has
--   extra Dashboard-created policies / alternate names. The safety-net DO
--   block at the end rewrites ANY remaining bare auth.* / current_setting()
--   calls in public + storage so production-only policies are covered.
--
-- Apply via Dashboard SQL Editor after review. Do NOT auto-apply from CI.
-- After apply, re-run Performance Advisor; auth_rls_initplan should be 0.
-- ============================================================================

BEGIN;

-- ── public.abuse_detection_logs (1 policy) ──
-- service_role_full [ALL] from 023_ai_telemetry.sql
--   USING before: auth.role() = 'service_role'
--   CHECK before: auth.role() = 'service_role'
DROP POLICY IF EXISTS "service_role_full" ON "public"."abuse_detection_logs";
CREATE POLICY "service_role_full" ON "public"."abuse_detection_logs"
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- ── public.ai_call_logs (1 policy) ──
-- service_role_full [ALL] from 023_ai_telemetry.sql
--   USING before: auth.role() = 'service_role'
--   CHECK before: auth.role() = 'service_role'
DROP POLICY IF EXISTS "service_role_full" ON "public"."ai_call_logs";
CREATE POLICY "service_role_full" ON "public"."ai_call_logs"
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- ── public.answer_analyses (2 policies) ──
-- Users can insert own answer analyses [INSERT] from 020_dual_agent_conversation.sql
--   CHECK before: conversation_state_id IN (       SELECT id FROM conversation_states       WHERE interview_id IN (         SELECT id FROM…
DROP POLICY IF EXISTS "Users can insert own answer analyses" ON "public"."answer_analyses";
CREATE POLICY "Users can insert own answer analyses" ON "public"."answer_analyses"
  FOR INSERT
  WITH CHECK (conversation_state_id IN (
          SELECT id FROM conversation_states
          WHERE interview_id IN (
            SELECT id FROM interviews WHERE user_id = (select auth.uid())
          )
        ));

-- Users can view own answer analyses [SELECT] from 020_dual_agent_conversation.sql
--   USING before: conversation_state_id IN (       SELECT id FROM conversation_states       WHERE interview_id IN (         SELECT id FROM…
DROP POLICY IF EXISTS "Users can view own answer analyses" ON "public"."answer_analyses";
CREATE POLICY "Users can view own answer analyses" ON "public"."answer_analyses"
  FOR SELECT
  USING (conversation_state_id IN (
          SELECT id FROM conversation_states
          WHERE interview_id IN (
            SELECT id FROM interviews WHERE user_id = (select auth.uid())
          )
        ));

-- ── public.answer_evaluations (2 policies) ──
-- answer_evaluations_select_own [SELECT] from 20260716000001_answer_evaluations.sql
--   USING before: interview_id IN (       SELECT id FROM interviews WHERE user_id = auth.uid()     )
DROP POLICY IF EXISTS "answer_evaluations_select_own" ON "public"."answer_evaluations";
CREATE POLICY "answer_evaluations_select_own" ON "public"."answer_evaluations"
  FOR SELECT
  USING (interview_id IN (
          SELECT id FROM interviews WHERE user_id = (select auth.uid())
        ));

-- answer_evaluations_service_role_full [ALL] from 20260716000001_answer_evaluations.sql
--   USING before: auth.role() = 'service_role'
--   CHECK before: auth.role() = 'service_role'
DROP POLICY IF EXISTS "answer_evaluations_service_role_full" ON "public"."answer_evaluations";
CREATE POLICY "answer_evaluations_service_role_full" ON "public"."answer_evaluations"
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- ── public.answers (2 policies) ──
-- answers_insert_own [INSERT] from 001_initial_schema.sql
--   CHECK before: EXISTS (       SELECT 1 FROM questions       JOIN interviews ON interviews.id = questions.interview_id       WHERE quest…
DROP POLICY IF EXISTS "answers_insert_own" ON "public"."answers";
CREATE POLICY "answers_insert_own" ON "public"."answers"
  FOR INSERT
  WITH CHECK (EXISTS (
          SELECT 1 FROM questions
          JOIN interviews ON interviews.id = questions.interview_id
          WHERE questions.id = answers.question_id
            AND interviews.user_id = (select auth.uid())
        ));

-- answers_select_own [SELECT] from 001_initial_schema.sql
--   USING before: EXISTS (       SELECT 1 FROM questions       JOIN interviews ON interviews.id = questions.interview_id       WHERE quest…
DROP POLICY IF EXISTS "answers_select_own" ON "public"."answers";
CREATE POLICY "answers_select_own" ON "public"."answers"
  FOR SELECT
  USING (EXISTS (
          SELECT 1 FROM questions
          JOIN interviews ON interviews.id = questions.interview_id
          WHERE questions.id = answers.question_id
            AND interviews.user_id = (select auth.uid())
        ));

-- ── public.campus_invites (1 policy) ──
-- campus_admin manage invites [ALL] from 005_campus.sql
--   USING before: org_id IN (       SELECT id FROM public.campus_organizations       WHERE admin_user_id = auth.uid()     )
DROP POLICY IF EXISTS "campus_admin manage invites" ON "public"."campus_invites";
CREATE POLICY "campus_admin manage invites" ON "public"."campus_invites"
  FOR ALL
  USING (org_id IN (
          SELECT id FROM public.campus_organizations
          WHERE admin_user_id = (select auth.uid())
        ));

-- ── public.campus_organizations (1 policy) ──
-- campus_admin read own org [SELECT] from 005_campus.sql
--   USING before: admin_user_id = auth.uid()
DROP POLICY IF EXISTS "campus_admin read own org" ON "public"."campus_organizations";
CREATE POLICY "campus_admin read own org" ON "public"."campus_organizations"
  FOR SELECT
  USING (admin_user_id = (select auth.uid()));

-- ── public.college_deadlines (1 policy) ──
-- campus_admin_manage_deadlines [ALL] from 018_college_enrollments_deadlines.sql
--   USING before: college_id IN (     SELECT id     FROM campus_organizations     WHERE admin_user_id = auth.uid()   )
DROP POLICY IF EXISTS "campus_admin_manage_deadlines" ON "public"."college_deadlines";
CREATE POLICY "campus_admin_manage_deadlines" ON "public"."college_deadlines"
  FOR ALL
  USING (college_id IN (
        SELECT id
        FROM campus_organizations
        WHERE admin_user_id = (select auth.uid())
      ));

-- ── public.college_enrollments (2 policies) ──
-- campus_admin_manage_enrollments [ALL] from 018_college_enrollments_deadlines.sql
--   USING before: college_id IN (     SELECT id     FROM campus_organizations     WHERE admin_user_id = auth.uid()   )
DROP POLICY IF EXISTS "campus_admin_manage_enrollments" ON "public"."college_enrollments";
CREATE POLICY "campus_admin_manage_enrollments" ON "public"."college_enrollments"
  FOR ALL
  USING (college_id IN (
        SELECT id
        FROM campus_organizations
        WHERE admin_user_id = (select auth.uid())
      ));

-- student_read_own_enrollment [SELECT] from 018_college_enrollments_deadlines.sql
--   USING before: user_id = auth.uid()
DROP POLICY IF EXISTS "student_read_own_enrollment" ON "public"."college_enrollments";
CREATE POLICY "student_read_own_enrollment" ON "public"."college_enrollments"
  FOR SELECT
  USING (user_id = (select auth.uid()));

-- ── public.conversation_states (3 policies) ──
-- Users can insert own conversation states [INSERT] from 020_dual_agent_conversation.sql
--   CHECK before: interview_id IN (       SELECT id FROM interviews WHERE user_id = auth.uid()     )
DROP POLICY IF EXISTS "Users can insert own conversation states" ON "public"."conversation_states";
CREATE POLICY "Users can insert own conversation states" ON "public"."conversation_states"
  FOR INSERT
  WITH CHECK (interview_id IN (
          SELECT id FROM interviews WHERE user_id = (select auth.uid())
        ));

-- Users can update own conversation states [UPDATE] from 020_dual_agent_conversation.sql
--   USING before: interview_id IN (       SELECT id FROM interviews WHERE user_id = auth.uid()     )
DROP POLICY IF EXISTS "Users can update own conversation states" ON "public"."conversation_states";
CREATE POLICY "Users can update own conversation states" ON "public"."conversation_states"
  FOR UPDATE
  USING (interview_id IN (
          SELECT id FROM interviews WHERE user_id = (select auth.uid())
        ));

-- Users can view own conversation states [SELECT] from 020_dual_agent_conversation.sql
--   USING before: interview_id IN (       SELECT id FROM interviews WHERE user_id = auth.uid()     )
DROP POLICY IF EXISTS "Users can view own conversation states" ON "public"."conversation_states";
CREATE POLICY "Users can view own conversation states" ON "public"."conversation_states"
  FOR SELECT
  USING (interview_id IN (
          SELECT id FROM interviews WHERE user_id = (select auth.uid())
        ));

-- ── public.credit_transactions (1 policy) ──
-- credit_transactions_select_own [SELECT] from 001_initial_schema.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "credit_transactions_select_own" ON "public"."credit_transactions";
CREATE POLICY "credit_transactions_select_own" ON "public"."credit_transactions"
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ── public.evaluations (2 policies) ──
-- evaluations_insert_own [INSERT] from 001_initial_schema.sql
--   CHECK before: EXISTS (       SELECT 1 FROM answers       JOIN questions ON questions.id = answers.question_id       JOIN interviews ON…
DROP POLICY IF EXISTS "evaluations_insert_own" ON "public"."evaluations";
CREATE POLICY "evaluations_insert_own" ON "public"."evaluations"
  FOR INSERT
  WITH CHECK (EXISTS (
          SELECT 1 FROM answers
          JOIN questions ON questions.id = answers.question_id
          JOIN interviews ON interviews.id = questions.interview_id
          WHERE answers.id = evaluations.answer_id
            AND interviews.user_id = (select auth.uid())
        ));

-- evaluations_select_own [SELECT] from 001_initial_schema.sql
--   USING before: EXISTS (       SELECT 1 FROM answers       JOIN questions ON questions.id = answers.question_id       JOIN interviews ON…
DROP POLICY IF EXISTS "evaluations_select_own" ON "public"."evaluations";
CREATE POLICY "evaluations_select_own" ON "public"."evaluations"
  FOR SELECT
  USING (EXISTS (
          SELECT 1 FROM answers
          JOIN questions ON questions.id = answers.question_id
          JOIN interviews ON interviews.id = questions.interview_id
          WHERE answers.id = evaluations.answer_id
            AND interviews.user_id = (select auth.uid())
        ));

-- ── public.experiment_assignments (1 policy) ──
-- experiment_assignments_select_own [SELECT] from 051_post_launch_growth.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "experiment_assignments_select_own" ON "public"."experiment_assignments";
CREATE POLICY "experiment_assignments_select_own" ON "public"."experiment_assignments"
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ── public.feedbacks (1 policy) ──
-- feedbacks_select_own [SELECT] from 026_feedback.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "feedbacks_select_own" ON "public"."feedbacks";
CREATE POLICY "feedbacks_select_own" ON "public"."feedbacks"
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ── public.followup_questions (2 policies) ──
-- Users can insert own followup questions [INSERT] from 020_dual_agent_conversation.sql
--   CHECK before: answer_analysis_id IN (       SELECT id FROM answer_analyses       WHERE conversation_state_id IN (         SELECT id FR…
DROP POLICY IF EXISTS "Users can insert own followup questions" ON "public"."followup_questions";
CREATE POLICY "Users can insert own followup questions" ON "public"."followup_questions"
  FOR INSERT
  WITH CHECK (answer_analysis_id IN (
          SELECT id FROM answer_analyses
          WHERE conversation_state_id IN (
            SELECT id FROM conversation_states
            WHERE interview_id IN (
              SELECT id FROM interviews WHERE user_id = (select auth.uid())
            )
          )
        ));

-- Users can view own followup questions [SELECT] from 020_dual_agent_conversation.sql
--   USING before: answer_analysis_id IN (       SELECT id FROM answer_analyses       WHERE conversation_state_id IN (         SELECT id FR…
DROP POLICY IF EXISTS "Users can view own followup questions" ON "public"."followup_questions";
CREATE POLICY "Users can view own followup questions" ON "public"."followup_questions"
  FOR SELECT
  USING (answer_analysis_id IN (
          SELECT id FROM answer_analyses
          WHERE conversation_state_id IN (
            SELECT id FROM conversation_states
            WHERE interview_id IN (
              SELECT id FROM interviews WHERE user_id = (select auth.uid())
            )
          )
        ));

-- ── public.interviews (5 policies) ──
-- campus_admin read org interviews [SELECT] from 005_campus.sql
--   USING before: user_id IN (       SELECT u.id       FROM   public.users u       JOIN   public.campus_organizations co ON u.campus_org_i…
DROP POLICY IF EXISTS "campus_admin read org interviews" ON "public"."interviews";
CREATE POLICY "campus_admin read org interviews" ON "public"."interviews"
  FOR SELECT
  USING (user_id IN (
          SELECT u.id
          FROM   public.users u
          JOIN   public.campus_organizations co ON u.campus_org_id = co.id
          WHERE  co.admin_user_id = (select auth.uid())
        ));

-- interviews_delete_own [DELETE] from 001_initial_schema.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "interviews_delete_own" ON "public"."interviews";
CREATE POLICY "interviews_delete_own" ON "public"."interviews"
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- interviews_insert_own [INSERT] from 001_initial_schema.sql
--   CHECK before: auth.uid() = user_id
DROP POLICY IF EXISTS "interviews_insert_own" ON "public"."interviews";
CREATE POLICY "interviews_insert_own" ON "public"."interviews"
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- interviews_select_own [SELECT] from 001_initial_schema.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "interviews_select_own" ON "public"."interviews";
CREATE POLICY "interviews_select_own" ON "public"."interviews"
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- interviews_update_own [UPDATE] from 001_initial_schema.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "interviews_update_own" ON "public"."interviews";
CREATE POLICY "interviews_update_own" ON "public"."interviews"
  FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- ── public.payments (2 policies) ──
-- payments_select_own [SELECT] from 035_one_time_plan_payments.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "payments_select_own" ON "public"."payments";
CREATE POLICY "payments_select_own" ON "public"."payments"
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- payments_service_role_full [ALL] from 036_payments_grants.sql
--   USING before: auth.role() = 'service_role'
--   CHECK before: auth.role() = 'service_role'
DROP POLICY IF EXISTS "payments_service_role_full" ON "public"."payments";
CREATE POLICY "payments_service_role_full" ON "public"."payments"
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- ── public.provider_failover_events (1 policy) ──
-- service_role_full [ALL] from 023_ai_telemetry.sql
--   USING before: auth.role() = 'service_role'
--   CHECK before: auth.role() = 'service_role'
DROP POLICY IF EXISTS "service_role_full" ON "public"."provider_failover_events";
CREATE POLICY "service_role_full" ON "public"."provider_failover_events"
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- ── public.provider_health_logs (1 policy) ──
-- service_role_full [ALL] from 023_ai_telemetry.sql
--   USING before: auth.role() = 'service_role'
--   CHECK before: auth.role() = 'service_role'
DROP POLICY IF EXISTS "service_role_full" ON "public"."provider_health_logs";
CREATE POLICY "service_role_full" ON "public"."provider_health_logs"
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- ── public.questions (3 policies) ──
-- questions_delete_own [DELETE] from 001_initial_schema.sql
--   USING before: EXISTS (       SELECT 1 FROM interviews       WHERE interviews.id = questions.interview_id         AND interviews.user_i…
DROP POLICY IF EXISTS "questions_delete_own" ON "public"."questions";
CREATE POLICY "questions_delete_own" ON "public"."questions"
  FOR DELETE
  USING (EXISTS (
          SELECT 1 FROM interviews
          WHERE interviews.id = questions.interview_id
            AND interviews.user_id = (select auth.uid())
        ));

-- questions_insert_own [INSERT] from 001_initial_schema.sql
--   CHECK before: EXISTS (       SELECT 1 FROM interviews       WHERE interviews.id = questions.interview_id         AND interviews.user_i…
DROP POLICY IF EXISTS "questions_insert_own" ON "public"."questions";
CREATE POLICY "questions_insert_own" ON "public"."questions"
  FOR INSERT
  WITH CHECK (EXISTS (
          SELECT 1 FROM interviews
          WHERE interviews.id = questions.interview_id
            AND interviews.user_id = (select auth.uid())
        ));

-- questions_select_own [SELECT] from 001_initial_schema.sql
--   USING before: EXISTS (       SELECT 1 FROM interviews       WHERE interviews.id = questions.interview_id         AND interviews.user_i…
DROP POLICY IF EXISTS "questions_select_own" ON "public"."questions";
CREATE POLICY "questions_select_own" ON "public"."questions"
  FOR SELECT
  USING (EXISTS (
          SELECT 1 FROM interviews
          WHERE interviews.id = questions.interview_id
            AND interviews.user_id = (select auth.uid())
        ));

-- ── public.realtime_session_metrics (1 policy) ──
-- service_role_full [ALL] from 023_ai_telemetry.sql
--   USING before: auth.role() = 'service_role'
--   CHECK before: auth.role() = 'service_role'
DROP POLICY IF EXISTS "service_role_full" ON "public"."realtime_session_metrics";
CREATE POLICY "service_role_full" ON "public"."realtime_session_metrics"
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- ── public.referrals (2 policies) ──
-- referrals_insert_own [INSERT] from 001_initial_schema.sql
--   CHECK before: auth.uid() = referrer_id
DROP POLICY IF EXISTS "referrals_insert_own" ON "public"."referrals";
CREATE POLICY "referrals_insert_own" ON "public"."referrals"
  FOR INSERT
  WITH CHECK ((select auth.uid()) = referrer_id);

-- referrals_select_own [SELECT] from 001_initial_schema.sql
--   USING before: auth.uid() = referrer_id OR auth.uid() = referred_id
DROP POLICY IF EXISTS "referrals_select_own" ON "public"."referrals";
CREATE POLICY "referrals_select_own" ON "public"."referrals"
  FOR SELECT
  USING ((select auth.uid()) = referrer_id OR (select auth.uid()) = referred_id);

-- ── public.reports (3 policies) ──
-- campus_admin read org reports [SELECT] from 005_campus.sql
--   USING before: interview_id IN (       SELECT i.id       FROM   public.interviews i       JOIN   public.users u ON i.user_id = u.id    …
DROP POLICY IF EXISTS "campus_admin read org reports" ON "public"."reports";
CREATE POLICY "campus_admin read org reports" ON "public"."reports"
  FOR SELECT
  USING (interview_id IN (
          SELECT i.id
          FROM   public.interviews i
          JOIN   public.users u ON i.user_id = u.id
          JOIN   public.campus_organizations co ON u.campus_org_id = co.id
          WHERE  co.admin_user_id = (select auth.uid())
        ));

-- reports_insert_own [INSERT] from 001_initial_schema.sql
--   CHECK before: EXISTS (       SELECT 1 FROM interviews       WHERE interviews.id = reports.interview_id         AND interviews.user_id …
DROP POLICY IF EXISTS "reports_insert_own" ON "public"."reports";
CREATE POLICY "reports_insert_own" ON "public"."reports"
  FOR INSERT
  WITH CHECK (EXISTS (
          SELECT 1 FROM interviews
          WHERE interviews.id = reports.interview_id
            AND interviews.user_id = (select auth.uid())
        ));

-- reports_select_own [SELECT] from 001_initial_schema.sql
--   USING before: EXISTS (       SELECT 1 FROM interviews       WHERE interviews.id = reports.interview_id         AND interviews.user_id …
DROP POLICY IF EXISTS "reports_select_own" ON "public"."reports";
CREATE POLICY "reports_select_own" ON "public"."reports"
  FOR SELECT
  USING (EXISTS (
          SELECT 1 FROM interviews
          WHERE interviews.id = reports.interview_id
            AND interviews.user_id = (select auth.uid())
        ));

-- ── public.resume_interview_snapshots (2 policies) ──
-- resume_interview_snapshots_select_own [SELECT] from 20260718000001_resume_versions_and_snapshots.sql
--   USING before: interview_id IN (SELECT id FROM public.interviews WHERE user_id = auth.uid())
DROP POLICY IF EXISTS "resume_interview_snapshots_select_own" ON "public"."resume_interview_snapshots";
CREATE POLICY "resume_interview_snapshots_select_own" ON "public"."resume_interview_snapshots"
  FOR SELECT
  USING (interview_id IN (SELECT id FROM public.interviews WHERE user_id = (select auth.uid())));

-- resume_interview_snapshots_service_role_full [ALL] from 20260718000001_resume_versions_and_snapshots.sql
--   USING before: auth.role() = 'service_role'
--   CHECK before: auth.role() = 'service_role'
DROP POLICY IF EXISTS "resume_interview_snapshots_service_role_full" ON "public"."resume_interview_snapshots";
CREATE POLICY "resume_interview_snapshots_service_role_full" ON "public"."resume_interview_snapshots"
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- ── public.resume_versions (2 policies) ──
-- resume_versions_select_own [SELECT] from 20260718000001_resume_versions_and_snapshots.sql
--   USING before: resume_id IN (SELECT id FROM public.resumes WHERE user_id = auth.uid())
DROP POLICY IF EXISTS "resume_versions_select_own" ON "public"."resume_versions";
CREATE POLICY "resume_versions_select_own" ON "public"."resume_versions"
  FOR SELECT
  USING (resume_id IN (SELECT id FROM public.resumes WHERE user_id = (select auth.uid())));

-- resume_versions_service_role_full [ALL] from 20260718000001_resume_versions_and_snapshots.sql
--   USING before: auth.role() = 'service_role'
--   CHECK before: auth.role() = 'service_role'
DROP POLICY IF EXISTS "resume_versions_service_role_full" ON "public"."resume_versions";
CREATE POLICY "resume_versions_service_role_full" ON "public"."resume_versions"
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- ── public.resumes (4 policies) ──
-- resumes_delete_own [DELETE] from 001_initial_schema.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "resumes_delete_own" ON "public"."resumes";
CREATE POLICY "resumes_delete_own" ON "public"."resumes"
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- resumes_insert_own [INSERT] from 001_initial_schema.sql
--   CHECK before: auth.uid() = user_id
DROP POLICY IF EXISTS "resumes_insert_own" ON "public"."resumes";
CREATE POLICY "resumes_insert_own" ON "public"."resumes"
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- resumes_select_own [SELECT] from 001_initial_schema.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "resumes_select_own" ON "public"."resumes";
CREATE POLICY "resumes_select_own" ON "public"."resumes"
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- resumes_update_own [UPDATE] from 001_initial_schema.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "resumes_update_own" ON "public"."resumes";
CREATE POLICY "resumes_update_own" ON "public"."resumes"
  FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- ── public.roadmap_tasks (2 policies) ──
-- roadmap_tasks_select_own [SELECT] from 049_candidate_workspace.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "roadmap_tasks_select_own" ON "public"."roadmap_tasks";
CREATE POLICY "roadmap_tasks_select_own" ON "public"."roadmap_tasks"
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- roadmap_tasks_update_own [UPDATE] from 049_candidate_workspace.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "roadmap_tasks_update_own" ON "public"."roadmap_tasks";
CREATE POLICY "roadmap_tasks_update_own" ON "public"."roadmap_tasks"
  FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- ── public.script_interview_reports (2 policies) ──
-- script_interview_reports_select_own [SELECT] from 20260717000002_script_interview_reports.sql
--   USING before: interview_id IN (       SELECT id FROM interviews WHERE user_id = auth.uid()     )
DROP POLICY IF EXISTS "script_interview_reports_select_own" ON "public"."script_interview_reports";
CREATE POLICY "script_interview_reports_select_own" ON "public"."script_interview_reports"
  FOR SELECT
  USING (interview_id IN (
          SELECT id FROM interviews WHERE user_id = (select auth.uid())
        ));

-- script_interview_reports_service_role_full [ALL] from 20260717000002_script_interview_reports.sql
--   USING before: auth.role() = 'service_role'
--   CHECK before: auth.role() = 'service_role'
DROP POLICY IF EXISTS "script_interview_reports_service_role_full" ON "public"."script_interview_reports";
CREATE POLICY "script_interview_reports_service_role_full" ON "public"."script_interview_reports"
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- ── public.script_turns (3 policies) ──
-- script_turns_insert_own [INSERT] from 20260711000001_v2_1_script_engine.sql
--   CHECK before: interview_id IN (       SELECT id FROM interviews WHERE user_id = auth.uid()     )
DROP POLICY IF EXISTS "script_turns_insert_own" ON "public"."script_turns";
CREATE POLICY "script_turns_insert_own" ON "public"."script_turns"
  FOR INSERT
  WITH CHECK (interview_id IN (
          SELECT id FROM interviews WHERE user_id = (select auth.uid())
        ));

-- script_turns_select_own [SELECT] from 20260711000001_v2_1_script_engine.sql
--   USING before: interview_id IN (       SELECT id FROM interviews WHERE user_id = auth.uid()     )
DROP POLICY IF EXISTS "script_turns_select_own" ON "public"."script_turns";
CREATE POLICY "script_turns_select_own" ON "public"."script_turns"
  FOR SELECT
  USING (interview_id IN (
          SELECT id FROM interviews WHERE user_id = (select auth.uid())
        ));

-- script_turns_update_own [UPDATE] from 20260711000001_v2_1_script_engine.sql
--   USING before: interview_id IN (       SELECT id FROM interviews WHERE user_id = auth.uid()     )
DROP POLICY IF EXISTS "script_turns_update_own" ON "public"."script_turns";
CREATE POLICY "script_turns_update_own" ON "public"."script_turns"
  FOR UPDATE
  USING (interview_id IN (
          SELECT id FROM interviews WHERE user_id = (select auth.uid())
        ));

-- ── public.session_quality_log (1 policy) ──
-- session_quality_log_select_own [SELECT] from 015_retention_system.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "session_quality_log_select_own" ON "public"."session_quality_log";
CREATE POLICY "session_quality_log_select_own" ON "public"."session_quality_log"
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ── public.subscriptions (3 policies) ──
-- subscriptions_insert_own [INSERT] from 001_initial_schema.sql
--   CHECK before: auth.uid() = user_id
DROP POLICY IF EXISTS "subscriptions_insert_own" ON "public"."subscriptions";
CREATE POLICY "subscriptions_insert_own" ON "public"."subscriptions"
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- subscriptions_select_own [SELECT] from 001_initial_schema.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "subscriptions_select_own" ON "public"."subscriptions";
CREATE POLICY "subscriptions_select_own" ON "public"."subscriptions"
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- subscriptions_update_own [UPDATE] from 001_initial_schema.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "subscriptions_update_own" ON "public"."subscriptions";
CREATE POLICY "subscriptions_update_own" ON "public"."subscriptions"
  FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- ── public.tool_usage_events (1 policy) ──
-- tool_usage_events_service_full [ALL] from 20260720000001_tool_usage_events.sql
--   USING before: auth.role() = 'service_role'
--   CHECK before: auth.role() = 'service_role'
DROP POLICY IF EXISTS "tool_usage_events_service_full" ON "public"."tool_usage_events";
CREATE POLICY "tool_usage_events_service_full" ON "public"."tool_usage_events"
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- ── public.user_activity (1 policy) ──
-- service_role_full [ALL] from 024_user_presence.sql
--   USING before: auth.role() = 'service_role'
--   CHECK before: auth.role() = 'service_role'
DROP POLICY IF EXISTS "service_role_full" ON "public"."user_activity";
CREATE POLICY "service_role_full" ON "public"."user_activity"
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- ── public.user_ai_usage_rollups (2 policies) ──
-- service_role_full [ALL] from 023_ai_telemetry.sql
--   USING before: auth.role() = 'service_role'
--   CHECK before: auth.role() = 'service_role'
DROP POLICY IF EXISTS "service_role_full" ON "public"."user_ai_usage_rollups";
CREATE POLICY "service_role_full" ON "public"."user_ai_usage_rollups"
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- users_read_own [SELECT] from 023_ai_telemetry.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "users_read_own" ON "public"."user_ai_usage_rollups";
CREATE POLICY "users_read_own" ON "public"."user_ai_usage_rollups"
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ── public.user_progress (1 policy) ──
-- user_progress_select_own [SELECT] from 015_retention_system.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "user_progress_select_own" ON "public"."user_progress";
CREATE POLICY "user_progress_select_own" ON "public"."user_progress"
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ── public.user_roadmaps (1 policy) ──
-- user_roadmaps_select_own [SELECT] from 049_candidate_workspace.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "user_roadmaps_select_own" ON "public"."user_roadmaps";
CREATE POLICY "user_roadmaps_select_own" ON "public"."user_roadmaps"
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ── public.users (2 policies) ──
-- users_select_own [SELECT] from 001_initial_schema.sql
--   USING before: auth.uid() = id
DROP POLICY IF EXISTS "users_select_own" ON "public"."users";
CREATE POLICY "users_select_own" ON "public"."users"
  FOR SELECT
  USING ((select auth.uid()) = id);

-- users_update_own [UPDATE] from 001_initial_schema.sql
--   USING before: auth.uid() = id
DROP POLICY IF EXISTS "users_update_own" ON "public"."users";
CREATE POLICY "users_update_own" ON "public"."users"
  FOR UPDATE
  USING ((select auth.uid()) = id);

-- ── public.voice_usage_logs (2 policies) ──
-- service_role_full [ALL] from 023_ai_telemetry.sql
--   USING before: auth.role() = 'service_role'
--   CHECK before: auth.role() = 'service_role'
DROP POLICY IF EXISTS "service_role_full" ON "public"."voice_usage_logs";
CREATE POLICY "service_role_full" ON "public"."voice_usage_logs"
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- users_read_own [SELECT] from 023_ai_telemetry.sql
--   USING before: auth.uid() = user_id
DROP POLICY IF EXISTS "users_read_own" ON "public"."voice_usage_logs";
CREATE POLICY "users_read_own" ON "public"."voice_usage_logs"
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ── storage.objects (6 policies) ──
-- storage_feedback_screenshots_insert_own [INSERT] from 028_feedback_screenshots.sql
--   CHECK before: bucket_id = 'feedback-screenshots'   AND (storage.foldername(name))[1] = 'feedback'   AND (storage.foldername(name))[2] …
DROP POLICY IF EXISTS "storage_feedback_screenshots_insert_own" ON "storage"."objects";
CREATE POLICY "storage_feedback_screenshots_insert_own" ON "storage"."objects"
  FOR INSERT TO "authenticated"
  WITH CHECK (bucket_id = 'feedback-screenshots'
      AND (storage.foldername(name))[1] = 'feedback'
      AND (storage.foldername(name))[2] = (select auth.uid())::text);

-- storage_feedback_screenshots_select_own [SELECT] from 028_feedback_screenshots.sql
--   USING before: bucket_id = 'feedback-screenshots'   AND (storage.foldername(name))[2] = auth.uid()::text
DROP POLICY IF EXISTS "storage_feedback_screenshots_select_own" ON "storage"."objects";
CREATE POLICY "storage_feedback_screenshots_select_own" ON "storage"."objects"
  FOR SELECT TO "authenticated"
  USING (bucket_id = 'feedback-screenshots'
      AND (storage.foldername(name))[2] = (select auth.uid())::text);

-- storage_profile_photos_delete_own [DELETE] from 038_user_profile_photos.sql
--   USING before: bucket_id = 'profile-photos'   AND (storage.foldername(name))[1] = auth.uid()::text
DROP POLICY IF EXISTS "storage_profile_photos_delete_own" ON "storage"."objects";
CREATE POLICY "storage_profile_photos_delete_own" ON "storage"."objects"
  FOR DELETE TO "authenticated"
  USING (bucket_id = 'profile-photos'
      AND (storage.foldername(name))[1] = (select auth.uid())::text);

-- storage_profile_photos_insert_own [INSERT] from 038_user_profile_photos.sql
--   CHECK before: bucket_id = 'profile-photos'   AND (storage.foldername(name))[1] = auth.uid()::text
DROP POLICY IF EXISTS "storage_profile_photos_insert_own" ON "storage"."objects";
CREATE POLICY "storage_profile_photos_insert_own" ON "storage"."objects"
  FOR INSERT TO "authenticated"
  WITH CHECK (bucket_id = 'profile-photos'
      AND (storage.foldername(name))[1] = (select auth.uid())::text);

-- storage_profile_photos_update_own [UPDATE] from 038_user_profile_photos.sql
--   USING before: bucket_id = 'profile-photos'   AND (storage.foldername(name))[1] = auth.uid()::text
--   CHECK before: bucket_id = 'profile-photos'   AND (storage.foldername(name))[1] = auth.uid()::text
DROP POLICY IF EXISTS "storage_profile_photos_update_own" ON "storage"."objects";
CREATE POLICY "storage_profile_photos_update_own" ON "storage"."objects"
  FOR UPDATE TO "authenticated"
  USING (bucket_id = 'profile-photos'
      AND (storage.foldername(name))[1] = (select auth.uid())::text)
  WITH CHECK (bucket_id = 'profile-photos'
      AND (storage.foldername(name))[1] = (select auth.uid())::text);

-- storage_resumes_insert_own_uid [INSERT] from 014_storage_objects_resumes_insert_own.sql
--   CHECK before: bucket_id = 'resumes'   AND (storage.foldername(name))[1] = auth.uid()::text
DROP POLICY IF EXISTS "storage_resumes_insert_own_uid" ON "storage"."objects";
CREATE POLICY "storage_resumes_insert_own_uid" ON "storage"."objects"
  FOR INSERT TO "authenticated"
  WITH CHECK (bucket_id = 'resumes'
      AND (storage.foldername(name))[1] = (select auth.uid())::text);


-- ============================================================================
-- Safety net: wrap any remaining bare auth.* / current_setting() calls in
-- public + storage policies (covers production-only policy names not present
-- in migration history, e.g. Dashboard-created aliases).
-- Logs each rewrite via RAISE NOTICE for review in the SQL Editor output.
-- ============================================================================

CREATE OR REPLACE FUNCTION pg_temp.ie_wrap_rls_initplan(expr text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  result text := expr;
BEGIN
  IF result IS NULL THEN
    RETURN NULL;
  END IF;

  -- Wrap auth.uid() / auth.role() / auth.jwt() / auth.email()
  result := regexp_replace(
    result,
    'auth\.(uid|role|jwt|email)\s*\(\s*\)',
    '(select auth.\1())',
    'gi'
  );

  -- Wrap current_setting('...') and current_setting('...', true|false)
  result := regexp_replace(
    result,
    '(current_setting\s*\(\s*''[^'']+''\s*(,\s*(true|false))?\s*\))',
    '(select \1)',
    'gi'
  );

  -- Collapse accidental double-wrap from already-fixed expressions
  result := regexp_replace(
    result,
    '\(\s*select\s*\(\s*select\s*(auth\.(uid|role|jwt|email)\(\))\s*\)\s*\)',
    '(select \1)',
    'gi'
  );
  result := regexp_replace(
    result,
    '\(\s*select\s*\(\s*select\s*(current_setting\s*\([^)]*\))\s*\)\s*\)',
    '(select \1)',
    'gi'
  );

  RETURN result;
END;
$fn$;

DO $body$
DECLARE
  r record;
  new_using text;
  new_check text;
  altered int := 0;
  sql text;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schemaname,
      c.relname AS tablename,
      p.polname AS policyname,
      pg_get_expr(p.polqual, p.polrelid) AS qual,
      pg_get_expr(p.polwithcheck, p.polrelid) AS with_check
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'storage')
  LOOP
    new_using := pg_temp.ie_wrap_rls_initplan(r.qual);
    new_check := pg_temp.ie_wrap_rls_initplan(r.with_check);

    IF new_using IS NOT DISTINCT FROM r.qual
       AND new_check IS NOT DISTINCT FROM r.with_check THEN
      CONTINUE;
    END IF;

    RAISE NOTICE 'initplan-wrap: %.% policy "%" ', r.schemaname, r.tablename, r.policyname;

    -- Build ALTER POLICY dynamically. Only include clauses that exist.
    sql := format(
      'ALTER POLICY %I ON %I.%I',
      r.policyname,
      r.schemaname,
      r.tablename
    );

    IF r.qual IS NOT NULL THEN
      sql := sql || format(' USING (%s)', new_using);
    END IF;

    IF r.with_check IS NOT NULL THEN
      sql := sql || format(' WITH CHECK (%s)', new_check);
    END IF;

    EXECUTE sql;
    altered := altered + 1;
  END LOOP;

  RAISE NOTICE 'auth_rls_initplan safety-net altered % remaining policies', altered;
END;
$body$;

DROP FUNCTION IF EXISTS pg_temp.ie_wrap_rls_initplan(text);

COMMIT;

-- ============================================================================
-- Post-apply verification (run separately, outside the transaction above):
--
-- SELECT schemaname, tablename, policyname, qual, with_check
-- FROM pg_policies
-- WHERE schemaname IN ('public', 'storage')
--   AND (
--     (qual ~* 'auth\.(uid|role|jwt|email)\s*\(' AND qual !~* '\(\s*select\s+auth\.')
--     OR (with_check ~* 'auth\.(uid|role|jwt|email)\s*\(' AND with_check !~* '\(\s*select\s+auth\.')
--   );
--
-- Expect: 0 rows.
-- ============================================================================
*/
