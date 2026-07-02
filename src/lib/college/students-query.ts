import { createServiceClient } from '@/lib/supabase/server';
import type { StudentWithProgress } from './types';

interface EnrollmentRow {
  branch: string | null;
  roll_number: string | null;
  year: number | null;
  enrollment_status: string;
  enrolled_at: string;
  total_sessions: number | null;
  avg_score: number | null;
  current_tier: number | null;
  placement_ready: boolean | null;
  users: {
    id: string;
    name: string | null;
    email: string;
  };
}

export async function fetchStudentsWithProgress(orgId: string): Promise<StudentWithProgress[]> {
  const serviceClient = createServiceClient();

  const { data: enrollments } = await serviceClient
    .from('college_enrollments')
    .select(
      `
      branch,
      roll_number,
      year,
      enrollment_status,
      enrolled_at,
      total_sessions,
      avg_score,
      current_tier,
      placement_ready,
      users!inner (
        id,
        name,
        email
      )
    `
    )
    .eq('college_id', orgId)
    .order('enrolled_at', { ascending: false });

  const rows = (enrollments ?? []) as unknown as EnrollmentRow[];
  if (rows.length === 0) return [];

  const userIds = rows.map((e) => e.users.id);

  const [{ data: progressRecords }, { data: resumes }] = await Promise.all([
    serviceClient
      .from('user_progress')
      .select('user_id, total_sessions, overall_avg_score, current_tier')
      .in('user_id', userIds),
    serviceClient
      .from('resumes')
      .select('user_id, status, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false }),
  ]);

  const progressByUser = new Map(
    (progressRecords ?? []).map((p) => [p.user_id, p])
  );

  const resumeByUser = new Map<string, string>();
  for (const resume of resumes ?? []) {
    if (!resumeByUser.has(resume.user_id)) {
      resumeByUser.set(resume.user_id, resume.status);
    }
  }

  return rows.map((e) => {
    const user = Array.isArray(e.users) ? e.users[0] : e.users;
    const progress = progressByUser.get(user.id);
    const tier = progress?.current_tier ?? e.current_tier ?? 1;
    const sessions = progress?.total_sessions ?? e.total_sessions ?? 0;
    const avgScore = progress?.overall_avg_score ?? e.avg_score ?? null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      branch: e.branch,
      roll_number: e.roll_number,
      year: e.year,
      enrollment_status: e.enrollment_status,
      enrolled_at: e.enrolled_at,
      total_sessions: sessions,
      avg_score: avgScore !== null ? Number(avgScore) : null,
      current_tier: tier,
      placement_ready: tier >= 3,
      resume_status: resumeByUser.get(user.id) ?? null,
    };
  });
}

export async function getOrgSeatUsage(orgId: string): Promise<{
  enrolled: number;
  pendingInvites: number;
  seatsUsed: number;
}> {
  const serviceClient = createServiceClient();

  const [{ count: enrolled }, { count: pendingInvites }] = await Promise.all([
    serviceClient
      .from('college_enrollments')
      .select('user_id', { count: 'exact', head: true })
      .eq('college_id', orgId),
    serviceClient
      .from('campus_invites')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'pending'),
  ]);

  const enrolledCount = enrolled ?? 0;
  const pendingCount = pendingInvites ?? 0;

  return {
    enrolled: enrolledCount,
    pendingInvites: pendingCount,
    seatsUsed: enrolledCount + pendingCount,
  };
}
