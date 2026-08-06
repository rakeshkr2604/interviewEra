import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { HiringDashboardClient } from '@/components/hiring/HiringDashboardClient';
import { mapCandidateRow } from '@/lib/hiring/types';

export const metadata = privatePageMetadata({
  title: 'HR Dashboard',
  description: 'Manage your hiring pipeline and candidate stages.',
  path: '/hiring/dashboard',
});

export default async function HiringDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=%2Fhiring%2Fdashboard');
  }

  const service = createServiceClient();
  const { data: org } = await service
    .from('hiring_organizations')
    .select('id, name')
    .eq('admin_user_id', user.id)
    .maybeSingle();

  if (!org) {
    redirect('/signup?intent=business');
  }

  const { data: rows } = await service
    .from('hiring_candidates')
    .select('*')
    .eq('org_id', org.id)
    .order('updated_at', { ascending: false });

  return (
    <HiringDashboardClient
      orgName={org.name}
      initialCandidates={(rows ?? []).map(mapCandidateRow)}
    />
  );
}
