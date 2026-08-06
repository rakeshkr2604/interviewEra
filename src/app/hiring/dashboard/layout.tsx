import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { HiringDashboardChrome } from '@/components/layout/HiringDashboardChrome';
import { isPlatformAdminUser } from '@/lib/admin/auth';
import { ensurePlatformAdminHiringOrg } from '@/lib/admin/ensure-founder-workspaces';

export default async function HiringDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=%2Fhiring%2Fdashboard&reason=session_required');
  }

  const platformAdmin = await isPlatformAdminUser(user.id, user.email);
  const service = createServiceClient();
  let { data: org } = await service
    .from('hiring_organizations')
    .select('id, name')
    .eq('admin_user_id', user.id)
    .maybeSingle();

  if (!org && platformAdmin) {
    org = await ensurePlatformAdminHiringOrg(user.id);
  }

  if (!org) {
    redirect('/signup?intent=business');
  }

  return (
    <HiringDashboardChrome orgName={org.name} showWorkspaceSwitcher={platformAdmin}>
      {children}
    </HiringDashboardChrome>
  );
}
