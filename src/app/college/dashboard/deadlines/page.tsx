import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { CreateDeadlineModal } from './CreateDeadlineModal';
import { Calendar, AlertCircle } from 'lucide-react';
import { computeDeadlineProgress } from '@/lib/college/deadline-progress';

export const metadata = privatePageMetadata({
  title: 'Deadlines',
  description: 'Set and track student placement deadlines.',
  path: '/college/dashboard/deadlines',
});

interface DeadlineWithProgress {
  id: string;
  deadline_type: 'sessions' | 'tier' | 'score';
  target_value: number;
  due_date: string;
  description: string | null;
  mandatory: boolean;
  created_at: string;
  totalStudents: number;
  completedStudents: number;
  completionPercentage: number;
  daysRemaining: number;
  isOverdue: boolean;
}

async function getDeadlineData(collegeId: string) {
  const serviceClient = createServiceClient();

  const { data: deadlines } = await serviceClient
    .from('college_deadlines')
    .select('id, deadline_type, target_value, due_date, description, mandatory, created_at')
    .eq('college_id', collegeId)
    .order('due_date', { ascending: true });

  if (!deadlines || deadlines.length === 0) {
    return { deadlines: [] };
  }

  const { data: enrollments } = await serviceClient
    .from('college_enrollments')
    .select('user_id')
    .eq('college_id', collegeId)
    .eq('enrollment_status', 'active');

  const totalStudents = enrollments?.length ?? 0;
  const studentIds = enrollments?.map((enrollment) => enrollment.user_id) ?? [];

  const { data: progress } =
    totalStudents > 0
      ? await serviceClient
          .from('user_progress')
          .select('total_sessions, current_tier, overall_avg_score')
          .in('user_id', studentIds)
      : { data: [] };

  const deadlinesWithProgress: DeadlineWithProgress[] = computeDeadlineProgress(
    deadlines,
    progress ?? [],
    totalStudents,
  );

  return { deadlines: deadlinesWithProgress };
}

const typeLabels: Record<string, string> = {
  sessions: 'Sessions',
  tier: 'Tier Unlock',
  score: 'Score Target',
};

const typeIcons: Record<string, React.ReactNode> = {
  sessions: '📝',
  tier: '⬆️',
  score: '⭐',
};

export default async function DeadlinesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id, name')
    .eq('admin_user_id', user.id)
    .single();

  if (!org) redirect('/college/signup');

  const { deadlines } = await getDeadlineData(org.id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--accent-primary)' }}>
            Campus Portal
          </p>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Deadlines</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Set milestones for your students to reach.
          </p>
        </div>
        <CreateDeadlineModal orgName={org.name} />
      </div>

      {deadlines.length === 0 ? (
        <div
          className="rounded-[22px] border-2 border-dashed p-12 text-center"
          style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
        >
          <Calendar className="mx-auto h-12 w-12" style={{ color: 'var(--text-muted)' }} />
          <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>No deadlines yet</h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Create your first deadline to help students stay on track.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {deadlines.map((deadline) => (
            <Link
              key={deadline.id}
              href={`/college/dashboard/deadlines/${deadline.id}`}
              className="dashboard-premium-card p-5 block transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{typeIcons[deadline.deadline_type]}</span>
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {typeLabels[deadline.deadline_type]}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                    {deadline.description ?? `Complete ${deadline.target_value} ${deadline.deadline_type}`}
                  </h3>
                </div>
                {deadline.isOverdue && (
                  <AlertCircle className="h-5 w-5 flex-shrink-0 ml-2" style={{ color: 'var(--accent-danger)' }} />
                )}
              </div>

              <div className="space-y-3">
                {/* Due Date */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Due Date</span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: deadline.isOverdue ? 'var(--accent-danger)' : 'var(--text-primary)' }}
                  >
                    {new Date(deadline.due_date).toLocaleDateString('en-IN')}
                  </span>
                </div>

                {/* Days Remaining */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {deadline.isOverdue ? 'Overdue by' : 'Days remaining'}
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: deadline.isOverdue ? 'var(--accent-danger)' : 'var(--accent-primary)' }}
                  >
                    {deadline.daysRemaining} {deadline.daysRemaining === 1 ? 'day' : 'days'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Progress</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {deadline.completedStudents}/{deadline.totalStudents} completed
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: 'var(--bg-tertiary, color-mix(in srgb, var(--card-border) 60%, transparent))' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${deadline.completionPercentage}%`, background: 'var(--accent-primary)' }}
                    />
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {deadline.completionPercentage}% complete
                  </p>
                </div>

                {/* Target Info */}
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-medium">Target:</span> {deadline.target_value}
                    {deadline.deadline_type === 'tier' ? ' Tier' : deadline.deadline_type === 'score' ? ' / 10' : ' Sessions'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
