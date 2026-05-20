-- InterviewEra — Dual-Agent Conversation System Migration
-- Adds conversation-state tracking for the Interviewer (Agent 1) + Evaluator (Agent 2) loop.
--
-- Scope of this file:
--   • conversation_states  — per-interview running state (turns, difficulty, rapport, probes)
--   • answer_analyses      — Agent 2's structured per-answer analysis
--   • followup_questions   — generated follow-ups, retained for learning/improvement
--   • indexes, RLS, and updated_at trigger
--
-- Ownership is derived transitively: conversation_states.interview_id -> interviews.user_id.
-- All write paths run through service-role API routes; authenticated users get SELECT only,
-- matching the 001/015 RLS + grant pattern.

BEGIN;

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- Conversation state tracking. One row per interview, updated on every turn.
CREATE TABLE IF NOT EXISTS conversation_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  questions_asked jsonb DEFAULT '[]'::jsonb,
  answers_received jsonb DEFAULT '[]'::jsonb,
  current_difficulty_level integer DEFAULT 5 CHECK (current_difficulty_level BETWEEN 1 AND 10),
  confidence_trend integer[] DEFAULT ARRAY[]::integer[],
  topics_covered text[] DEFAULT ARRAY[]::text[],
  topics_to_probe text[] DEFAULT ARRAY[]::text[],
  rapport_level integer DEFAULT 5 CHECK (rapport_level BETWEEN 1 AND 10),
  current_question_index integer DEFAULT 0,
  needs_followup boolean DEFAULT false,
  followup_context jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Answer analyses from Agent 2 (Evaluator).
CREATE TABLE IF NOT EXISTS answer_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_state_id uuid NOT NULL REFERENCES conversation_states(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  answer_text text NOT NULL,
  confidence_level integer NOT NULL CHECK (confidence_level BETWEEN 1 AND 10),
  technical_depth integer NOT NULL CHECK (technical_depth BETWEEN 1 AND 10),
  specificity integer NOT NULL CHECK (specificity BETWEEN 1 AND 10),
  communication_clarity integer NOT NULL CHECK (communication_clarity BETWEEN 1 AND 10),
  missing_details text[] DEFAULT ARRAY[]::text[],
  strengths text[] DEFAULT ARRAY[]::text[],
  red_flags text[] DEFAULT ARRAY[]::text[],
  recommended_followup_type text NOT NULL CHECK (
    recommended_followup_type IN ('probe_depth', 'clarify', 'challenge', 'acknowledge_move_on')
  ),
  analysis_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Follow-up questions generated (for learning/improvement).
CREATE TABLE IF NOT EXISTS followup_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_analysis_id uuid NOT NULL REFERENCES answer_analyses(id) ON DELETE CASCADE,
  original_question text NOT NULL,
  original_answer text NOT NULL,
  followup_question text NOT NULL,
  followup_type text NOT NULL,
  was_used boolean DEFAULT false,
  user_response text,
  created_at timestamptz DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
-- One conversation_state per interview. UNIQUE doubles as the lookup index and
-- makes lazy initialization idempotent under concurrent first-answer submits.
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_states_interview_id
  ON conversation_states(interview_id);
CREATE INDEX IF NOT EXISTS idx_answer_analyses_conversation_state_id
  ON answer_analyses(conversation_state_id);
CREATE INDEX IF NOT EXISTS idx_followup_questions_analysis_id
  ON followup_questions(answer_analysis_id);

-- ─── updated_at trigger for conversation_states ─────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_conversation_states_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversation_states_touch_updated_at ON conversation_states;
CREATE TRIGGER trg_conversation_states_touch_updated_at
  BEFORE UPDATE ON conversation_states
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_states_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_questions ENABLE ROW LEVEL SECURITY;

-- conversation_states: owned transitively via interviews.user_id.
DROP POLICY IF EXISTS "Users can view own conversation states" ON conversation_states;
CREATE POLICY "Users can view own conversation states"
  ON conversation_states FOR SELECT
  USING (
    interview_id IN (
      SELECT id FROM interviews WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own conversation states" ON conversation_states;
CREATE POLICY "Users can insert own conversation states"
  ON conversation_states FOR INSERT
  WITH CHECK (
    interview_id IN (
      SELECT id FROM interviews WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own conversation states" ON conversation_states;
CREATE POLICY "Users can update own conversation states"
  ON conversation_states FOR UPDATE
  USING (
    interview_id IN (
      SELECT id FROM interviews WHERE user_id = auth.uid()
    )
  );

-- answer_analyses: owned via conversation_states -> interviews.
DROP POLICY IF EXISTS "Users can view own answer analyses" ON answer_analyses;
CREATE POLICY "Users can view own answer analyses"
  ON answer_analyses FOR SELECT
  USING (
    conversation_state_id IN (
      SELECT id FROM conversation_states
      WHERE interview_id IN (
        SELECT id FROM interviews WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own answer analyses" ON answer_analyses;
CREATE POLICY "Users can insert own answer analyses"
  ON answer_analyses FOR INSERT
  WITH CHECK (
    conversation_state_id IN (
      SELECT id FROM conversation_states
      WHERE interview_id IN (
        SELECT id FROM interviews WHERE user_id = auth.uid()
      )
    )
  );

-- followup_questions: owned via answer_analyses -> conversation_states -> interviews.
DROP POLICY IF EXISTS "Users can view own followup questions" ON followup_questions;
CREATE POLICY "Users can view own followup questions"
  ON followup_questions FOR SELECT
  USING (
    answer_analysis_id IN (
      SELECT id FROM answer_analyses
      WHERE conversation_state_id IN (
        SELECT id FROM conversation_states
        WHERE interview_id IN (
          SELECT id FROM interviews WHERE user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own followup questions" ON followup_questions;
CREATE POLICY "Users can insert own followup questions"
  ON followup_questions FOR INSERT
  WITH CHECK (
    answer_analysis_id IN (
      SELECT id FROM answer_analyses
      WHERE conversation_state_id IN (
        SELECT id FROM conversation_states
        WHERE interview_id IN (
          SELECT id FROM interviews WHERE user_id = auth.uid()
        )
      )
    )
  );

-- ─── Role grants (matching 001/015 pattern) ─────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE
  ON conversation_states, answer_analyses, followup_questions TO service_role;
GRANT SELECT
  ON conversation_states, answer_analyses, followup_questions TO authenticated;

COMMIT;
