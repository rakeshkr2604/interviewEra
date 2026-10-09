'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { AuthErrorBanner, FormSuccessBanner } from '@/components/auth/AuthErrorBanner';
import { FormSubmitButton } from '@/components/auth/AuthLoadingButton';
import { OAuthButton } from '@/components/auth/OAuthButton';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { AuthInterstitial } from '@/components/auth/AuthInterstitial';
import { PasswordField } from '@/components/auth/PasswordField';
import {
  IE_FIELD_GROUP_CLASS,
  IE_FIELD_SURFACE_STYLE,
  IE_INPUT_CLASS,
  IE_LABEL_CLASS,
} from '@/lib/theme/component-classes';
import { displayNameSchema } from '@/lib/validations/schemas';
import { isAuthV2Enabled } from '@/lib/auth/flags';
import type { AuthIntent } from '@/lib/auth/auth-intent';
import type { PaidPlanId } from '@/lib/pricing/plans';
import { PAID_PLANS } from '@/lib/pricing/plans';
import { useOAuthSignIn } from '@/hooks/use-oauth-sign-in';
import { useAuthAnalytics } from '@/hooks/use-auth-analytics';
import { trackLandingCtaClicked } from '@/lib/analytics/cta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { trackFunnelEvent } from '@/lib/analytics/funnel';
import {
  SIGNUP_CONSENT_COOKIE,
  SIGNUP_CONSENT_COOKIE_MAX_AGE_SECONDS,
  buildSignupConsentPayload,
  encodeSignupConsentCookie,
} from '@/lib/legal/signup-consent';
import { cn } from '@/lib/utils';

const PASSWORD_RULES = [
  { id: 'length', label: '8 characters', test: (password: string) => password.length >= 8 },
  { id: 'upper', label: 'Uppercase', test: (password: string) => /[A-Z]/.test(password) },
  { id: 'lower', label: 'Lowercase', test: (password: string) => /[a-z]/.test(password) },
  { id: 'number', label: 'Number', test: (password: string) => /[0-9]/.test(password) },
  { id: 'special', label: 'Special character', test: (password: string) => /[^A-Za-z0-9\s]/.test(password) },
] as const;

interface SignupFormProps {
  next?: string;
  email?: string;
  intent?: AuthIntent;
  selectedPlan?: PaidPlanId;
}

export function SignupForm({
  next,
  email: initialEmail,
  intent = 'candidate',
  selectedPlan,
}: SignupFormProps) {
  const router = useRouter();
  const { trackAuthStarted, trackSignupStarted, trackVerificationSent } = useAuthAnalytics();
  const { signInWithGoogle, loading: oauthLoading } = useOAuthSignIn({ next, intent, flow: 'signup' });
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordChecks = PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(password) }));
  const passwordValid = passwordChecks.every((check) => check.met);
  const consentReady = ageConfirmed && acceptedLegal;

  function writeOauthConsentCookie() {
    const payload = buildSignupConsentPayload();
    document.cookie = `${SIGNUP_CONSENT_COOKIE}=${encodeSignupConsentCookie(payload)}; path=/; max-age=${SIGNUP_CONSENT_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  }

  useEffect(() => {
    trackAuthStarted({ flow: 'signup', intent, source_page: '/signup' });
  }, [trackAuthStarted, intent]);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  async function handleGoogleSignup() {
    setFeedback(null);
    if (!consentReady) {
      setFeedback({
        kind: 'error',
        text: 'Confirm you are 18+ and accept the Terms and Privacy Policy before continuing with Google.',
      });
      return;
    }
    try {
      writeOauthConsentCookie();
      await signInWithGoogle();
    } catch {
      setFeedback({ kind: 'error', text: 'Google sign-up could not start. Check your connection and try again.' });
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);
    setLoading(true);
    trackSignupStarted({ flow: 'signup', intent, method: 'email' });
    trackLandingCtaClicked({
      ctaKey: CTA_KEYS.SIGN_UP,
      ctaText: 'Create free account',
      section: 'signup_form',
      authenticated: false,
    });

    try {
      const nameCheck = displayNameSchema.safeParse(name);
      if (!nameCheck.success) {
        setFeedback({ kind: 'error', text: nameCheck.error.issues[0]?.message ?? 'Enter a valid name.' });
        return;
      }
      if (!passwordValid) {
        setFeedback({ kind: 'error', text: 'Your password does not meet all requirements yet.' });
        return;
      }
      if (!consentReady) {
        setFeedback({
          kind: 'error',
          text: 'Confirm you are 18+ and accept the Terms and Privacy Policy to create an account.',
        });
        return;
      }

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: nameCheck.data,
          next: next ?? '/dashboard',
          ageConfirmed: true,
          acceptedTerms: true,
          acceptedPrivacy: true,
        }),
      });
      const body = (await response.json()) as {
        error?: string;
        userId?: string;
        message?: string;
      };

      if (!response.ok) {
        setFeedback({ kind: 'error', text: body.error ?? 'Account creation failed. Please try again.' });
        return;
      }

      if (body.userId) {
        trackFunnelEvent('signup_completed', {
          userId: body.userId,
          source: 'email',
          method: 'email_confirm_pending',
        });
      }
      trackVerificationSent({
        intent,
        email_domain: email.includes('@') ? email.split('@')[1] : undefined,
      });

      if (isAuthV2Enabled()) {
        const params = new URLSearchParams({ email, intent });
        if (next) params.set('next', next);
        router.push(`/auth/verify-pending?${params.toString()}`);
        return;
      }

      setFeedback({
        kind: 'success',
        text: body.message ?? 'Check your inbox to verify your email before signing in.',
      });
    } catch {
      setFeedback({ kind: 'error', text: 'Network connection issue. Check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  }

  const loginParams = new URLSearchParams();
  if (next) loginParams.set('next', next);
  if (email) loginParams.set('email', email);
  const loginHref = loginParams.size ? `/login?${loginParams.toString()}` : '/login';

  return (
    <>
      <AuthInterstitial visible={oauthLoading} />
      <AuthFormCard
        eyebrow="Free account"
        title="Create your account"
        subtitle="3 interview credits included. Verify your email before accessing protected interview features."
        badge={<ThemeToggle />}
      >
        <div className="space-y-5 p-5 sm:p-6">
          {selectedPlan ? (
            <div
              className="rounded-xl border px-3.5 py-3 text-sm"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-primary) 30%, var(--card-border))',
                background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
                color: 'var(--text-secondary)',
              }}
            >
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {PAID_PLANS[selectedPlan].label} selected.
              </span>{' '}
              Verify your email, then continue with the same plan.
            </div>
          ) : null}

          <div className="space-y-3 rounded-xl border px-3.5 py-3" style={{ borderColor: 'var(--card-border)' }}>
            <label className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <input
                id="signup-age-confirmed"
                type="checkbox"
                checked={ageConfirmed}
                onChange={(event) => setAgeConfirmed(event.target.checked)}
                className="mt-1 size-4 shrink-0"
              />
              <span>
                I confirm that I am 18 years of age or older. InterviewEra does not knowingly
                collect personal data from children under 18.
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <input
                id="signup-legal-accepted"
                type="checkbox"
                checked={acceptedLegal}
                onChange={(event) => setAcceptedLegal(event.target.checked)}
                className="mt-1 size-4 shrink-0"
              />
              <span>
                I agree to the{' '}
                <Link href="/terms" className="font-semibold underline underline-offset-2" style={{ color: 'var(--accent-primary)' }}>
                  Terms &amp; Conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="font-semibold underline underline-offset-2" style={{ color: 'var(--accent-primary)' }}>
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          </div>

          <OAuthButton
            loading={oauthLoading}
            disabled={loading || !consentReady}
            onClick={() => void handleGoogleSignup()}
          />
          <AuthDivider />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={IE_FIELD_GROUP_CLASS}>
              <label htmlFor="name" className={IE_LABEL_CLASS}>Full name</label>
              <input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Rahul Sharma"
                required
                autoComplete="name"
                className={IE_INPUT_CLASS}
                style={IE_FIELD_SURFACE_STYLE}
              />
            </div>

            <div className={IE_FIELD_GROUP_CLASS}>
              <label htmlFor="email" className={IE_LABEL_CLASS}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className={IE_INPUT_CLASS}
                style={IE_FIELD_SURFACE_STYLE}
              />
            </div>

            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={(value) => {
                setPassword(value);
                if (feedback?.kind === 'error') setFeedback(null);
              }}
              autoComplete="new-password"
              showPassword={showPassword}
              onToggleShow={() => setShowPassword((value) => !value)}
            />

            <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5" aria-label="Password requirements">
              {passwordChecks.map((check) => (
                <li
                  key={check.id}
                  className="flex items-center gap-1.5 text-[11px]"
                  style={{ color: check.met ? 'var(--accent-success)' : 'var(--text-muted)' }}
                >
                  <Check className={cn('size-3', !check.met && 'opacity-25')} aria-hidden />
                  {check.label}
                </li>
              ))}
            </ul>

            {feedback ? (
              feedback.kind === 'error'
                ? <AuthErrorBanner message={feedback.text} />
                : <FormSuccessBanner message={feedback.text} />
            ) : null}

            <FormSubmitButton loading={loading} disabled={!consentReady} loadingLabel="Creating account…">
              Create free account
            </FormSubmitButton>
          </form>

          <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href={loginHref} className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </AuthFormCard>
    </>
  );
}
