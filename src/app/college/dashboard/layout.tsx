import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit';
import { CollegeDashboardNav } from './CollegeDashboardNav';

async function getCampusOrg(adminUserId: string) {
  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from('campus_organizations')
    .select('id, name')
    .eq('admin_user_id', adminUserId)
    .single();
  return data;
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

  const org = await getCampusOrg(user.id);

  if (!org) {
    redirect('/college/signup');
  }

  return (
    <div
      className="ie-landing-type min-h-screen"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 border-b"
        style={{
          background: 'color-mix(in srgb, var(--bg-secondary) 96%, transparent)',
          borderColor: 'var(--card-border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/college/dashboard" className="flex items-baseline gap-1.5 shrink-0">
              <BrandWordmarkSplit />
              <span
                className="text-xs font-semibold rounded-full px-2 py-0.5"
                style={{
                  background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                  color: 'var(--accent-primary)',
                }}
              >
                Campus
              </span>
            </Link>
            <div
              className="hidden sm:block h-5 w-px"
              style={{ background: 'var(--card-border)' }}
              aria-hidden
            />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {org.name}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                T&amp;P Officer Dashboard
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
              color: 'var(--text-secondary)',
            }}
          >
            Student Mode
          </Link>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex gap-6 lg:gap-8">
          {/* Sidebar */}
          <aside className="hidden w-52 shrink-0 lg:block">
            <div className="sticky top-[4.5rem] space-y-6">
              <CollegeDashboardNav />
            </div>
          </aside>

          {/* Mobile nav strip */}
          <div
            className="lg:hidden w-full mb-4 overflow-x-auto flex gap-1 rounded-2xl border p-1.5"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
            }}
          >
            <CollegeDashboardNav />
          </div>

          {/* Content */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
