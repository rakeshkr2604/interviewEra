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

  // Verify the student belongs to this org (via users.campus_org_id).
  const { data: userData } = await serviceClient
    .from('users')
    .select('id, name, email, created_at, campus_org_id')
    .eq('id', studentId)
    .single();

  if (!userData || userData.campus_org_id !== org.id) return null;

  // Fetch enrollment row if it exists; fall back to defaults for users enrolled
  // before migration 018 ran (they'll get a backfill row the next time join is called).
  const { data: enrollmentData } = await serviceClient
    .from('college_enrollments')
    .select('branch, roll_number, year, enrollment_status, enrolled_at, total_sessions, avg_score, current_tier')
    .eq('user_id', studentId)
    .eq('college_id', org.id)
    .maybeSingle();

  const enrollment = {
    branch: enrollmentData?.branch ?? null,
    roll_number: enrollmentData?.roll_number ?? null,
    year: enrollmentData?.year ?? null,
    enrollment_status: enrollmentData?.enrollment_status ?? 'active',
    enrolled_at: enrollmentData?.enrolled_at ?? userData.created_at,
    total_sessions: enrollmentData?.total_sessions ?? 0,
    avg_score: enrollmentData?.avg_score ?? null,
    current_tier: enrollmentData?.current_tier ?? 1,
    users: userData,
  };

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

const tierStyleMap: Record<number, { bg: string; color: string; label: string }> = {
  1: { bg: 'color-mix(in srgb, var(--text-muted) 12%, transparent)', color: 'var(--text-secondary)', label: 'Tier 1' },
  2: { bg: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)', color: 'var(--accent-primary)', label: 'Tier 2' },
  3: { bg: 'color-mix(in srgb, #a855f7 14%, transparent)', color: '#a855f7', label: 'Tier 3' },
  4: { bg: 'color-mix(in srgb, var(--accent-warning) 14%, transparent)', color: 'var(--accent-warning)', label: 'Tier 4' },
};

function TierBadge({ tier }: { tier: number }) {
  const s = tierStyleMap[tier] ?? tierStyleMap[1];
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
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
    <div className="dashboard-premium-card p-5">
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {children ? (
        <div className="mt-2">{children}</div>
      ) : (
        <>
          <p className="mt-2 text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
          {sub && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
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
            className="inline-flex items-center gap-1 text-sm font-medium mb-3 transition-opacity hover:opacity-70"
            style={{ color: 'var(--accent-primary)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Students
          </Link>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>{enrollment.users.name ?? 'Student'}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{enrollment.users.email}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
        >
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      {/* Profile Info Card */}
      <div className="dashboard-premium-card p-5">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Profile Information</h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Branch</p>
            <p className="mt-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {enrollment.branch ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Roll Number</p>
            <p className="mt-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {enrollment.roll_number ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Year</p>
            <p className="mt-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {enrollment.year ? `Year ${enrollment.year}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Enrolled</p>
            <p className="mt-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
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
        <div className="dashboard-premium-card overflow-hidden" style={{ padding: 0 }}>
          <div
            className="border-b px-6 py-4"
            style={{ borderColor: 'var(--card-border)' }}
          >
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Interview History</h2>
          </div>
          <div>
            {completedInterviews.map((interview) => (
              <div
                key={interview.id}
                className="flex items-center justify-between px-6 py-4 border-t transition-colors hover:opacity-80"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{interview.role}</p>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span
                      className="rounded-full px-2 py-1 text-xs font-medium"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {interview.difficulty.charAt(0).toUpperCase() + interview.difficulty.slice(1)}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {interview.question_count} questions
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {new Date(interview.completed_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  {interview.score !== null ? (
                    <>
                      <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {(interview.score as number).toFixed(1)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>/10</p>
                    </>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>—</p>
                  )}
                </div>
                <Link
                  href={`/report/${interview.id}`}
                  className="ml-6 inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-medium transition-all hover:-translate-y-0.5"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
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
        <div
          className="rounded-[22px] border-2 border-dashed p-12 text-center"
          style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
        >
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>No interviews yet</h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            This student hasn&apos;t completed any interviews yet.
          </p>
        </div>
      )}
    </div>
  );
}
