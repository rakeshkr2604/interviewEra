'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { EmailOtpType } from '@supabase/supabase-js';
import { isAuthV2Enabled } from '@/lib/auth/flags';
import { isSafePath } from '@/lib/auth/auth-params';
import {
  extractInviteTokenFromNext,
  resolveDestinationFromTier,
} from '@/lib/auth/resolve-destination-core';

type ConfirmPhase = 'loading' | 'success' | 'error';

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  'recovery',
  'signup',
  'invite',
  'magiclink',
  'email_change',
  'email',
]);

function resolveNextLegacy(raw: string | null): string {
  if (isSafePath(raw)) {
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
      const rawNext = searchParams.get('next');

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
      const { data: verifyData, error } = await supabase.auth.verifyOtp({
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

      let destination = resolveNextLegacy(rawNext);

      if (isAuthV2Enabled() && verifyData.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('plan_tier')
          .eq('id', verifyData.user.id)
          .single();

        const inviteToken = extractInviteTokenFromNext(isSafePath(rawNext) ? rawNext : undefined);
        destination = resolveDestinationFromTier(profile?.plan_tier, {
          next: isSafePath(rawNext) ? rawNext : undefined,
          inviteToken,
        });
      }

      setPhase('success');
      router.replace(destination);
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

  const isSignupFlow =
    searchParams.get('type') === 'signup' || searchParams.get('type') === 'magiclink';
  const errorHref = isAuthV2Enabled()
    ? `/auth/error?code=verification_expired`
    : isSignupFlow
      ? '/signup'
      : '/forgot-password';

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-24 text-center">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Link expired or invalid
      </h1>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
      <Link
        href={errorHref}
        className="inline-flex text-sm font-semibold"
        style={{ color: 'var(--accent-primary)' }}
      >
        {isSignupFlow ? 'Get help verifying your email →' : 'Request a new reset link →'}
      </Link>
    </div>
  );
}
