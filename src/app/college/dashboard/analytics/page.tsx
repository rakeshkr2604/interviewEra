import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { AnalyticsContent } from './AnalyticsContent';
import { computeCampusAnalytics } from '@/lib/college/analytics';

export const metadata = privatePageMetadata({
  title: 'Analytics',
  description: 'View cohort performance analytics and insights.',
  path: '/college/dashboard/analytics',
});

export default async function AnalyticsPage() {
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

  const data = await computeCampusAnalytics(org.id, '30');

  return (
    <div className="space-y-8">
      <div>
        <p
          className="mb-1 text-xs font-semibold uppercase tracking-[0.1em]"
          style={{ color: 'var(--accent-primary)' }}
        >
          Campus Portal
        </p>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Analytics
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Cohort performance insights and placement readiness tracking.
        </p>
      </div>

      <AnalyticsContent initialData={data} collegeId={org.id} />
    </div>
  );
}
