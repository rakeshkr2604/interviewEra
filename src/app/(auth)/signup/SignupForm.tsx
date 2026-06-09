'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { FreeToolFormCard } from '@/components/landing/FreeToolFormCard';
import { cn } from '@/lib/utils';
import { trackLandingCtaClicked } from '@/lib/analytics/cta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { trackFunnelEvent } from '@/lib/analytics/funnel';
import { displayNameSchema } from '@/lib/validations/schemas';

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

const inputClass = cn(
  'w-full rounded-xl border-2 px-4 py-2.5 text-sm shadow-none transition-[color,box-shadow]',
  'focus-visible:border-[color-mix(in_srgb,var(--accent-primary)_45%,var(--card-border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_25%,transparent)] focus-visible:outline-none',
);

const selectClass = cn(
  inputClass,
  'cursor-pointer appearance-none pr-10',
);

const fieldSurface = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
  color: 'var(--text-primary)',
} as const;

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
}

export function SignupForm({ next }: SignupFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [placementMonth, setPlacementMonth] = useState('');
  const [placementYear, setPlacementYear] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const passwordChecks = PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(password) }));
  const passwordValid = passwordChecks.every((c) => c.met);
  const showPasswordChecklist = passwordFocused || password.length > 0;

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

      const supabase = createClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: safeName } },
      });

      if (signUpError) {
        setFeedback({ kind: 'error', text: signUpError.message });
        return;
      }

      if (data.session && data.user && placementMonth && placementYear) {
        const monthIndex = MONTHS.indexOf(placementMonth as (typeof MONTHS)[number]) + 1;
        const dateStr = `${placementYear}-${monthIndex.toString().padStart(2, '0')}-01`;
        await supabase.from('users').update({ placement_date: dateStr }).eq('id', data.user.id);
      }

      if (data.user) {
        trackFunnelEvent('signup_completed', {
          userId: data.user.id,
          source: 'email',
          method: data.session ? 'email' : 'email_confirm_pending',
        });
      }

      if (data.session) {
        router.push(next ?? '/dashboard');
      } else {
        setFeedback({
          kind: 'success',
          text: 'Account created! Check your email to confirm before signing in.',
        });
      }
    } catch {
      setFeedback({ kind: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
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

        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
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
            className={inputClass}
            style={fieldSurface}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
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
            className={inputClass}
            style={fieldSurface}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
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
            className={inputClass}
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

        <div className="space-y-2" role="group" aria-label="Expected placement date, optional">
          <p className="text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
            Expected placement date{' '}
            <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
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
          <p
            className="rounded-xl border-2 px-4 py-3 text-sm font-medium"
            role={feedback.kind === 'error' ? 'alert' : 'status'}
            style={
              feedback.kind === 'error'
                ? {
                    borderColor: 'color-mix(in srgb, var(--accent-danger) 35%, var(--card-border))',
                    background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)',
                    color: 'var(--accent-danger)',
                  }
                : {
                    borderColor: 'color-mix(in srgb, var(--accent-success) 35%, var(--card-border))',
                    background: 'color-mix(in srgb, var(--accent-success) 10%, transparent)',
                    color: 'var(--text-primary)',
                  }
            }
          >
            {feedback.text}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="landing-cta-lift mt-2 inline-flex h-12 w-full items-center justify-center rounded-[14px] px-8 text-base font-semibold text-white disabled:pointer-events-none disabled:opacity-60 sm:h-[3.25rem]"
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
            boxShadow: '0 16px 48px color-mix(in srgb, var(--accent-primary) 32%, transparent)',
          }}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>

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
  );
}
