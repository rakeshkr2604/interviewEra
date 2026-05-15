import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { CampusDashboardChrome } from '@/components/layout/CampusDashboardChrome';

async function getCampusOrgWithSeats(adminUserId: string) {
  const serviceClient = createServiceClient();

  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id, name, seat_count')
    .eq('admin_user_id', adminUserId)
    .single();

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

  if (profile?.plan_tier !== 'campus_admin') {
    redirect('/dashboard');
  }

  const org = await getCampusOrgWithSeats(user.id);

  if (!org) {
    redirect('/college/signup');
  }

  return (
    <CampusDashboardChrome
      orgName={org.name}
      seatCount={org.seatCount}
      seatsUsed={org.seatsUsed}
    >
      {children}
    </CampusDashboardChrome>
  );
}
