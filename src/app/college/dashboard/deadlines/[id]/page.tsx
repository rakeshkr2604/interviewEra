import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { ArrowLeft, Mail, Download } from 'lucide-react';
import { StudentDeadlineList } from './StudentDeadlineList';
import { SendReminderButton } from './SendReminderButton';

export const metadata = privatePageMetadata({
  title: 'Deadline Details',
  description: 'View deadline progress and student status.',
  path: '/college/dashboard/deadlines/[id]',
});

interface PageProps {
  params: Promise<{ id: string }>;
}

interface DeadlineDetail {
  id: string;
  deadline_type: 'sessions' | 'tier' | 'score';
  target_value: number;
  due_date: string;
  description: string | null;
  mandatory: boolean;
  created_at: string;
}

interface StudentProgress {
  userId: string;
  name: string | null;
  email: string;
  currentValue: number | null;
  status: 'completed' | 'in_progress' | 'not_started';
}

async function getDeadlineDetails(adminUserId: string, deadlineId: string) {
  const serviceClient = createServiceClient();

  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id')
    .eq('admin_user_id', adminUserId)
    .single();

  if (!org) return null;

  const { data: deadline } = await serviceClient
    .from('college_deadlines')
    .select('*')
    .eq('id', deadlineId)
    .eq('college_id', org.id)
    .single();

  if (!deadline) return null;

  const { data: enrollments } = await serviceClient
    .from('college_enrollments')
    .select('user_id, users!inner(name, email)')
    .eq('college_id', org.id)
    .eq('enrollment_status', 'active');

  const studentIds = enrollments?.map((e) => e.user_id) ?? [];

  const { data: progressRecords } = await serviceClient
    .from('user_progress')
    .select('user_id, total_sessions, current_tier, overall_avg_score')
    .in('user_id', studentIds);

  const progressMap = new Map(
    (progressRecords ?? []).map((p) => [
      p.user_id,
      {
        sessions: p.total_sessions,
        tier: p.current_tier,
        score: p.overall_avg_score,
      },
    ])
  );

  const students: StudentProgress[] = (enrollments ?? []).map((enrollment: any) => {
    const progress = progressMap.get(enrollment.user_id);
    let currentValue: number | null = null;
    let status: 'completed' | 'in_progress' | 'not_started' = 'not_started';

    if (progress) {
      switch (deadline.deadline_type) {
        case 'sessions':
          currentValue = progress.sessions;
          break;
        case 'tier':
          currentValue = progress.tier;
          break;
        case 'score':
          currentValue = progress.score;
          break;
      }

      if (currentValue !== null && currentValue >= deadline.target_value) {
        status = 'completed';
      } else if (currentValue !== null && currentValue > 0) {
        status = 'in_progress';
      }
    }

    return {
      userId: enrollment.user_id,
      name: enrollment.users.name,
      email: enrollment.users.email,
      currentValue,
      status,
    };
  });

  const completedCount = students.filter((s) => s.status === 'completed').length;
  const inProgressCount = students.filter((s) => s.status === 'in_progress').length;
  const notStartedCount = students.filter((s) => s.status === 'not_started').length;

  return {
    deadline,
    students,
    stats: {
      total: students.length,
      completed: completedCount,
      inProgress: inProgressCount,
      notStarted: notStartedCount,
    },
  };
}

const typeLabels: Record<string, string> = {
  sessions: 'Sessions',
  tier: 'Tier Level',
  score: 'Average Score',
};

const typeIcons: Record<string, string> = {
  sessions: '📝',
  tier: '⬆️',
  score: '⭐',
};

export default async function DeadlineDetailPage({ params }: PageProps) {
  const { id: deadlineId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const data = await getDeadlineDetails(user.id, deadlineId);

  if (!data) {
    notFound();
  }

  const { deadline, students, stats } = data;
  const completionPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const now = new Date();
  const dueDate = new Date(deadline.due_date);
  const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0;

  const incomplete = students.filter((s) => s.status !== 'completed');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/college/dashboard/deadlines"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Deadlines
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">{deadline.description}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {typeIcons[deadline.deadline_type]} {typeLabels[deadline.deadline_type]} — Target: {deadline.target_value}
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Due Date</p>
          <p className={`mt-1 text-lg font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
            {new Date(deadline.due_date).toLocaleDateString('en-IN')}
          </p>
          <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
            {isOverdue ? `Overdue by ${Math.abs(daysRemaining)} days` : `${daysRemaining} days remaining`}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Completion Rate</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{completionPercentage}%</p>
          <p className="text-xs mt-1 text-gray-500">
            {stats.completed}/{stats.total} students
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">In Progress</p>
          <p className="mt-1 text-lg font-semibold text-blue-600">{stats.inProgress}</p>
          <p className="text-xs mt-1 text-gray-500">students working</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Not Started</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{stats.notStarted}</p>
          <p className="text-xs mt-1 text-gray-500">students</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Progress</h3>
        <div className="space-y-3">
          {/* Stacked Progress Bar */}
          <div className="flex h-8 rounded-lg overflow-hidden border border-gray-300">
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${(stats.completed / stats.total) * 100}%` }}
              title={`Completed: ${stats.completed}`}
            />
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
              title={`In Progress: ${stats.inProgress}`}
            />
            <div
              className="bg-gray-300 transition-all"
              style={{ width: `${(stats.notStarted / stats.total) * 100}%` }}
              title={`Not Started: ${stats.notStarted}`}
            />
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600">
                Completed: <span className="font-semibold">{stats.completed}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-600">
                In Progress: <span className="font-semibold">{stats.inProgress}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <span className="text-gray-600">
                Not Started: <span className="font-semibold">{stats.notStarted}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {incomplete.length > 0 && (
        <div className="flex gap-3">
          <SendReminderButton
            deadlineId={deadlineId}
            incompleteStuents={incomplete.map((s) => s.email)}
            deadlineDescription={deadline.description ?? 'Deadline'}
          />
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      )}

      {/* Student List */}
      <StudentDeadlineList
        students={students}
        deadlineType={deadline.deadline_type}
        targetValue={deadline.target_value}
      />
    </div>
  );
}
