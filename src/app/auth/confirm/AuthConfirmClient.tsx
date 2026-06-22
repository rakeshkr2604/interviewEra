'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { EmailOtpType } from '@supabase/supabase-js';

type ConfirmPhase = 'loading' | 'success' | 'error';

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  'recovery',
  'signup',
  'invite',
  'magiclink',
  'email_change',
  'email',
]);

function resolveNext(raw: string | null): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) {
    return raw;
  }
  return '/dashboard';
}

export function AuthConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<ConfirmPhase>('loading');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const tokenHash = searchParams.get('token_hash')?.trim();
      const rawType = searchParams.get('type')?.trim() ?? 'recovery';
      const next = resolveNext(searchParams.get('next'));

      if (!tokenHash) {
        if (!cancelled) {
          setPhase('error');
          setMessage('This link is missing required verification data.');
        }
        return;
      }

      if (!ALLOWED_OTP_TYPES.has(rawType as EmailOtpType)) {
        if (!cancelled) {
          setPhase('error');
          setMessage('This verification link is not valid.');
        }
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: rawType as EmailOtpType,
      });

      if (cancelled) return;

      if (error) {
        const code = error.message.toLowerCase();
        setPhase('error');
        const isSignupFlow = rawType === 'signup' || rawType === 'magiclink';
        if (code.includes('expired') || code.includes('invalid')) {
          setMessage(
            isSignupFlow
              ? 'This verification link has expired or was already used. Request a new confirmation email.'
              : 'This reset link has expired or was already used. Request a new one.',
          );
        } else {
          setMessage(
            isSignupFlow
              ? 'We could not verify this link. Please request a new confirmation email.'
              : 'We could not verify this link. Please request a new password reset email.',
          );
        }
        console.error('[auth/confirm] verifyOtp failed', error);
        return;
      }

      if (rawType === 'signup' || rawType === 'magiclink') {
        try {
          await fetch('/api/email/welcome', { method: 'POST', credentials: 'same-origin' });
        } catch (err) {
          console.error('[auth/confirm] welcome email trigger failed', err);
        }
      }

      setPhase('success');
      router.replace(next);
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (phase === 'loading' || phase === 'success') {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Verifying your link…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-24 text-center">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Link expired or invalid
      </h1>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
      <Link
        href="/forgot-password"
        className="inline-flex text-sm font-semibold"
        style={{ color: 'var(--accent-primary)' }}
      >
        Request a new reset link →
      </Link>
    </div>
  );
}
