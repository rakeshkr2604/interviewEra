-- InterviewEra Retention System Migration
-- Enhances existing schema with Progress Gates, Quality Streaks, and B2B features
-- Date: 2026-05-14

-- ============================================================================
-- PART 1: MODIFY EXISTING TABLES
-- ============================================================================

-- Add abuse prevention columns to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS resume_hash TEXT;

-- Add index for abuse checking
CREATE INDEX IF NOT EXISTS idx_users_device_fingerprint ON users(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_users_resume_hash ON users(resume_hash);

-- Add expires_at for unlimited Placement Season plans
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add tier tracking to interviews (know which tier user was at)
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS tier_at_attempt INTEGER DEFAULT 1;

-- ============================================================================
-- PART 2: USER PROGRESS & RETENTION
-- ============================================================================

-- User progress table (Progress Gates + Quality Streaks)
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Progress Gates
  current_tier INTEGER DEFAULT 1 CHECK (current_tier BETWEEN 1 AND 4),
  tier_unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  total_sessions INTEGER DEFAULT 0,
  sessions_at_current_tier INTEGER DEFAULT 0,
  
  -- Score tracking for tier unlocks
  overall_avg_score NUMERIC(3,1),
  max_dimension_score NUMERIC(3,1),
  last_5_sessions_avg NUMERIC(3,1),
  
  -- Quality Streaks
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_quality_session_date DATE,
  
  -- Badges (JSONB array)
  badges_earned JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"badge": "consistent_learner", "earned_at": "2026-05-03"}]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_tier ON user_progress(current_tier);
CREATE INDEX idx_user_progress_streak ON user_progress(current_streak DESC);

-- Session quality log (for streak tracking)
CREATE TABLE IF NOT EXISTS session_quality_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  
  -- Quality criteria
  questions_answered INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  avg_answer_duration INTEGER NOT NULL, -- in seconds
  session_score NUMERIC(3,1) NOT NULL,
  quality_met BOOLEAN NOT NULL,
  
  -- Metadata
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_quality_user ON session_quality_log(user_id, completed_at DESC);
CREATE INDEX idx_session_quality_date ON session_quality_log(completed_at);

-- ============================================================================
-- PART 3: COLLEGE B2B ENHANCEMENTS
-- ============================================================================

-- Enhance campus_organizations with new fields
ALTER TABLE campus_organizations
  ADD COLUMN IF NOT EXISTS tier TEXT CHECK (tier IN ('tier1', 'tier2', 'tier3')),
  ADD COLUMN IF NOT EXISTS license_type TEXT CHECK (license_type IN ('small', 'medium', 'premium')),
  ADD COLUMN IF NOT EXISTS max_students INTEGER,
  ADD COLUMN IF NOT EXISTS enable_peer_comparison BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_leaderboard BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_skill_bridge BOOLEAN DEFAULT true;

-- College student enrollments (extends existing campus relationship)
CREATE TABLE IF NOT EXISTS college_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES campus_organizations(id) ON DELETE CASCADE,
  
  -- Student info
  roll_number TEXT,
  branch TEXT, -- CSE, ECE, etc.
  year INTEGER, -- 3rd/4th year
  
  -- Status
  enrollment_status TEXT CHECK (enrollment_status IN ('active', 'completed', 'dropped')) DEFAULT 'active',
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Performance snapshot (cached for T&P dashboard)
  total_sessions INTEGER DEFAULT 0,
  avg_score NUMERIC(3,1),
  current_tier INTEGER DEFAULT 1,
  placement_ready BOOLEAN DEFAULT false,
  
  UNIQUE(user_id, college_id)
);

CREATE INDEX idx_college_enrollments_college ON college_enrollments(college_id);
CREATE INDEX idx_college_enrollments_user ON college_enrollments(user_id);
CREATE INDEX idx_college_enrollments_status ON college_enrollments(enrollment_status);

-- College deadlines (set by T&P officer)
CREATE TABLE IF NOT EXISTS college_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES campus_organizations(id) ON DELETE CASCADE,
  
  deadline_type TEXT CHECK (deadline_type IN ('sessions', 'tier', 'score')) NOT NULL,
  target_value INTEGER NOT NULL, -- e.g., "complete 10 sessions" or "reach tier 2"
  due_date DATE NOT NULL,
  
  description TEXT, -- "Complete baseline assessment"
  mandatory BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_college_deadlines_college ON college_deadlines(college_id);
CREATE INDEX idx_college_deadlines_due_date ON college_deadlines(due_date);

-- Student deadline tracking
CREATE TABLE IF NOT EXISTS student_deadline_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deadline_id UUID NOT NULL REFERENCES college_deadlines(id) ON DELETE CASCADE,
  
  current_progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  UNIQUE(user_id, deadline_id)
);

CREATE INDEX idx_student_deadline_user ON student_deadline_progress(user_id);
CREATE INDEX idx_student_deadline_deadline ON student_deadline_progress(deadline_id);

-- Cohort leaderboard (optional, enabled per college)
CREATE TABLE IF NOT EXISTS cohort_leaderboard (
  college_id UUID NOT NULL REFERENCES campus_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  rank INTEGER,
  total_score NUMERIC(5,2),
  sessions_completed INTEGER,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (college_id, user_id)
);

CREATE INDEX idx_cohort_leaderboard_college_rank ON cohort_leaderboard(college_id, rank);

-- T&P Officer action log (audit trail)
CREATE TABLE IF NOT EXISTS college_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES campus_organizations(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  action_type TEXT NOT NULL, -- 'reminder_sent', 'deadline_created', 'report_exported'
  target_users UUID[], -- array of user_ids affected
  metadata JSONB, -- action details
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_college_admin_actions_college ON college_admin_actions(college_id, created_at DESC);

-- ============================================================================
-- PART 4: SKILL BRIDGE (Pro Feature)
-- ============================================================================

-- User roadmaps (generated by AI)
CREATE TABLE IF NOT EXISTS user_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Roadmap metadata
  title TEXT NOT NULL, -- "30-Day DSA Improvement Plan"
  target_skill TEXT NOT NULL, -- "Data Structures & Algorithms"
  target_role TEXT, -- "SDE", "DevOps", etc.
  
  -- Generation context
  generated_from_scores JSONB, -- weak dimensions that triggered this
  language_preference TEXT DEFAULT 'en', -- 'en', 'hi'
  
  -- Structure
  duration_days INTEGER NOT NULL, -- typically 30
  roadmap_data JSONB NOT NULL,
  -- Example structure:
  -- {
  --   "weeks": [
  --     {
  --       "week_number": 1,
  --       "focus": "Arrays & Strings",
  --       "days": [...]
  --     }
  --   ]
  -- }
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0, -- monthly limit check
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- refresh allowed after expiry
  
  status TEXT CHECK (status IN ('active', 'completed', 'expired')) DEFAULT 'active'
);

CREATE INDEX idx_user_roadmaps_user ON user_roadmaps(user_id);
CREATE INDEX idx_user_roadmaps_status ON user_roadmaps(status);

-- Roadmap task progress (daily to-dos)
CREATE TABLE IF NOT EXISTS roadmap_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES user_roadmaps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Task details
  day_number INTEGER NOT NULL,
  task_type TEXT CHECK (task_type IN ('video', 'practice', 'reading')) NOT NULL,
  task_description TEXT NOT NULL,
  
  -- Resources
  resource_url TEXT, -- YouTube link, LeetCode problem, etc.
  resource_metadata JSONB, -- title, duration, creator
  
  -- Completion
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roadmap_tasks_roadmap ON roadmap_tasks(roadmap_id);
CREATE INDEX idx_roadmap_tasks_user ON roadmap_tasks(user_id, completed);

-- ============================================================================
-- PART 5: TIER CONFIGURATION (Reference Data)
-- ============================================================================

-- Tier definitions (can be modified without code changes)
CREATE TABLE IF NOT EXISTS tier_config (
  tier_id INTEGER PRIMARY KEY CHECK (tier_id BETWEEN 1 AND 4),
  tier_name TEXT NOT NULL,
  
  -- Unlock criteria
  unlock_criteria JSONB NOT NULL,
  -- Example: {"sessions_required": 3, "min_score": 7.0, "score_type": "any_dimension"}
  
  -- Features enabled at this tier
  features_enabled TEXT[] NOT NULL,
  -- Example: ["basic_questions", "5d_scoring"]
  
  -- Display
  display_order INTEGER NOT NULL,
  description TEXT,
  
  -- Prompt modifiers for question generation
  prompt_modifiers JSONB
  -- Example: {"difficulty": "EASY", "question_types": ["basic_behavioral"]}
);

-- Insert default tier configuration
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

-- ============================================================================
-- PART 6: FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Auto-create user_progress on user creation
CREATE OR REPLACE FUNCTION create_user_progress()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_progress (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create progress record for new users
DROP TRIGGER IF EXISTS on_user_created ON users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_progress();

-- Function: Update user_progress.updated_at on modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS update_user_progress_updated_at ON user_progress;
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Sync college enrollment stats with user_progress
CREATE OR REPLACE FUNCTION sync_enrollment_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE college_enrollments
  SET 
    total_sessions = (SELECT total_sessions FROM user_progress WHERE user_id = NEW.user_id),
    avg_score = (SELECT overall_avg_score FROM user_progress WHERE user_id = NEW.user_id),
    current_tier = (SELECT current_tier FROM user_progress WHERE user_id = NEW.user_id)
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Keep college enrollment stats in sync
DROP TRIGGER IF EXISTS sync_enrollment_on_progress_update ON user_progress;
CREATE TRIGGER sync_enrollment_on_progress_update
  AFTER UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION sync_enrollment_stats();

-- ============================================================================
-- PART 7: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_quality_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_deadline_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_tasks ENABLE ROW LEVEL SECURITY;

-- User can read their own progress
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

-- User can view their own session quality
CREATE POLICY "Users can view own session quality"
  ON session_quality_log FOR SELECT
  USING (auth.uid() = user_id);

-- User can view their own roadmaps
CREATE POLICY "Users can view own roadmaps"
  ON user_roadmaps FOR SELECT
  USING (auth.uid() = user_id);

-- User can update their own task completion
CREATE POLICY "Users can update own tasks"
  ON roadmap_tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- Students can view their college enrollment
CREATE POLICY "Students can view own enrollment"
  ON college_enrollments FOR SELECT
  USING (auth.uid() = user_id);

-- Students can view deadlines for their college
CREATE POLICY "Students can view college deadlines"
  ON college_deadlines FOR SELECT
  USING (
    college_id IN (
      SELECT college_id FROM college_enrollments 
      WHERE user_id = auth.uid()
    )
  );

-- T&P officers can manage their college data
CREATE POLICY "T&P officers can manage college"
  ON campus_organizations FOR ALL
  USING (auth.uid() = admin_user_id);

CREATE POLICY "T&P officers can manage enrollments"
  ON college_enrollments FOR ALL
  USING (
    college_id IN (
      SELECT id FROM campus_organizations 
      WHERE admin_user_id = auth.uid()
    )
  );

CREATE POLICY "T&P officers can manage deadlines"
  ON college_deadlines FOR ALL
  USING (
    college_id IN (
      SELECT id FROM campus_organizations 
      WHERE admin_user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 8: HELPER VIEWS (for dashboards)
-- ============================================================================

-- View: User progress with tier info
CREATE OR REPLACE VIEW user_progress_detailed AS
SELECT 
  up.*,
  u.email,
  u.name,
  tc.tier_name,
  tc.description AS tier_description
FROM user_progress up
JOIN users u ON up.user_id = u.id
LEFT JOIN tier_config tc ON up.current_tier = tc.tier_id;

-- View: College cohort summary
CREATE OR REPLACE VIEW college_cohort_summary AS
SELECT 
  co.id AS college_id,
  co.name AS college_name,
  COUNT(ce.id) AS total_students,
  AVG(ce.avg_score) AS cohort_avg_score,
  SUM(ce.total_sessions) AS total_sessions,
  COUNT(CASE WHEN ce.current_tier >= 2 THEN 1 END) AS students_tier_2_plus,
  COUNT(CASE WHEN ce.placement_ready THEN 1 END) AS placement_ready_count
FROM campus_organizations co
LEFT JOIN college_enrollments ce ON co.id = ce.college_id
WHERE ce.enrollment_status = 'active'
GROUP BY co.id, co.name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'InterviewEra Retention System migration completed successfully';
  RAISE NOTICE 'New tables: user_progress, session_quality_log, college_enrollments, college_deadlines, student_deadline_progress, cohort_leaderboard, college_admin_actions, user_roadmaps, roadmap_tasks, tier_config';
  RAISE NOTICE 'Modified tables: users (device_fingerprint, resume_hash), subscriptions (expires_at), interviews (tier_at_attempt)';
  RAISE NOTICE 'Enhanced table: campus_organizations (tier, license_type, max_students, feature toggles)';
END $$;
