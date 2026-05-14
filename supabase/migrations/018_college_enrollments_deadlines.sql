-- InterviewEra — College Enrollments + Deadlines
-- These tables were defined in the unnumbered spec migration but were never
-- included in the numbered sequence applied to production.
--
-- college_enrollments: one row per student-per-org, written by /api/college/join
-- college_deadlines:   milestone targets set by T&P admin
--
-- IMPORTANT: After applying this migration, the /api/college/join API route
-- must also INSERT into college_enrollments (handled in application code).

BEGIN;

-- ── college_enrollments ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS college_enrollments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  college_id        UUID        NOT NULL REFERENCES campus_organizations(id) ON DELETE CASCADE,

  -- Optional student metadata (can be collected later via profile page)
  roll_number       TEXT,
  branch            TEXT,
  year              INTEGER,

  -- Status
  enrollment_status TEXT        NOT NULL DEFAULT 'active'
                               CHECK (enrollment_status IN ('active', 'completed', 'dropped')),
  enrolled_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Cached performance snapshot — updated by interview-complete hook
  total_sessions    INTEGER     NOT NULL DEFAULT 0,
  avg_score         NUMERIC(3,1),
  current_tier      INTEGER     NOT NULL DEFAULT 1,
  placement_ready   BOOLEAN     NOT NULL DEFAULT false,

  UNIQUE (user_id, college_id)
);

CREATE INDEX IF NOT EXISTS idx_college_enrollments_college ON college_enrollments(college_id);
CREATE INDEX IF NOT EXISTS idx_college_enrollments_user    ON college_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_college_enrollments_status  ON college_enrollments(enrollment_status);

-- ── college_deadlines ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS college_deadlines (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id     UUID    NOT NULL REFERENCES campus_organizations(id) ON DELETE CASCADE,
  deadline_type  TEXT    NOT NULL CHECK (deadline_type IN ('sessions', 'tier', 'score')),
  target_value   INTEGER NOT NULL,
  due_date       DATE    NOT NULL,
  description    TEXT,
  mandatory      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_college_deadlines_college  ON college_deadlines(college_id);
CREATE INDEX IF NOT EXISTS idx_college_deadlines_due_date ON college_deadlines(due_date);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE college_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_deadlines   ENABLE ROW LEVEL SECURITY;

-- Admin reads/manages all enrollments in their org
CREATE POLICY "campus_admin_manage_enrollments"
  ON college_enrollments FOR ALL
  USING (
    college_id IN (
      SELECT id FROM campus_organizations WHERE admin_user_id = auth.uid()
    )
  );

-- Students can read their own row
CREATE POLICY "student_read_own_enrollment"
  ON college_enrollments FOR SELECT
  USING (user_id = auth.uid());

-- Admin manages all deadlines in their org
CREATE POLICY "campus_admin_manage_deadlines"
  ON college_deadlines FOR ALL
  USING (
    college_id IN (
      SELECT id FROM campus_organizations WHERE admin_user_id = auth.uid()
    )
  );

-- ── Grants ───────────────────────────────────────────────────────────────────
GRANT SELECT ON college_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON college_deadlines TO authenticated;
GRANT ALL ON college_enrollments, college_deadlines TO service_role;

-- ── Backfill: row for every user already enrolled via campus_org_id ──────────
-- Try to match accepted invite for the enrolled_at timestamp; fall back to
-- user created_at when no invite row is found (manual enrolments).
INSERT INTO college_enrollments (user_id, college_id, enrollment_status, enrolled_at)
SELECT
  u.id,
  u.campus_org_id,
  'active',
  COALESCE(
    (SELECT ci.accepted_at
     FROM campus_invites ci
     WHERE ci.email = u.email
       AND ci.org_id = u.campus_org_id
       AND ci.status = 'accepted'
     LIMIT 1),
    u.created_at
  )
FROM users u
WHERE u.campus_org_id IS NOT NULL
  AND u.plan_tier = 'campus'
ON CONFLICT (user_id, college_id) DO NOTHING;

COMMIT;
