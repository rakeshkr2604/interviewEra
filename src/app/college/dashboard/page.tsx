import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { Users, BarChart2, Calendar, ArrowRight, TrendingUp, Award, Activity } from 'lucide-react';

export const metadata = privatePageMetadata({
  title: 'College Dashboard',
  description: 'Manage student placements and track interview performance.',
  path: '/college/dashboard',
});

interface DashboardStats {
  totalStudents: number;
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number | null;
  placementReadyCount: number;
  activeThisWeek: number;
  avgInterviewsPerStudent: number;
  completionRate: number;
  topPerformers: { name: string | null; email: string; score: number }[];
  pendingInvites: number;
  seatsUsed: number;
  seatCount: number;
}

async function getDashboardData(adminUserId: string): Promise<DashboardStats | null> {
  const serviceClient = createServiceClient();

  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id, seat_count')
    .eq('admin_user_id', adminUserId)
    .single();

  if (!org) return null;

  const { data: students } = await serviceClient
    .from('users')
    .select('id, name, email')
    .eq('campus_org_id', org.id);

  const { count: pendingInvites } = await serviceClient
    .from('campus_invites')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.id)
    .eq('status', 'pending');

  if (!students || students.length === 0) {
    return {
      totalStudents: 0,
      totalInterviews: 0,
      completedInterviews: 0,
      averageScore: null,
      placementReadyCount: 0,
      activeThisWeek: 0,
      avgInterviewsPerStudent: 0,
      completionRate: 0,
      topPerformers: [],
      pendingInvites: pendingInvites ?? 0,
      seatsUsed: pendingInvites ?? 0,
      seatCount: org.seat_count,
    };
  }

  const studentIds = students.map((s) => s.id);

  const { data: interviews } = await serviceClient
    .from('interviews')
    .select('id, user_id, status, completed_at, started_at')
    .in('user_id', studentIds);

  const allInterviews = interviews ?? [];
  const completed = allInterviews.filter((i) => i.status === 'completed');
  const completedIds = completed.map((i) => i.id);

  const { data: reports } = completedIds.length > 0
    ? await serviceClient
        .from('reports')
        .select('interview_id, overall_score')
        .in('interview_id', completedIds)
    : { data: [] };

  const scores = (reports ?? [])
    .map((r) => r.overall_score)
    .filter((s): s is number => s !== null);

  const averageScore = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  // Active this week = completed at least one interview in last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const activeThisWeek = new Set(
    completed
      .filter((i) => i.completed_at && new Date(i.completed_at) >= weekAgo)
      .map((i) => i.user_id)
  ).size;

  // Per-student score map for top performers
  const scoresByStudent: Record<string, number[]> = {};
  const completedByStudent: Record<string, number> = {};
  (reports ?? []).forEach((r) => {
    const interview = completed.find((i) => i.id === r.interview_id);
    if (!interview) return;
    const uid = interview.user_id;
    if (!scoresByStudent[uid]) scoresByStudent[uid] = [];
    if (r.overall_score !== null) scoresByStudent[uid].push(r.overall_score);
    completedByStudent[uid] = (completedByStudent[uid] || 0) + 1;
  });

  const placementReadyCount = Object.entries(scoresByStudent).filter(([, s]) => {
    const avg = s.reduce((a, b) => a + b, 0) / s.length;
    return avg >= 7;
  }).length;

  const topPerformers = students
    .map((s) => {
      const stScores = scoresByStudent[s.id] ?? [];
      const avg = stScores.length > 0
        ? stScores.reduce((a, b) => a + b, 0) / stScores.length
        : 0;
      return { name: s.name, email: s.email, score: Math.round(avg * 10) / 10 };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const avgInterviewsPerStudent = students.length > 0
    ? Math.round((completed.length / students.length) * 10) / 10
    : 0;

  const completionRate = allInterviews.length > 0
    ? Math.round((completed.length / allInterviews.length) * 100)
    : 0;

  return {
    totalStudents: students.length,
    totalInterviews: allInterviews.length,
    completedInterviews: completed.length,
    averageScore,
    placementReadyCount,
    activeThisWeek,
    avgInterviewsPerStudent,
    completionRate,
    topPerformers,
    pendingInvites: pendingInvites ?? 0,
    seatsUsed: students.length + (pendingInvites ?? 0),
    seatCount: org.seat_count,
  };
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: accent ?? '#eff6ff' }}
        >
          <Icon className="h-4 w-4 text-blue-600" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default async function CollegeDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const stats = await getDashboardData(user.id);

  if (!stats) redirect('/college/signup');

  const hasStudents = stats.totalStudents > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track student performance and placement readiness.
          </p>
        </div>
        <Link
          href="/college/dashboard/students"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          + Invite Students
        </Link>
      </div>

      {hasStudents ? (
        <>
          {/* Primary stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Students Enrolled"
              value={stats.totalStudents}
              sub={`${stats.seatsUsed}/${stats.seatCount} seats used`}
              icon={Users}
            />
            <StatCard
              label="Interviews Completed"
              value={stats.completedInterviews}
              sub={`${stats.avgInterviewsPerStudent} avg per student`}
              icon={BarChart2}
              accent="#f0fdf4"
            />
            <StatCard
              label="Cohort Avg Score"
              value={stats.averageScore !== null ? `${stats.averageScore}/10` : '—'}
              sub="across all interviews"
              icon={TrendingUp}
              accent="#fefce8"
            />
            <StatCard
              label="Placement Ready"
              value={stats.placementReadyCount}
              sub="avg score ≥ 7"
              icon={Award}
              accent="#fdf4ff"
            />
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Activity className="h-4 w-4" />
                Active This Week
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">{stats.activeThisWeek}</p>
              <p className="text-xs text-gray-400">students completed an interview</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm font-medium text-gray-500">Completion Rate</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm font-medium text-gray-500">Pending Invites</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{stats.pendingInvites}</p>
              <p className="text-xs text-gray-400">awaiting acceptance</p>
            </div>
          </div>

          {/* Top performers */}
          {stats.topPerformers.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-4">
                <h3 className="text-base font-semibold text-gray-900">Top Performers</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {stats.topPerformers.map((p, i) => (
                  <div key={p.email} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#d97706' }}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{p.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{p.email}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{p.score}/10</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick navigation */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { href: '/college/dashboard/students', icon: Users, label: 'Manage Students', sub: `${stats.totalStudents} enrolled` },
              { href: '/college/dashboard/analytics', icon: BarChart2, label: 'View Analytics', sub: 'Trends & distribution' },
              { href: '/college/dashboard/deadlines', icon: Calendar, label: 'Set Deadlines', sub: 'Milestones & targets' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    <item.icon className="h-4 w-4 text-blue-600" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.sub}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </Link>
            ))}
          </div>
        </>
      ) : (
        /* Production-grade empty state */
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-8 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No students enrolled yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
              Invite your students by uploading a CSV or entering emails manually. They&apos;ll
              receive a professional onboarding email with instructions to get started.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/college/dashboard/students"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Invite Students
                <ArrowRight className="h-4 w-4" />
              </Link>
              {stats.pendingInvites > 0 && (
                <p className="text-sm text-gray-500">
                  {stats.pendingInvites} invitation{stats.pendingInvites !== 1 ? 's' : ''} pending
                  acceptance
                </p>
              )}
            </div>
          </div>

          {/* Seat summary even when empty */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Seats Available</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stats.seatCount - stats.seatsUsed}
                  <span className="ml-1 text-base font-normal text-gray-400">
                    / {stats.seatCount} total
                  </span>
                </p>
              </div>
              <div className="h-12 w-12 rounded-full border-4 border-blue-100 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">
                  {stats.seatCount - stats.seatsUsed}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
