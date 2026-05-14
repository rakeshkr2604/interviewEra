import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { Download, ArrowLeft } from 'lucide-react';

export const metadata = privatePageMetadata({
  title: 'Student Details',
  description: 'View student profile and interview history.',
  path: '/college/dashboard/students/[id]',
});

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getStudentDetails(adminUserId: string, studentId: string) {
  const serviceClient = createServiceClient();

  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id, name')
    .eq('admin_user_id', adminUserId)
    .single();

  if (!org) return null;

  const { data: enrollmentData } = await serviceClient
    .from('college_enrollments')
    .select('branch, roll_number, year, enrollment_status, enrolled_at, total_sessions, avg_score, current_tier')
    .eq('user_id', studentId)
    .eq('college_id', org.id)
    .single();

  if (!enrollmentData) return null;

  const { data: userData } = await serviceClient
    .from('users')
    .select('id, name, email, created_at')
    .eq('id', studentId)
    .single();

  if (!userData) return null;

  const enrollment = { ...enrollmentData, users: userData };

  const { data: progress } = await serviceClient
    .from('user_progress')
    .select('overall_avg_score, current_streak, longest_streak, total_sessions, current_tier')
    .eq('user_id', studentId)
    .single();

  const { data: interviews } = await serviceClient
    .from('interviews')
    .select('id, role, difficulty, status, started_at, completed_at, question_count')
    .eq('user_id', studentId)
    .order('completed_at', { ascending: false });

  const { data: reports } = await serviceClient
    .from('reports')
    .select('interview_id, overall_score')
    .in(
      'interview_id',
      (interviews ?? []).map((i) => i.id)
    );

  const reportsByInterview = new Map(
    (reports ?? []).map((r) => [r.interview_id, r.overall_score])
  );

  const interviewsWithScores = (interviews ?? []).map((i) => ({
    ...i,
    score: reportsByInterview.get(i.id) ?? null,
  }));

  return { org, enrollment, progress, interviews: interviewsWithScores };
}

function TierBadge({ tier }: { tier: number }) {
  const colors = {
    1: 'bg-gray-100 text-gray-800',
    2: 'bg-blue-100 text-blue-800',
    3: 'bg-purple-100 text-purple-800',
    4: 'bg-amber-100 text-amber-800',
  };
  const labels: Record<number, string> = {
    1: 'Tier 1',
    2: 'Tier 2',
    3: 'Tier 3',
    4: 'Tier 4',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colors[tier as keyof typeof colors] || colors[1]}`}>
      {labels[tier] || 'Tier 1'}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value?: string | number;
  sub?: string;
  children?: React.ReactNode;
}

function StatCard({ label, value, sub, children }: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      {children ? (
        <div className="mt-2">{children}</div>
      ) : (
        <>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
        </>
      )}
    </div>
  );
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { id: studentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const data = await getStudentDetails(user.id, studentId);

  if (!data) {
    notFound();
  }

  const { enrollment, progress, interviews } = data;
  const completedInterviews = interviews.filter((i) => i.status === 'completed');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/college/dashboard/students"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Students
          </Link>
          <h1 className="text-3xl font-semibold text-gray-900">{enrollment.users.name ?? 'Student'}</h1>
          <p className="mt-1 text-sm text-gray-600">{enrollment.users.email}</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      {/* Profile Info Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Branch</p>
            <p className="mt-1 text-base font-semibold text-gray-900">
              {enrollment.branch ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Roll Number</p>
            <p className="mt-1 text-base font-semibold text-gray-900">
              {enrollment.roll_number ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Year</p>
            <p className="mt-1 text-base font-semibold text-gray-900">
              {enrollment.year ? `Year ${enrollment.year}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Enrolled</p>
            <p className="mt-1 text-base font-semibold text-gray-900">
              {new Date(enrollment.enrolled_at).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Sessions"
          value={progress?.total_sessions ?? enrollment.total_sessions ?? 0}
          sub="interviews completed"
        />
        <StatCard
          label="Average Score"
          value={
            progress?.overall_avg_score
              ? (progress.overall_avg_score as number).toFixed(1)
              : enrollment.avg_score
              ? (enrollment.avg_score as number).toFixed(1)
              : '—'
          }
          sub="out of 10"
        />
        <StatCard label="Current Tier">
          <TierBadge tier={progress?.current_tier ?? enrollment.current_tier ?? 1} />
        </StatCard>
        <StatCard
          label="Current Streak"
          value={progress?.current_streak ?? 0}
          sub="quality sessions"
        />
      </div>

      {/* Interview History */}
      {completedInterviews.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Interview History</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {completedInterviews.map((interview) => (
              <div
                key={interview.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{interview.role}</p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium">
                      {interview.difficulty.charAt(0).toUpperCase() + interview.difficulty.slice(1)}
                    </span>
                    <span className="text-gray-500">
                      {interview.question_count} questions
                    </span>
                    <span className="text-gray-500">
                      {new Date(interview.completed_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  {interview.score !== null ? (
                    <>
                      <p className="text-2xl font-semibold text-gray-900">
                        {(interview.score as number).toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500">/10</p>
                    </>
                  ) : (
                    <p className="text-gray-400">—</p>
                  )}
                </div>
                <Link
                  href={`/report/${interview.id}`}
                  className="ml-6 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  View Report
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No interviews */}
      {interviews.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900">No interviews yet</h3>
          <p className="mt-1 text-sm text-gray-600">
            This student hasn't completed any interviews yet.
          </p>
        </div>
      )}
    </div>
  );
}
