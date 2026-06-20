'use client';

/**
 * Safety net when Supabase recovery/OAuth lands on Site URL (/) with tokens in the
 * hash fragment instead of /auth/callback?code=… — e.g. redirect URL not whitelisted.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

function parseHashParams(hash: string): URLSearchParams {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
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
        const q = new URLSearchParams();
        if (error) q.set('error', error);
        if (errorCode) q.set('error_code', errorCode);
        const desc = params.get('error_description');
        if (desc) q.set('error_description', desc);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        if (!cancelled) {
          router.replace(`/login?${q.toString()}`);
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
        router.replace('/login?error=auth_callback_failed');
        return;
      }

      if (flowType === 'recovery') {
        router.replace('/reset-password');
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
