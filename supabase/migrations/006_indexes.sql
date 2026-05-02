-- ─── Migration 006: Performance Indexes ───────────────────────────────────────
-- Adds indexes for the most common query patterns to reduce p95 latency.
-- Verified against EXPLAIN ANALYZE output targets from spec.

-- interviews: filter by user + status (dashboard list, credit checks)
create index if not exists idx_interviews_user_status
  on public.interviews(user_id, status);

-- interviews: filter by user + completed_at (trend chart, report fetching)
create index if not exists idx_interviews_user_completed_at
  on public.interviews(user_id, completed_at);

-- evaluations: join from answers (report generation, per-question display)
create index if not exists idx_evaluations_answer_id
  on public.evaluations(answer_id);

-- reports: join from interviews (report page fetch, trend data)
create index if not exists idx_reports_interview_id
  on public.reports(interview_id);

-- questions: filter by interview_id (interview loop, answer validation)
create index if not exists idx_questions_interview_id
  on public.questions(interview_id);

-- answers: join from questions (report generation)
create index if not exists idx_answers_question_id
  on public.answers(question_id);

-- subscriptions: lookup by user (payment webhook, plan check)
create index if not exists idx_subscriptions_user_id
  on public.subscriptions(user_id);