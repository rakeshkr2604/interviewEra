import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AuthPremiumShell } from '@/components/layout/AuthPremiumShell';
import { AuthErrorRecovery } from '@/components/auth/AuthErrorRecovery';
import { authPageMetadata } from '@/lib/seo/metadata';
import { parseAuthIntent } from '@/lib/auth/auth-intent';
import { isSafePath } from '@/lib/auth/auth-params';

export const metadata = authPageMetadata({
  title: 'Sign-in issue',
  description: 'Resolve a sign-in or account issue on InterviewEra.',
  path: '/auth/error',
});

interface AuthErrorPageProps {
  searchParams: Promise<{
    code?: string;
    email?: string;
    intent?: string;
    next?: string;
    error?: string;
    error_description?: string;
  }>;
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const code = params.code ?? params.error;
  const email = params.email?.trim();
  const intent = parseAuthIntent(params.intent);
  const next = isSafePath(params.next) ? params.next : undefined;

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
        <Suspense fallback={null}>
          <AuthErrorRecovery code={code} email={email} intent={intent} next={next} />
        </Suspense>
      </AuthPremiumShell>
    </div>
  );
}
