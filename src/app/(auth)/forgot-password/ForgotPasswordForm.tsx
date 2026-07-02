'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { FreeToolFormCard } from '@/components/landing/FreeToolFormCard';
import { AuthErrorBanner, FormSuccessBanner } from '@/components/auth/AuthErrorBanner';
import { FormSubmitButton } from '@/components/auth/AuthLoadingButton';
import {
  IE_FIELD_GROUP_CLASS,
  IE_FIELD_SURFACE_STYLE,
  IE_INPUT_CLASS,
  IE_LABEL_CLASS,
} from '@/lib/theme/component-classes';

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
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const payload = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        error?: string;
      } | null;

      if (res.status === 429) {
        setError(
          payload?.error ??
            'Too many reset attempts. Please wait a minute and try again.',
        );
        return;
      }

      if (!res.ok) {
        setError(
          payload?.error ??
            'Unable to send a reset email right now. Please try again in a few minutes.',
        );
        return;
      }

      setDone(true);
    } catch {
      setError(
        'Unable to send a reset email right now. Please try again in a few minutes.',
      );
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
            <FormSuccessBanner message="If an account exists for this email, we&apos;ll send a reset link shortly. Check your inbox and spam folder." />
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

            {error ? <AuthErrorBanner message={error} /> : null}

            <FormSubmitButton loading={loading} loadingLabel="Sending link…">
              Send reset link
            </FormSubmitButton>

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
