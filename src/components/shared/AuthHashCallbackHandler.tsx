'use client';

/**
 * Safety net when Supabase recovery/OAuth lands on Site URL (/) with tokens in the
 * hash fragment instead of /auth/callback?code=… — e.g. redirect URL not whitelisted.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthV2Enabled } from '@/lib/auth/flags';
import { normalizeAuthErrorCode } from '@/lib/auth/auth-errors';
import { extractInviteTokenFromNext, resolveDestinationFromTier } from '@/lib/auth/resolve-destination-core';

function parseHashParams(hash: string): URLSearchParams {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
}

function buildErrorRedirect(params: URLSearchParams): string {
  const error = params.get('error');
  const errorCode = params.get('error_code');
  const desc = params.get('error_description');
  const code = normalizeAuthErrorCode(error ?? errorCode, desc);
  const q = new URLSearchParams({ code });
  if (desc) q.set('error_description', desc);
  return `/auth/error?${q.toString()}`;
}

export function AuthHashCallbackHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash || hash.length <= 1) return;

    const params = parseHashParams(hash);
    const hasAuthPayload =
      params.has('access_token') || params.has('error') || params.has('error_code');
    if (!hasAuthPayload) return;

    let cancelled = false;

    void (async () => {
      const error = params.get('error');
      const errorCode = params.get('error_code');
      const flowType = params.get('type');

      if (error || errorCode) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        if (!cancelled) {
          if (isAuthV2Enabled()) {
            router.replace(buildErrorRedirect(params));
          } else {
            const q = new URLSearchParams();
            if (error) q.set('error', error);
            if (errorCode) q.set('error_code', errorCode);
            const desc = params.get('error_description');
            if (desc) q.set('error_description', desc);
            router.replace(`/login?${q.toString()}`);
          }
        }
        return;
      }

      const { createClient } = await import('@/lib/supabase/client');
      if (cancelled) return;
      const supabase = createClient();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      if (cancelled) return;

      if (sessionError || !session) {
        if (isAuthV2Enabled()) {
          router.replace('/auth/error?code=auth_callback_failed');
        } else {
          router.replace('/login?error=auth_callback_failed');
        }
        return;
      }

      if (flowType === 'recovery') {
        router.replace('/reset-password');
        return;
      }

      if (isAuthV2Enabled() && session.user) {
        const pending = sessionStorage.getItem('auth_redirect');
        const inviteToken = extractInviteTokenFromNext(pending);
        const { data: profile } = await supabase
          .from('users')
          .select('plan_tier')
          .eq('id', session.user.id)
          .single();
        const destination = resolveDestinationFromTier(profile?.plan_tier, {
          next: pending ?? undefined,
          inviteToken,
        });
        router.replace(destination);
        return;
      }

      router.replace('/dashboard');
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
