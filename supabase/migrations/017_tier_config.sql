-- InterviewEra — Tier Config Table
-- Creates the tier_config reference table that was defined in the unnumbered
-- historical draft supabase/manual/supabase-migration-retention-system.sql
-- but never included in the numbered migration sequence applied to production.
--
-- tier_config is read-only reference data (like a pricing / difficulty table).
-- No user writes needed — only service_role inserts the seed rows here.

BEGIN;

CREATE TABLE IF NOT EXISTS tier_config (
  tier_id      INTEGER PRIMARY KEY CHECK (tier_id BETWEEN 1 AND 4),
  tier_name    TEXT    NOT NULL,
  unlock_criteria   JSONB   NOT NULL,
  features_enabled  TEXT[]  NOT NULL,
  display_order     INTEGER NOT NULL,
  description       TEXT,
  prompt_modifiers  JSONB
);

-- Seed rows — skip if already present (idempotent re-run)
INSERT INTO tier_config (tier_id, tier_name, unlock_criteria, features_enabled, display_order, description, prompt_modifiers)
VALUES
  (1, 'Fundamentals',
   '{"sessions_required": null}'::jsonb,
   ARRAY['basic_questions', '5d_scoring'],
   1,
   'Master the basics with standard behavioral and technical questions',
   '{"difficulty": "EASY", "question_types": ["basic_behavioral", "resume_technical"]}'::jsonb
  ),
  (2, 'Advanced Questions',
   '{"sessions_required": 3, "min_score": 7.0, "score_type": "any_dimension"}'::jsonb,
   ARRAY['hard_behavioral', 'deep_resume_probe'],
   2,
   'Tackle harder questions with deeper technical probing',
   '{"difficulty": "MEDIUM", "question_types": ["deep_behavioral", "technical_design"]}'::jsonb
  ),
  (3, 'Company Patterns',
   '{"sessions_required": 5, "min_score": 7.5, "score_type": "rolling_average"}'::jsonb,
   ARRAY['company_specific', 'panel_simulation'],
   3,
   'Practice with company-specific question patterns',
   '{"difficulty": "MEDIUM-HARD", "question_types": ["company_specific", "industry_scenarios"]}'::jsonb
  ),
  (4, 'Mock Panel Mode',
   '{"min_score": 8.0, "score_type": "overall_average"}'::jsonb,
   ARRAY['multi_round', 'followup_questions', 'stress_mode'],
   4,
   'Face realistic panel interviews with stress scenarios',
   '{"difficulty": "HARD", "question_types": ["stress_questions", "follow_up_chains"]}'::jsonb
  )
ON CONFLICT (tier_id) DO NOTHING;

-- RLS: reference data — every authenticated user may read, nobody writes via API
ALTER TABLE tier_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tier_config_select_authenticated"
  ON tier_config FOR SELECT
  TO authenticated
  USING (true);

-- service_role bypasses RLS and can do anything (seed / admin updates)
GRANT SELECT ON tier_config TO authenticated;
GRANT SELECT ON tier_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON tier_config TO service_role;

COMMIT;
