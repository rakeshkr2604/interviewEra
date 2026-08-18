import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthPremiumShell } from '@/components/layout/AuthPremiumShell';
import { authPageMetadata } from '@/lib/seo/metadata';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { CampusSetupForm } from './CampusSetupForm';

export const metadata = authPageMetadata({
  title: 'Campus setup',
  description: 'Complete your campus application for review.',
  path: '/college/setup',
});

interface CampusSetupPageProps {
  searchParams: Promise<{ status?: string }>;
}

function StatusPanel({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="mx-auto max-w-lg space-y-4 rounded-2xl border p-6 text-center"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h1>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
      {action}
    </div>
  );
}

export default async function CampusSetupPage({ searchParams }: CampusSetupPageProps) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/college/setup');
  }

  if (!user.email_confirmed_at) {
    return (
      <AuthPremiumShell>
        <StatusPanel
          title="Email verification required"
          message="Use the verification link in your inbox before continuing campus setup."
        />
      </AuthPremiumShell>
    );
  }

  const service = createServiceClient();
  const { data: organization, error } = await service
    .from('campus_organizations')
    .select('id, verification_status')
    .eq('admin_user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[college/setup] organization lookup failed', {
      userId: user.id,
      code: error.code,
    });
    return (
      <AuthPremiumShell>
        <StatusPanel
          title="Campus setup is temporarily unavailable"
          message="We could not load your campus application. Please try again shortly."
        />
      </AuthPremiumShell>
    );
  }

  if (organization?.verification_status === 'approved') {
    redirect('/college/dashboard');
  }

  if (organization?.verification_status === 'pending') {
    return (
      <AuthPremiumShell>
        <StatusPanel
          title="Your campus application is under review"
          message="Your campus application has been submitted for Founder review. Campus access remains unavailable until it is approved."
          action={
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center font-semibold"
              style={{ color: 'var(--accent-primary)' }}
            >
              Return to dashboard
            </Link>
          }
        />
      </AuthPremiumShell>
    );
  }

  if (organization?.verification_status === 'rejected' || status === 'rejected') {
    return (
      <AuthPremiumShell>
        <StatusPanel
          title="Campus application not approved"
          message="This application was not approved. Contact support before submitting another campus application."
          action={
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center font-semibold"
              style={{ color: 'var(--accent-primary)' }}
            >
              Contact support
            </Link>
          }
        />
      </AuthPremiumShell>
    );
  }

  return (
    <div
      className="ie-landing-premium min-h-screen"
      style={{ background: 'var(--page-gradient)', color: 'var(--text-primary)' }}
    >
      <AuthPremiumShell>
        <div className="mx-auto w-full max-w-xl">
          <CampusSetupForm verified={status === 'verified' || Boolean(user.email_confirmed_at)} />
        </div>
      </AuthPremiumShell>
    </div>
  );
}
