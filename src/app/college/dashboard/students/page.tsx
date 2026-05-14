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
          <h2 className="text-2xl font-semibold text-gray-900">Manage Students</h2>
          <p className="mt-1 text-sm text-gray-600">
            View and manage your enrolled students.
          </p>
        </div>
        <Link
          href="#invite"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          + Invite Students
        </Link>
      </div>

      {/* Enrolled Students Table */}
      {students.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <StudentListTable students={students} />
        </div>
      )}

      {/* Empty State */}
      {students.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900">No students enrolled yet</h3>
          <p className="mt-1 text-sm text-gray-600">
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
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="border-b px-5 py-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Pending Invitations</h3>
            <span className="text-xs text-gray-400">{pendingInvites.length} total</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium">Email</th>
                <th className="px-5 py-2.5 text-left font-medium">Invited</th>
                <th className="px-5 py-2.5 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingInvites.map((inv) => (
                <tr key={inv.email} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900">{inv.email}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {new Date(inv.invited_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
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
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Seats Used</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {seatsUsed} / {org.seat_count}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">Available Seats</p>
            <p className="mt-1 text-2xl font-semibold text-blue-600">{seatsAvailable}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
