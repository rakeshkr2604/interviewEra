import { createServiceClient, createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { CampusStudentRow } from '@/types/app.types';

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getAdminData(adminUserId: string) {
  const serviceClient = createServiceClient();

  // Fetch campus org for this admin
  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id, name, seat_count, plan_start, plan_end')
    .eq('admin_user_id', adminUserId)
    .single();

  if (!org) return null;

  // Fetch all students in the org
  const { data: students } = await serviceClient
    .from('users')
    .select('id, email, name')
    .eq('campus_org_id', org.id);

  if (!students || students.length === 0) {
    return { org, students: [], stats: { avgScore: null, completionRate: 0 } };
  }

  const studentIds = students.map((s) => s.id);

  // Fetch completed interviews for all students
  const { data: interviews } = await serviceClient
    .from('interviews')
    .select('id, user_id, completed_at, status')
    .in('user_id', studentIds);

  const completedInterviews = (interviews ?? []).filter((i) => i.status === 'completed');

  // Fetch reports for completed interviews
  const completedIds = completedInterviews.map((i) => i.id);
  const { data: reports } =
    completedIds.length > 0
      ? await serviceClient
          .from('reports')
          .select('interview_id, overall_score')
          .in('interview_id', completedIds)
      : { data: [] };

  // Map report scores by interview_id
  const scoreByInterview = new Map<string, number>(
    (reports ?? []).map((r) => [r.interview_id, r.overall_score])
  );

  // Build per-student rows
  const studentRows: CampusStudentRow[] = students.map((s) => {
    const myInterviews = completedInterviews.filter((i) => i.user_id === s.id);
    const myScores = myInterviews
      .map((i) => scoreByInterview.get(i.id))
      .filter((v): v is number => v !== undefined);

    const avgScore =
      myScores.length > 0 ? myScores.reduce((a, b) => a + b, 0) / myScores.length : null;

    const lastAt = myInterviews
      .map((i) => i.completed_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

    return {
      id: s.id,
      email: s.email,
      name: s.name,
      interviews_completed: myInterviews.length,
      avg_score: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
      last_interview_at: lastAt,
    };
  });

  // Overall stats
  const allScores = studentRows.flatMap((r) =>
    r.avg_score !== null ? [r.avg_score] : []
  );
  const avgScore =
    allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null;

  const studentsWithAtLeastOne = studentRows.filter((r) => r.interviews_completed > 0).length;
  const completionRate =
    students.length > 0 ? Math.round((studentsWithAtLeastOne / students.length) * 100) : 0;

  // Sort: top performers first for display
  const sorted = [...studentRows].sort(
    (a, b) => (b.avg_score ?? -1) - (a.avg_score ?? -1)
  );

  return {
    org,
    students: sorted,
    stats: {
      avgScore: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
      completionRate,
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-sm">—</span>;
  const color =
    score >= 7 ? 'text-green-700 bg-green-50' : score >= 5 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function CampusAdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const data = await getAdminData(user.id);

  if (!data) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-gray-600">
          No campus organization found for your account. Contact support to set up your campus.
        </p>
      </div>
    );
  }

  const { org, students, stats } = data;
  const seatsUsed = students.length;
  const planEnd = org.plan_end
    ? new Date(org.plan_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{org.name}</h1>
          <p className="mt-0.5 text-sm text-gray-500">Plan active until {planEnd}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/bulk-invite"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Invite Students
          </Link>
          <a
            href="/api/admin/export-csv"
            download
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Students Enrolled"
          value={`${seatsUsed} / ${org.seat_count}`}
          sub="seats used"
        />
        <StatCard
          label="Avg Score"
          value={stats.avgScore !== null ? `${stats.avgScore.toFixed(1)} / 10` : '—'}
          sub="across all students"
        />
        <StatCard
          label="Completion Rate"
          value={`${stats.completionRate}%`}
          sub="students with ≥1 interview"
        />
        <StatCard
          label="Seats Remaining"
          value={String(Math.max(0, org.seat_count - seatsUsed))}
          sub="available to invite"
        />
      </div>

      {/* Student table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="border-b px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900">All Students</h2>
          <span className="text-xs text-gray-400">{students.length} total</span>
        </div>

        {students.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-500">
            No students enrolled yet.{' '}
            <Link href="/admin/bulk-invite" className="text-blue-600 underline">
              Invite students
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium">Name / Email</th>
                <th className="px-5 py-2.5 text-center font-medium">Interviews</th>
                <th className="px-5 py-2.5 text-center font-medium">Avg Score</th>
                <th className="px-5 py-2.5 text-left font-medium">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{s.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                  </td>
                  <td className="px-5 py-3 text-center text-gray-700">
                    {s.interviews_completed}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <ScoreBadge score={s.avg_score} />
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {s.last_interview_at
                      ? new Date(s.last_interview_at).toLocaleDateString('en-IN')
                      : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
