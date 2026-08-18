import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AuthPremiumShell } from '@/components/layout/AuthPremiumShell';
import { VerificationPending } from '@/components/auth/VerificationPending';
import { authPageMetadata } from '@/lib/seo/metadata';
import { parseAuthIntent } from '@/lib/auth/auth-intent';
import { isSafePath } from '@/lib/auth/auth-params';
import { CAMPUS_SETUP_PATH } from '@/lib/college/signup-continuation';

export const metadata = authPageMetadata({
  title: 'Verify your email',
  description: 'Check your inbox to verify your InterviewEra account.',
  path: '/auth/verify-pending',
});

interface VerifyPendingPageProps {
  searchParams: Promise<{ email?: string; intent?: string; next?: string; status?: string }>;
}

export default async function VerifyPendingPage({ searchParams }: VerifyPendingPageProps) {
  const {
    email: rawEmail,
    intent: rawIntent,
    next: rawNext,
    status: rawStatus,
  } = await searchParams;
  const email = rawEmail?.trim() ?? '';
  const intent = parseAuthIntent(rawIntent);
  const next = isSafePath(rawNext)
    ? rawNext
    : intent === 'college'
      ? CAMPUS_SETUP_PATH
      : undefined;
  const status = rawStatus === 'verification_required' ? rawStatus : undefined;

  return (
    <div
      className="ie-landing-premium min-h-screen"
      style={{ background: 'var(--page-gradient)', color: 'var(--text-primary)' }}
    >
      <AuthPremiumShell>
        <div className="mb-8 sm:mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80 sm:text-base"
            style={{ color: 'var(--accent-primary)' }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to home
          </Link>
        </div>
        {email ? (
          <VerificationPending email={email} intent={intent} next={next} status={status} />
        ) : (
          <div className="mx-auto max-w-md space-y-4 text-center">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Missing email address
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Start sign up again to receive a verification link.
            </p>
            <Link href="/signup" className="font-semibold text-sm" style={{ color: 'var(--accent-primary)' }}>
              Go to sign up
            </Link>
          </div>
        )}
      </AuthPremiumShell>
    </div>
  );
}
