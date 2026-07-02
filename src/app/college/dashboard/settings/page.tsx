import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { CampusSettingsClient } from './CampusSettingsClient';

export const metadata = privatePageMetadata({
  title: 'Campus Settings',
  description: 'Configure your campus dashboard, organization profile, and preferences.',
  path: '/college/dashboard/settings',
});

export default async function CampusSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const serviceClient = createServiceClient();

  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id, name, seat_count, plan_start, contact_email, coordinator_name')
    .eq('admin_user_id', user.id)
    .single();

  if (!org) redirect('/college/signup');

  const { count: enrolledCount } = await serviceClient
    .from('college_enrollments')
    .select('user_id', { count: 'exact', head: true })
    .eq('college_id', org.id);

  const { count: pendingCount } = await serviceClient
    .from('campus_invites')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.id)
    .eq('status', 'pending');

  const seatsUsed = (enrolledCount ?? 0) + (pendingCount ?? 0);

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
          Settings
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Manage your organization profile, seats, appearance, and notification preferences.
        </p>
      </div>

      {/* Quick-jump TOC */}
      <nav
        className="flex flex-wrap gap-2"
        aria-label="Settings sections"
      >
        {[
          { href: '#profile', label: 'Organization' },
          { href: '#billing', label: 'Plan & Seats' },
          { href: '#appearance', label: 'Appearance' },
          { href: '#notifications', label: 'Notifications' },
          { href: '#security', label: 'Security' },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full border px-3 py-1 text-xs font-medium transition-all hover:-translate-y-0.5"
            style={{
              borderColor: 'var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text-secondary)',
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <CampusSettingsClient
        org={{
          id: org.id,
          name: org.name,
          seatCount: org.seat_count,
          seatsUsed,
          pendingInvites: pendingCount ?? 0,
          planStart: (org.plan_start as string | null) ?? null,
          contactEmail: org.contact_email,
          coordinatorName: org.coordinator_name,
        }}
      />
    </div>
  );
}
