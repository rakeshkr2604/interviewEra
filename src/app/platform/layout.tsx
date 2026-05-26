import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const metadata: Metadata = privatePageMetadata({
  title: 'Platform Admin',
  description: 'InterviewEra platform administrator console.',
  path: '/platform',
});

function getPlatformAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
}

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/platform/analytics');

  // Auth check: EITHER email in ADMIN_EMAILS env var OR platform_role = 'admin' in DB.
  // The env-var path is the migration path while DB roles are being rolled out.
  // Once migration 025 is applied and the founder row is updated, remove ADMIN_EMAILS.
  const adminEmails = getPlatformAdminEmails();
  const isEmailAdmin = !!user.email && adminEmails.has(user.email.toLowerCase());

  let isRoleAdmin = false;
  if (!isEmailAdmin) {
    const svc = createServiceClient();
    const { data: profile } = await svc
      .from('users')
      .select('platform_role')
      .eq('id', user.id)
      .single();
    isRoleAdmin = profile?.platform_role === 'admin';
  }

  if (!isEmailAdmin && !isRoleAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-gradient)', color: 'var(--text-primary)' }}>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 sm:px-6"
        style={{
          borderBottom: '1px solid var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 85%, transparent)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-6">
          <span className="inline-flex shrink-0 items-baseline gap-1.5">
            <BrandWordmarkSplit />
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 15%, transparent)',
                color: 'var(--accent-primary)',
              }}
            >
              Platform
            </span>
          </span>
          <nav className="flex gap-x-5 text-sm">
            <Link
              href="/platform/analytics"
              className="font-semibold transition-opacity hover:opacity-80"
              style={{ color: 'var(--accent-primary)' }}
            >
              Analytics
            </Link>
            <Link
              href="/platform/feedback"
              className="font-semibold transition-opacity hover:opacity-80"
              style={{ color: 'var(--accent-primary)' }}
            >
              Feedback
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="hidden rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[color:var(--bg-secondary)] sm:block"
            style={{ color: 'var(--text-muted)' }}
          >
            Student view
          </Link>
          <Link
            href="/admin/dashboard"
            className="hidden rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[color:var(--bg-secondary)] sm:block"
            style={{ color: 'var(--text-muted)' }}
          >
            Campus admin
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
