'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AuthIntent } from '@/lib/auth/auth-intent';
import { useAuthAnalytics } from '@/hooks/use-auth-analytics';

export interface VerificationPendingProps {
  email: string;
  intent?: AuthIntent;
}

export function VerificationPending({ email, intent }: VerificationPendingProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { trackVerificationResent } = useAuthAnalytics();

  async function handleResend() {
    if (loading || cooldown > 0) return;
    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;

      if (res.status === 429) {
        setError(body?.error ?? 'Too many requests. Please wait before trying again.');
        return;
      }

      if (!res.ok) {
        setError(body?.error ?? 'Could not resend verification email.');
        return;
      }

      setFeedback(body?.message ?? 'If your account needs verification, we sent a new email.');
      trackVerificationResent({ intent });
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(interval);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch {
      setError('Network connection issue. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const signupHref = intent && intent !== 'candidate' ? `/signup?intent=${intent}` : '/signup';

  return (
    <div className="mx-auto w-full max-w-md space-y-6 text-center sm:text-left">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
        Check your inbox
      </h1>
      <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        We sent a verification link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. Click it to
        activate your account.
      </p>

      {feedback ? (
        <p
          className="rounded-xl border-2 px-4 py-3 text-sm font-medium"
          role="status"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-success) 35%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-success) 10%, transparent)',
            color: 'var(--text-primary)',
          }}
        >
          {feedback}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border-2 px-4 py-3 text-sm font-medium" role="alert" style={{ color: 'var(--accent-danger)', borderColor: 'color-mix(in srgb, var(--accent-danger) 35%, var(--card-border))', background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)' }}>
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleResend}
        disabled={loading || cooldown > 0}
        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-opacity disabled:opacity-60 sm:w-auto"
        style={{
          borderColor: 'var(--card-border)',
          color: 'var(--text-primary)',
          background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
        }}
      >
        {loading ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
      </button>

      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-4" style={{ color: 'var(--text-secondary)' }}>
        <Link href={signupHref} className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
          Change email
        </Link>
        <Link href="/login" className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
