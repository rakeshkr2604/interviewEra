'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { OAuthButton } from '@/components/auth/OAuthButton';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { PasswordField } from '@/components/auth/PasswordField';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { AuthLoadingButton } from '@/components/auth/AuthLoadingButton';
import { SessionBanner } from '@/components/auth/SessionBanner';
import { AuthInterstitial } from '@/components/auth/AuthInterstitial';
import { mapAuthErrorMessage } from '@/lib/auth/auth-errors';
import { isAuthV2Enabled } from '@/lib/auth/flags';
import type { SessionRedirectReason } from '@/lib/auth/auth-params';
import {
  resolvePasswordLoginDestination,
  shouldLookupHiringOrganization,
} from '@/lib/auth/resolve-password-login-destination';
import { useOAuthSignIn } from '@/hooks/use-oauth-sign-in';
import { useAuthAnalytics } from '@/hooks/use-auth-analytics';
import { IE_FIELD_GROUP_CLASS, IE_FIELD_SURFACE_STYLE, IE_INPUT_CLASS, IE_LABEL_CLASS } from '@/lib/theme/component-classes';

interface LoginFormProps {
  next?: string;
  email?: string;
  reason?: SessionRedirectReason;
}

export function LoginForm({ next, email: initialEmail, reason }: LoginFormProps) {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { trackAuthStarted, trackLoginCompleted, trackAuthFailed } = useAuthAnalytics();
  const { signInWithGoogle, loading: oauthLoading } = useOAuthSignIn({ next, flow: 'login' });

  useEffect(() => {
    trackAuthStarted({ flow: 'login', source_page: '/login' });
  }, [trackAuthStarted]);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        const message = isAuthV2Enabled()
          ? mapAuthErrorMessage(signInError.message)
          : mapAuthErrorMessage(signInError.message);
        setError(message);
        trackAuthFailed({ code: signInError.message, flow: 'login', method: 'password' });
        return;
      }

      // Refresh session cookies into the RSC tree without awaiting — destination
      // lookups below are independent and must not wait on a full layout refetch.
      void router.refresh();

      const loggedInUser = signInData.user;
      let destination = '/dashboard';

      if (loggedInUser) {
        const needsHiringLookup = shouldLookupHiringOrganization(next);
        const [profileResult, hiringResult] = await Promise.all([
          supabase
            .from('users')
            .select('plan_tier')
            .eq('id', loggedInUser.id)
            .single(),
          needsHiringLookup
            ? supabase
                .from('hiring_organizations')
                .select('id')
                .eq('admin_user_id', loggedInUser.id)
                .maybeSingle()
            : Promise.resolve({ data: null as { id: string } | null }),
        ]);

        destination = resolvePasswordLoginDestination(next, {
          planTier: profileResult.data?.plan_tier,
          hiringOrgId: hiringResult.data?.id ?? null,
        });
      }

      trackLoginCompleted({
        method: 'password',
        user_id: loggedInUser?.id,
        destination,
      });
      router.push(destination);
    } catch {
      setError('An unexpected error occurred. Please try again.');
      trackAuthFailed({ code: 'network_error', flow: 'login', method: 'password' });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError('Failed to initiate Google login. Please try again.');
      trackAuthFailed({ code: 'auth_callback_failed', flow: 'login', method: 'oauth' });
    }
  }

  const isDisabled = loading || oauthLoading;
  const signupHref = (() => {
    const params = new URLSearchParams();
    if (next?.startsWith('/hiring')) {
      params.set('intent', 'business');
    }
    if (next) params.set('next', next);
    const qs = params.toString();
    return qs ? `/signup?${qs}` : '/signup';
  })();

  return (
    <>
      <AuthInterstitial visible={oauthLoading} />
      <AuthFormCard
        eyebrow="Account"
        title="Sign in to continue"
        subtitle={
          <>
            Sign in to your <BrandWordmarkSplit className="text-[inherit]" /> account
          </>
        }
        badge={<ThemeToggle />}
      >
        <div className="space-y-5 p-5 sm:p-6">
          {reason ? <SessionBanner reason={reason} /> : null}

          <OAuthButton loading={oauthLoading} disabled={isDisabled} onClick={handleGoogleLogin} />
          <AuthDivider />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={IE_FIELD_GROUP_CLASS}>
              <label htmlFor="email" className={IE_LABEL_CLASS}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className={IE_INPUT_CLASS}
                style={IE_FIELD_SURFACE_STYLE}
              />
            </div>

            <div className={IE_FIELD_GROUP_CLASS}>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="password" className={IE_LABEL_CLASS}>
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium transition-opacity hover:opacity-80 sm:text-sm"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordField
                id="password"
                label=""
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                showPassword={showPassword}
                onToggleShow={() => setShowPassword((v) => !v)}
              />
            </div>

            {error ? <AuthErrorBanner message={error} /> : null}

            <AuthLoadingButton loading={loading} loadingLabel="Signing in…" disabled={isDisabled}>
              Sign in
            </AuthLoadingButton>
          </form>

          <p className="pt-1 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Don&apos;t have an account?{' '}
            <Link
              href={signupHref}
              className="font-semibold transition-opacity hover:opacity-90"
              style={{ color: 'var(--accent-primary)' }}
            >
              Start free
            </Link>
          </p>
        </div>
      </AuthFormCard>
    </>
  );
}
