import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { BulkInviteForm } from './BulkInviteForm';
import { StudentListTable } from './StudentListTable';
import { InvitationsManager } from '@/components/campus/InvitationsManager';
import { fetchStudentsWithProgress, getOrgSeatUsage } from '@/lib/college/students-query';
import { getEffectiveInviteStatus } from '@/lib/college/invites';
import type { CampusInviteRow } from '@/lib/college/types';

export const metadata = privatePageMetadata({
  title: 'Manage Students',
  description: 'Invite and manage students for your campus placement program.',
  path: '/college/dashboard/students',
});

async function getStudentPageData(adminUserId: string) {
  const serviceClient = createServiceClient();

  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id, name, seat_count')
    .eq('admin_user_id', adminUserId)
    .single();

  if (!org) return null;

  const [students, seatUsage, { data: invites }] = await Promise.all([
    fetchStudentsWithProgress(org.id),
    getOrgSeatUsage(org.id),
    serviceClient
      .from('campus_invites')
      .select('id, email, token, status, invited_at, accepted_at, expires_at')
      .eq('org_id', org.id)
      .order('invited_at', { ascending: false }),
  ]);

  const inviteRows: CampusInviteRow[] = (invites ?? []).map((invite) => ({
    ...invite,
    status: invite.status as CampusInviteRow['status'],
    effective_status: getEffectiveInviteStatus(invite),
  }));

  return {
    org,
    students,
    invites: inviteRows,
    seatsUsed: seatUsage.seatsUsed,
    seatsAvailable: org.seat_count - seatUsage.seatsUsed,
  };
}

export default async function StudentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const data = await getStudentPageData(user.id);

  if (!data) {
    redirect('/college/signup');
  }

  const { org, students, invites, seatsUsed, seatsAvailable } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p
            className="mb-1 text-xs font-semibold uppercase tracking-[0.1em]"
            style={{ color: 'var(--accent-primary)' }}
          >
            Campus Portal
          </p>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Manage Students
          </h2>
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

      {students.length > 0 && (
        <div className="dashboard-premium-card overflow-hidden" style={{ padding: 0 }}>
          <StudentListTable students={students} />
        </div>
      )}

      {students.length === 0 && (
        <div
          className="rounded-[22px] border-2 border-dashed p-12 text-center"
          style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
        >
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            No students enrolled yet
          </h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Start by inviting your students to the platform.
          </p>
        </div>
      )}

      <InvitationsManager invites={invites} />

      <div id="invite">
        <BulkInviteForm seatsAvailable={seatsAvailable} />
      </div>

      <div
        className="rounded-[22px] border p-4"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Seats Used
            </p>
            <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {seatsUsed} / {org.seat_count}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Available Seats
            </p>
            <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--accent-primary)' }}>
              {seatsAvailable}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
