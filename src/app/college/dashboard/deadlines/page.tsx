import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { CreateDeadlineModal } from './CreateDeadlineModal';
import { Calendar, AlertCircle } from 'lucide-react';

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

  const deadlinesWithProgress: DeadlineWithProgress[] = await Promise.all(
    deadlines.map(async (deadline) => {
      let completedStudents = 0;

      if (totalStudents > 0) {
        const { data: progress } = await serviceClient
          .from('user_progress')
          .select('total_sessions, current_tier, overall_avg_score')
          .in(
            'user_id',
            enrollments?.map((e) => e.user_id) ?? []
          );

        completedStudents = (progress ?? []).filter((p) => {
          switch (deadline.deadline_type) {
            case 'sessions':
              return p.total_sessions >= deadline.target_value;
            case 'tier':
              return p.current_tier >= deadline.target_value;
            case 'score':
              return p.overall_avg_score !== null && p.overall_avg_score >= deadline.target_value;
            default:
              return false;
          }
        }).length;
      }

      const now = new Date();
      const dueDate = new Date(deadline.due_date);
      const daysRemaining = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isOverdue = daysRemaining < 0;

      return {
        ...deadline,
        totalStudents,
        completedStudents,
        completionPercentage: totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0,
        daysRemaining: Math.abs(daysRemaining),
        isOverdue,
      };
    })
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
          <h2 className="text-2xl font-semibold text-gray-900">Deadlines</h2>
          <p className="mt-1 text-sm text-gray-600">
            Set milestones for your students to reach.
          </p>
        </div>
        <CreateDeadlineModal orgName={org.name} />
      </div>

      {deadlines.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No deadlines yet</h3>
          <p className="mt-1 text-sm text-gray-600">
            Create your first deadline to help students stay on track.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {deadlines.map((deadline) => (
            <Link
              key={deadline.id}
              href={`/college/dashboard/deadlines/${deadline.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{typeIcons[deadline.deadline_type]}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {typeLabels[deadline.deadline_type]}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {deadline.description ?? `Complete ${deadline.target_value} ${deadline.deadline_type}`}
                  </h3>
                </div>
                {deadline.isOverdue && (
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 ml-2" />
                )}
              </div>

              {deadline.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {deadline.description}
                </p>
              )}

              <div className="space-y-3">
                {/* Due Date */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Due Date</span>
                  <span className={`text-sm font-semibold ${deadline.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                    {new Date(deadline.due_date).toLocaleDateString('en-IN')}
                  </span>
                </div>

                {/* Days Remaining */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    {deadline.isOverdue ? 'Overdue by' : 'Days remaining'}
                  </span>
                  <span className={`text-sm font-semibold ${deadline.isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
                    {deadline.daysRemaining} {deadline.daysRemaining === 1 ? 'day' : 'days'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Progress</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {deadline.completedStudents}/{deadline.totalStudents} completed
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${deadline.completionPercentage}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {deadline.completionPercentage}% complete
                  </p>
                </div>

                {/* Target Info */}
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-600">
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
