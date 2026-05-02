'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { FreeToolFormCard } from '@/components/landing/FreeToolFormCard';
import { cn } from '@/lib/utils';

const inputClass = cn(
  'w-full rounded-xl border-2 px-4 py-2.5 text-sm shadow-none transition-[color,box-shadow]',
  'focus-visible:border-[color-mix(in_srgb,var(--accent-primary)_45%,var(--card-border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_25%,transparent)] focus-visible:outline-none',
);

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/reset-password')}`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <FreeToolFormCard
      headerEyebrow="Account"
      headerTitle="Reset your password"
      headerSubtitle="We’ll email you a secure link to choose a new password."
      headerBadge={<ThemeToggle />}
    >
      <div className="p-5 sm:p-6">
        {done ? (
          <div className="space-y-4">
            <p
              className="rounded-xl border-2 px-4 py-3 text-sm font-medium leading-relaxed"
              role="status"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-success) 35%, var(--card-border))',
                background: 'color-mix(in srgb, var(--accent-success) 10%, transparent)',
                color: 'var(--text-primary)',
              }}
            >
              Check your inbox for a reset link. If you don&apos;t see it in a few minutes, look in spam or try again.
            </p>
            <Link
              href="/login"
              className="inline-flex text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ color: 'var(--accent-primary)' }}
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
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
                className={inputClass}
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
                  color: 'var(--text-primary)',
                }}
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
              {loading ? 'Sending link…' : 'Send reset link'}
            </button>

            <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Link href="/login" className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </FreeToolFormCard>
  );
}
