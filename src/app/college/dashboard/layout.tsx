import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { CampusDashboardChrome } from '@/components/layout/CampusDashboardChrome';
import { isPlatformAdminUser } from '@/lib/admin/auth';
import { ensurePlatformAdminCampusOrg } from '@/lib/admin/ensure-founder-workspaces';
import { canAccessCampusDashboard } from '@/lib/college/rbac';

async function getCampusOrgWithSeats(adminUserId: string) {
  const serviceClient = createServiceClient();

  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id, name, seat_count, verification_status')
    .eq('admin_user_id', adminUserId)
    .maybeSingle();

  if (!org) return null;

  const { count: enrolledCount } = await serviceClient
    .from('college_enrollments')
    .select('user_id', { count: 'exact', head: true })
    .eq('college_id', org.id);

  const { count: pendingCount } = await serviceClient
    .from('campus_invites')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.id)
    .eq('status', 'pending');

  return {
    id: org.id,
    name: org.name,
    seatCount: org.seat_count,
    seatsUsed: (enrolledCount ?? 0) + (pendingCount ?? 0),
    verificationStatus: org.verification_status as 'pending' | 'approved',
  };
}

export default async function CollegeDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('plan_tier')
    .eq('id', user.id)
    .single();

  const platformAdmin = await isPlatformAdminUser(user.id, user.email);
  const hasCampusAccess =
    canAccessCampusDashboard(profile?.plan_tier) || platformAdmin;

  if (!hasCampusAccess) {
    redirect('/dashboard');
  }

  let org = await getCampusOrgWithSeats(user.id);

  if (!org && platformAdmin) {
    await ensurePlatformAdminCampusOrg(user.id);
    org = await getCampusOrgWithSeats(user.id);
  }

  if (!org) {
    redirect('/college/signup');
  }

  if (
    org.verificationStatus === 'pending' &&
    profile?.plan_tier !== 'campus_admin' &&
    !platformAdmin
  ) {
    redirect('/college/signup?status=pending');
  }

  return (
    <CampusDashboardChrome
      orgName={org.name}
      seatCount={org.seatCount}
      seatsUsed={org.seatsUsed}
      showWorkspaceSwitcher={platformAdmin}
    >
      {children}
    </CampusDashboardChrome>
  );
}
