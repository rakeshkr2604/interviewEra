-- Candidate workspace: profile metadata + roadmap tables (idempotent)

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS candidate_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.users.candidate_profile IS
  'Candidate-facing profile: preferred_role, graduation_year, college_name, experience_level.';

CREATE TABLE IF NOT EXISTS public.user_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_skill TEXT NOT NULL,
  target_role TEXT,
  generated_from_scores JSONB,
  language_preference TEXT NOT NULL DEFAULT 'en',
  duration_days INTEGER NOT NULL DEFAULT 30,
  roadmap_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  usage_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_user_roadmaps_user ON public.user_roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roadmaps_status ON public.user_roadmaps(status);

CREATE TABLE IF NOT EXISTS public.roadmap_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES public.user_roadmaps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('video', 'practice', 'reading')),
  task_description TEXT NOT NULL,
  resource_url TEXT,
  resource_metadata JSONB,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_roadmap ON public.roadmap_tasks(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_user ON public.roadmap_tasks(user_id, completed);

ALTER TABLE public.user_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY user_roadmaps_select_own ON public.user_roadmaps
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY roadmap_tasks_select_own ON public.roadmap_tasks
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY roadmap_tasks_update_own ON public.roadmap_tasks
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
