'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { FreeToolFormCard } from '@/components/landing/FreeToolFormCard';
import { IE_INPUT_CLASS, IE_SELECT_CLASS, IE_FIELD_SURFACE_STYLE, IE_LABEL_CLASS, IE_LABEL_OPTIONAL_CLASS, IE_FIELD_GROUP_CLASS } from '@/lib/theme/component-classes';
import { AuthErrorBanner, FormSuccessBanner } from '@/components/auth/AuthErrorBanner';
import { FormSubmitButton } from '@/components/auth/AuthLoadingButton';
import { cn } from '@/lib/utils';
import { trackLandingCtaClicked } from '@/lib/analytics/cta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { trackFunnelEvent } from '@/lib/analytics/funnel';
import { displayNameSchema } from '@/lib/validations/schemas';
import { isAuthV2Enabled } from '@/lib/auth/flags';
import type { AuthIntent } from '@/lib/auth/auth-intent';
import { OAuthButton } from '@/components/auth/OAuthButton';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { AuthInterstitial } from '@/components/auth/AuthInterstitial';
import { useOAuthSignIn } from '@/hooks/use-oauth-sign-in';
import { useAuthAnalytics } from '@/hooks/use-auth-analytics';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
const YEARS = [2024, 2025, 2026, 2027, 2028] as const;

/**
 * Password requirements — kept in sync with the Supabase auth password policy so the
 * UI validates before submit and the verbose server-side error (which lists the full
 * character set) never reaches the user.
 */
const PASSWORD_RULES = [
  { id: 'length', label: '8 characters', test: (p: string) => p.length >= 8 },
  { id: 'upper', label: '1 uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: '1 lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: '1 number', test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: '1 special character', test: (p: string) => /[^A-Za-z0-9\s]/.test(p) },
] as const;

const selectClass = cn(IE_SELECT_CLASS);

const fieldSurface = IE_FIELD_SURFACE_STYLE;

/** Visual indicator; native `required` + `aria-required` announce requirement to AT. */
function RequiredMark() {
  return (
    <span className="font-semibold" style={{ color: 'var(--accent-danger)' }} aria-hidden="true">
      {' *'}
    </span>
  );
}

function SelectShell({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {children}
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50"
        style={{ color: 'var(--text-secondary)' }}
        aria-hidden
      />
    </div>
  );
}

interface SignupFormProps {
  next?: string;
  email?: string;
  intent?: AuthIntent;
}

export function SignupForm({ next, email: initialEmail, intent = 'candidate' }: SignupFormProps) {
  const router = useRouter();
  const { trackAuthStarted, trackSignupStarted, trackVerificationSent } = useAuthAnalytics();
  const { signInWithGoogle, loading: oauthLoading } = useOAuthSignIn({ next, intent, flow: 'signup' });
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [placementMonth, setPlacementMonth] = useState('');
  const [placementYear, setPlacementYear] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordChecks = PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(password) }));
  const passwordValid = passwordChecks.every((c) => c.met);
  const showPasswordChecklist = passwordFocused || password.length > 0;

  useEffect(() => {
    trackAuthStarted({ flow: 'signup', intent, source_page: '/signup' });
  }, [trackAuthStarted, intent]);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  async function handleGoogleSignup() {
    try {
      await signInWithGoogle();
    } catch {
      setFeedback({ kind: 'error', text: 'Failed to initiate Google sign-up. Please try again.' });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    trackLandingCtaClicked({
      ctaKey: CTA_KEYS.SIGN_UP,
      ctaText: 'Create account',
      section: 'signup_form',
      authenticated: false,
    });

    setFeedback(null);
    setLoading(true);
    trackSignupStarted({ flow: 'signup', intent, method: 'email' });

    try {
      const nameCheck = displayNameSchema.safeParse(name);
      if (!nameCheck.success) {
        setFeedback({
          kind: 'error',
          text: nameCheck.error.issues[0]?.message ?? 'Please enter a valid name.',
        });
        return;
      }
      const safeName = nameCheck.data;

      if (!passwordValid) {
        setSubmitAttempted(true);
        setFeedback({ kind: 'error', text: 'Your password doesn’t meet all the requirements yet.' });
        document.getElementById('password')?.focus();
        return;
      }

      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: safeName,
          next: next ?? '/dashboard',
          ...(placementMonth && placementYear
            ? {
                placementDate: `${placementYear}-${(MONTHS.indexOf(placementMonth as (typeof MONTHS)[number]) + 1).toString().padStart(2, '0')}-01`,
              }
            : {}),
        }),
      });

      const signupBody = (await signupResponse.json()) as {
        error?: string;
        userId?: string;
        needsVerification?: boolean;
        message?: string;
      };

      if (!signupResponse.ok) {
        setFeedback({ kind: 'error', text: signupBody.error ?? 'Signup failed.' });
        return;
      }

      if (signupBody.userId) {
        trackFunnelEvent('signup_completed', {
          userId: signupBody.userId,
          source: 'email',
          method: 'email_confirm_pending',
        });
      }

      const emailDomain = email.includes('@') ? email.split('@')[1] : undefined;
      trackVerificationSent({ intent, email_domain: emailDomain });

      if (isAuthV2Enabled()) {
        router.push(
          `/auth/verify-pending?email=${encodeURIComponent(email)}&intent=${intent}`,
        );
        return;
      }

      setFeedback({
        kind: 'success',
        text: signupBody.message ?? 'Account created! Check your email to confirm before signing in.',
      });
    } catch {
      setFeedback({ kind: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AuthInterstitial visible={oauthLoading} />
      <FreeToolFormCard
      headerEyebrow="Get started"
      headerTitle="Create your account"
      headerSubtitle="Start AI mock interviews tailored to your resume — free to begin."
      headerBadge={<ThemeToggle />}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4 p-5 sm:p-6"
        aria-describedby="signup-required-legend"
      >
        <p id="signup-required-legend" className="text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span aria-hidden="true" className="font-semibold" style={{ color: 'var(--accent-danger)' }}>
            *
          </span>{' '}
          Required fields must be filled before you can create an account.
        </p>

        <OAuthButton
          loading={oauthLoading}
          disabled={loading}
          onClick={() => void handleGoogleSignup()}
        />
        <AuthDivider />

        <div className={IE_FIELD_GROUP_CLASS}>
          <label htmlFor="name" className={IE_LABEL_CLASS}>
            Full name
            <RequiredMark />
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rahul Sharma"
            required
            aria-required="true"
            autoComplete="name"
            className={IE_INPUT_CLASS}
            style={fieldSurface}
          />
        </div>

        <div className={IE_FIELD_GROUP_CLASS}>
          <label htmlFor="email" className={IE_LABEL_CLASS}>
            Email
            <RequiredMark />
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            aria-required="true"
            autoComplete="email"
            className={IE_INPUT_CLASS}
            style={fieldSurface}
          />
        </div>

        <div className={IE_FIELD_GROUP_CLASS}>
          <label htmlFor="password" className={IE_LABEL_CLASS}>
            Password
            <RequiredMark />
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (feedback?.kind === 'error') setFeedback(null);
            }}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            placeholder="Create a password"
            minLength={8}
            required
            aria-required="true"
            aria-describedby="password-requirements"
            aria-invalid={submitAttempted && !passwordValid}
            autoComplete="new-password"
            className={IE_INPUT_CLASS}
            style={fieldSurface}
          />

          {showPasswordChecklist ? (
            <div
              id="password-requirements"
              className="rounded-lg border px-3 py-2.5"
              style={{
                borderColor:
                  submitAttempted && !passwordValid
                    ? 'color-mix(in srgb, var(--accent-danger) 35%, var(--card-border))'
                    : 'var(--card-border)',
                background:
                  submitAttempted && !passwordValid
                    ? 'color-mix(in srgb, var(--accent-danger) 6%, transparent)'
                    : 'color-mix(in srgb, var(--card-bg) 45%, transparent)',
              }}
            >
              <p className="mb-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Password must include at least:
              </p>
              <ul className="grid gap-1.5">
                {passwordChecks.map((c) => {
                  const errored = submitAttempted && !c.met;
                  const textColor = c.met
                    ? 'var(--accent-success)'
                    : errored
                      ? 'var(--accent-danger)'
                      : 'var(--text-secondary)';
                  return (
                    <li key={c.id} className="flex items-center gap-2 text-xs" style={{ color: textColor }}>
                      <span
                        aria-hidden="true"
                        className="grid size-4 shrink-0 place-items-center rounded-full"
                        style={
                          c.met
                            ? { background: 'color-mix(in srgb, var(--accent-success) 18%, transparent)' }
                            : { border: `1.5px solid ${errored ? 'var(--accent-danger)' : 'var(--text-muted)'}` }
                        }
                      >
                        {c.met ? <Check className="size-2.5" strokeWidth={3.5} /> : null}
                      </span>
                      <span>{c.label}</span>
                      <span className="sr-only">{c.met ? '— met' : '— not met'}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        <div className={IE_FIELD_GROUP_CLASS} role="group" aria-label="Expected placement date, optional">
          <p className={IE_LABEL_CLASS}>
            Expected placement date{' '}
            <span className={IE_LABEL_OPTIONAL_CLASS}>
              (optional)
            </span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <SelectShell id="placement-month" label="Month">
              <select
                id="placement-month"
                value={placementMonth}
                onChange={(e) => setPlacementMonth(e.target.value)}
                className={selectClass}
                style={fieldSurface}
              >
                <option value="">Month</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </SelectShell>
            <SelectShell id="placement-year" label="Year">
              <select
                id="placement-year"
                value={placementYear}
                onChange={(e) => setPlacementYear(e.target.value)}
                className={selectClass}
                style={fieldSurface}
              >
                <option value="">Year</option>
                {YEARS.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </SelectShell>
          </div>
        </div>

        {feedback ? (
          feedback.kind === 'error' ? (
            <AuthErrorBanner message={feedback.text} />
          ) : (
            <FormSuccessBanner message={feedback.text} />
          )
        ) : null}

        <FormSubmitButton loading={loading} loadingLabel="Creating account…">
          Create account
        </FormSubmitButton>

        <p className="pt-1 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold transition-opacity hover:opacity-90"
            style={{ color: 'var(--accent-primary)' }}
          >
            Sign in
          </Link>
        </p>
      </form>
    </FreeToolFormCard>
    </>
  );
}
