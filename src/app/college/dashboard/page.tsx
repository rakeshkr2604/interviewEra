import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { UploadCloud } from 'lucide-react';

export const metadata = privatePageMetadata({
  title: 'College Dashboard',
  description: 'Manage student placements and track interview performance.',
  path: '/college/dashboard',
});

interface DashboardStats {
  totalStudents: number;
  completedSessions: number;
  averageScore: number | null;
  placementReadyCount: number;
}

async function getDashboardData(adminUserId: string): Promise<DashboardStats | null> {
  const serviceClient = createServiceClient();

  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id')
    .eq('admin_user_id', adminUserId)
    .single();

  if (!org) return null;

  const { data: students } = await serviceClient
    .from('users')
    .select('id')
    .eq('campus_org_id', org.id);

  if (!students || students.length === 0) {
    return {
      totalStudents: 0,
      completedSessions: 0,
      averageScore: null,
      placementReadyCount: 0,
    };
  }

  const studentIds = students.map((s) => s.id);

  const { data: interviews } = await serviceClient
    .from('interviews')
    .select('id, status')
    .in('user_id', studentIds);

  const completedInterviews = (interviews ?? []).filter((i) => i.status === 'completed');

  const completedIds = completedInterviews.map((i) => i.id);
  const { data: reports } =
    completedIds.length > 0
      ? await serviceClient
          .from('reports')
          .select('overall_score')
          .in('interview_id', completedIds)
      : { data: [] };

  const scores = (reports ?? []).map((r) => r.overall_score).filter((s): s is number => s !== null);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const placementReadyCount = students.filter((s) => {
    const myScores = scores.filter((score) => score >= 7);
    return myScores.length > 0;
  }).length;

  return {
    totalStudents: students.length,
    completedSessions: completedInterviews.length,
    averageScore: averageScore ? Math.round(averageScore * 10) / 10 : null,
    placementReadyCount,
  };
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
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

  if (!stats) {
    redirect('/college/signup');
  }

  const hasStudents = stats.totalStudents > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Overview</h2>
          <p className="mt-1 text-sm text-gray-600">Track student performance and placement readiness.</p>
        </div>
      </div>

      {hasStudents ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Students Enrolled"
              value={stats.totalStudents}
              sub="seats used"
            />
            <StatCard
              label="Sessions Completed"
              value={stats.completedSessions}
              sub="total interviews"
            />
            <StatCard
              label="Average Cohort Score"
              value={stats.averageScore !== null ? `${stats.averageScore.toFixed(1)}/10` : '—'}
              sub="across all students"
            />
            <StatCard
              label="Placement Ready"
              value={stats.placementReadyCount}
              sub="score ≥7"
            />
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Link
                href="/college/dashboard/students"
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Users className="h-4 w-4" />
                Manage Students
              </Link>
              <Link
                href="/college/dashboard/analytics"
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <BarChart className="h-4 w-4" />
                View Analytics
              </Link>
              <Link
                href="/college/dashboard/deadlines"
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Calendar className="h-4 w-4" />
                Set Deadlines
              </Link>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No students enrolled yet</h3>
          <p className="mt-1 text-sm text-gray-600">
            Upload students to get started with placement training.
          </p>
          <Link
            href="/college/dashboard/students"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <UploadCloud className="h-4 w-4" />
            Upload Students
          </Link>
        </div>
      )}
    </div>
  );
}

function Users(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BarChart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function Calendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M3 10h18" />
    </svg>
  );
}
