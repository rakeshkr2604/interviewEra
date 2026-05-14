import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { BulkInviteForm } from './BulkInviteForm';
import { StudentListTable } from './StudentListTable';

export const metadata = privatePageMetadata({
  title: 'Manage Students',
  description: 'Invite and manage students for your campus placement program.',
  path: '/college/dashboard/students',
});

interface StudentWithProgress {
  id: string;
  name: string | null;
  email: string;
  branch: string | null;
  roll_number: string | null;
  enrollment_status: string;
  enrolled_at: string;
  total_sessions: number;
  avg_score: number | null;
  current_tier: number;
}

async function getStudentData(adminUserId: string) {
  const serviceClient = createServiceClient();

  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id, name, seat_count')
    .eq('admin_user_id', adminUserId)
    .single();

  if (!org) return null;

  const { data: enrollments } = await serviceClient
    .from('college_enrollments')
    .select(
      `
      id:user_id,
      branch,
      roll_number,
      enrollment_status,
      enrolled_at,
      total_sessions,
      avg_score,
      current_tier,
      users!inner (
        id,
        name,
        email
      )
    `
    )
    .eq('college_id', org.id)
    .order('enrolled_at', { ascending: false });

  interface EnrollmentRow {
    user_id: string;
    branch: string | null;
    roll_number: string | null;
    enrollment_status: string;
    enrolled_at: string;
    total_sessions: number | null;
    avg_score: number | null;
    current_tier: number | null;
    users: {
      id: string;
      name: string | null;
      email: string;
    };
  }

  const students: StudentWithProgress[] = (enrollments as EnrollmentRow[] | null ?? []).map((e) => ({
    id: e.users.id,
    name: e.users.name,
    email: e.users.email,
    branch: e.branch,
    roll_number: e.roll_number,
    enrollment_status: e.enrollment_status,
    enrolled_at: e.enrolled_at,
    total_sessions: e.total_sessions || 0,
    avg_score: e.avg_score,
    current_tier: e.current_tier || 1,
  }));

  const { data: pendingInvites } = await serviceClient
    .from('campus_invites')
    .select('email, status, invited_at')
    .eq('org_id', org.id)
    .eq('status', 'pending')
    .order('invited_at', { ascending: false });

  return { org, students, pendingInvites: pendingInvites ?? [] };
}

export default async function StudentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const data = await getStudentData(user.id);

  if (!data) {
    redirect('/college/signup');
  }

  const { org, students, pendingInvites } = data;
  const seatsUsed = students.length + pendingInvites.length;
  const seatsAvailable = org.seat_count - seatsUsed;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--accent-primary)' }}>
            Campus Portal
          </p>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Manage Students</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            View and manage your enrolled students.
          </p>
        </div>
        <Link
          href="#invite"
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
          style={{ background: 'var(--accent-primary)' }}
        >
          + Invite Students
        </Link>
      </div>

      {/* Enrolled Students Table */}
      {students.length > 0 && (
        <div
          className="dashboard-premium-card overflow-hidden"
          style={{ padding: 0 }}
        >
          <StudentListTable students={students} />
        </div>
      )}

      {/* Empty State */}
      {students.length === 0 && (
        <div
          className="rounded-[22px] border-2 border-dashed p-12 text-center"
          style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
        >
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>No students enrolled yet</h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Start by inviting your students to the platform.
          </p>
        </div>
      )}

      {/* Bulk Invite Section */}
      <div id="invite">
        <BulkInviteForm seatsAvailable={seatsAvailable} />
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="dashboard-premium-card overflow-hidden" style={{ padding: 0 }}>
          <div
            className="border-b px-5 py-3 flex items-center justify-between"
            style={{ borderColor: 'var(--card-border)' }}
          >
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Pending Invitations</h3>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{pendingInvites.length} total</span>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              <tr>
                <th className="px-5 py-2.5 text-left font-medium">Email</th>
                <th className="px-5 py-2.5 text-left font-medium">Invited</th>
                <th className="px-5 py-2.5 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody style={{ borderColor: 'var(--card-border)' }}>
              {pendingInvites.map((inv) => (
                <tr
                  key={inv.email}
                  className="border-t"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>{inv.email}</td>
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(inv.invited_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: 'color-mix(in srgb, var(--accent-warning) 15%, transparent)',
                        color: 'var(--accent-warning)',
                      }}
                    >
                      Pending
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Seat Info */}
      <div
        className="rounded-[22px] border p-4"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Seats Used</p>
            <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {seatsUsed} / {org.seat_count}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Available Seats</p>
            <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--accent-primary)' }}>{seatsAvailable}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
