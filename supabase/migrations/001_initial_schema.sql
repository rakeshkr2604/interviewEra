-- InterviewEra — Initial Schema Migration
-- Phase 1 Week 1-2: All 10 tables, 8 ENUMs, RLS, GIN index, auto-user trigger

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── ENUMs (idempotent) ─────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE plan_tier AS ENUM ('free', 'starter', 'pro', 'campus');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE interview_status AS ENUM ('pending', 'in_progress', 'completed', 'abandoned');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE resume_status AS ENUM ('uploading', 'parsing', 'parsed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE answer_mode AS ENUM ('text', 'voice');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE credit_type AS ENUM ('debit', 'credit');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE referral_status AS ENUM ('pending', 'completed', 'credited');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE interview_difficulty AS ENUM ('easy', 'medium', 'hard');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE question_category AS ENUM ('technical', 'behavioral', 'situational');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Tables (idempotent) ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  plan_tier plan_tier NOT NULL DEFAULT 'free',
  credits_remaining INTEGER NOT NULL DEFAULT 5,
  placement_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT,
  raw_text TEXT,
  parsed_data JSONB,
  status resume_status NOT NULL DEFAULT 'uploading',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  difficulty interview_difficulty NOT NULL DEFAULT 'medium',
  question_count INTEGER NOT NULL DEFAULT 6,
  status interview_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  rubric JSONB NOT NULL,
  category question_category NOT NULL
);

CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  answer_mode answer_mode NOT NULL DEFAULT 'text',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  overall_score NUMERIC(4,2) NOT NULL,
  dimension_scores JSONB NOT NULL,
  feedback_text TEXT NOT NULL,
  detailed_analysis JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  overall_score NUMERIC(4,2) NOT NULL,
  radar_data JSONB NOT NULL,
  trend_data JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan plan_tier NOT NULL,
  razorpay_sub_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status referral_status NOT NULL DEFAULT 'pending',
  credited_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type credit_type NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_resumes_parsed_data ON resumes USING GIN(parsed_data);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_interview_id ON questions(interview_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_answer_id ON evaluations(answer_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);

-- ─── Trigger: auto-create public.users on auth signup ────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, plan_tier, credits_remaining)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    'free',
    5
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "resumes_select_own" ON resumes;
CREATE POLICY "resumes_select_own" ON resumes
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "resumes_insert_own" ON resumes;
CREATE POLICY "resumes_insert_own" ON resumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "resumes_update_own" ON resumes;
CREATE POLICY "resumes_update_own" ON resumes
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "resumes_delete_own" ON resumes;
CREATE POLICY "resumes_delete_own" ON resumes
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "interviews_select_own" ON interviews;
CREATE POLICY "interviews_select_own" ON interviews
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "interviews_insert_own" ON interviews;
CREATE POLICY "interviews_insert_own" ON interviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "interviews_update_own" ON interviews;
CREATE POLICY "interviews_update_own" ON interviews
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "interviews_delete_own" ON interviews;
CREATE POLICY "interviews_delete_own" ON interviews
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "questions_select_own" ON questions;
CREATE POLICY "questions_select_own" ON questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = questions.interview_id
        AND interviews.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "questions_insert_own" ON questions;
CREATE POLICY "questions_insert_own" ON questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = questions.interview_id
        AND interviews.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "questions_delete_own" ON questions;
CREATE POLICY "questions_delete_own" ON questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = questions.interview_id
        AND interviews.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "answers_select_own" ON answers;
CREATE POLICY "answers_select_own" ON answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM questions
      JOIN interviews ON interviews.id = questions.interview_id
      WHERE questions.id = answers.question_id
        AND interviews.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "answers_insert_own" ON answers;
CREATE POLICY "answers_insert_own" ON answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM questions
      JOIN interviews ON interviews.id = questions.interview_id
      WHERE questions.id = answers.question_id
        AND interviews.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "evaluations_select_own" ON evaluations;
CREATE POLICY "evaluations_select_own" ON evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM answers
      JOIN questions ON questions.id = answers.question_id
      JOIN interviews ON interviews.id = questions.interview_id
      WHERE answers.id = evaluations.answer_id
        AND interviews.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "evaluations_insert_own" ON evaluations;
CREATE POLICY "evaluations_insert_own" ON evaluations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM answers
      JOIN questions ON questions.id = answers.question_id
      JOIN interviews ON interviews.id = questions.interview_id
      WHERE answers.id = evaluations.answer_id
        AND interviews.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "reports_select_own" ON reports;
CREATE POLICY "reports_select_own" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = reports.interview_id
        AND interviews.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = reports.interview_id
        AND interviews.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "subscriptions_insert_own" ON subscriptions;
CREATE POLICY "subscriptions_insert_own" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "subscriptions_update_own" ON subscriptions;
CREATE POLICY "subscriptions_update_own" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "referrals_select_own" ON referrals;
CREATE POLICY "referrals_select_own" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
DROP POLICY IF EXISTS "referrals_insert_own" ON referrals;
CREATE POLICY "referrals_insert_own" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "credit_transactions_select_own" ON credit_transactions;
CREATE POLICY "credit_transactions_select_own" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "credit_transactions_insert_own" ON credit_transactions;
CREATE POLICY "credit_transactions_insert_own" ON credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Role Grants ─────────────────────────────────────────────────────────────
-- Supabase dashboard auto-adds these; raw SQL migrations do not.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  users, resumes, interviews, questions, answers,
  evaluations, reports, subscriptions, referrals, credit_transactions
TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
