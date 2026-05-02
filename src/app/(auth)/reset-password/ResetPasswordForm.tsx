'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { FreeToolFormCard } from '@/components/landing/FreeToolFormCard';
import { cn } from '@/lib/utils';

const inputClass = cn(
  'w-full rounded-xl border-2 px-4 py-2.5 text-sm shadow-none transition-[color,box-shadow]',
  'focus-visible:border-[color-mix(in_srgb,var(--accent-primary)_45%,var(--card-border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_25%,transparent)] focus-visible:outline-none',
);

const fieldSurface = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
  color: 'var(--text-primary)',
} as const;

export function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        setSessionReady(!!data.session);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sessionReady === null) {
    return (
      <FreeToolFormCard
        headerEyebrow="Account"
        headerTitle="Loading…"
        headerSubtitle="Checking your session"
        headerBadge={<ThemeToggle />}
      >
        <div className="p-6 text-center text-sm sm:p-7" style={{ color: 'var(--text-secondary)' }}>
          One moment…
        </div>
      </FreeToolFormCard>
    );
  }

  if (!sessionReady) {
    return (
      <FreeToolFormCard
        headerEyebrow="Account"
        headerTitle="Link expired or invalid"
        headerSubtitle="Request a new reset link to continue."
        headerBadge={<ThemeToggle />}
      >
        <div className="space-y-4 p-5 sm:p-6">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Open the password reset link from your email, or start over from forgot password.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex text-sm font-semibold"
            style={{ color: 'var(--accent-primary)' }}
          >
            Request new link →
          </Link>
          <p>
            <Link href="/login" className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
              Back to sign in
            </Link>
          </p>
        </div>
      </FreeToolFormCard>
    );
  }

  return (
    <FreeToolFormCard
      headerEyebrow="Account"
      headerTitle="Choose a new password"
      headerSubtitle="Use at least 8 characters. You’ll be signed in on success."
      headerBadge={<ThemeToggle />}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
        <div className="space-y-2">
          <label htmlFor="new-password" className="block text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
            New password
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            minLength={8}
            required
            autoComplete="new-password"
            className={inputClass}
            style={fieldSurface}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm-password" className="block text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat password"
            minLength={8}
            required
            autoComplete="new-password"
            className={inputClass}
            style={fieldSurface}
          />
        </div>

        {error ? (
          <p
            className="rounded-xl border-2 px-4 py-3 text-sm font-medium"
            role="alert"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-danger) 35%, var(--card-border))',
              background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)',
              color: 'var(--accent-danger)',
            }}
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="landing-cta-lift inline-flex h-12 w-full items-center justify-center rounded-[14px] px-8 text-base font-semibold text-white disabled:pointer-events-none disabled:opacity-60 sm:h-[3.25rem]"
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
            boxShadow: '0 16px 48px color-mix(in srgb, var(--accent-primary) 32%, transparent)',
          }}
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </FreeToolFormCard>
  );
}
