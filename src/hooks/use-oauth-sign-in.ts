'use client';

import { useCallback, useState } from 'react';
import { getAuthRedirectOrigin } from '@/lib/auth/redirect-origin';
import { createClient } from '@/lib/supabase/client';
import { isAuthV2Enabled } from '@/lib/auth/flags';
import { extractInviteTokenFromNext } from '@/lib/auth/resolve-destination-core';
import type { AuthIntent } from '@/lib/auth/auth-intent';
import { useAuthAnalytics } from '@/hooks/use-auth-analytics';

const AUTH_INTENT_COOKIE = 'auth_intent';
const AUTH_INTENT_MAX_AGE = 300;

function setAuthIntentCookie(intent?: AuthIntent) {
  if (!intent || intent === 'candidate') return;
  document.cookie = `${AUTH_INTENT_COOKIE}=${intent}; path=/; max-age=${AUTH_INTENT_MAX_AGE}; SameSite=Lax`;
}

export function useOAuthSignIn(options?: { next?: string; intent?: AuthIntent; flow?: 'login' | 'signup' }) {
  const [loading, setLoading] = useState(false);
  const { trackOauthStarted } = useAuthAnalytics();

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    trackOauthStarted({
      provider: 'google',
      flow: options?.flow ?? 'login',
      intent: options?.intent,
      next: options?.next,
    });

    try {
      if (options?.next) {
        sessionStorage.setItem('auth_redirect', options.next);
      }
      if (isAuthV2Enabled()) {
        setAuthIntentCookie(options?.intent);
      }

      const supabase = createClient();
      const redirectTo = new URL(`${getAuthRedirectOrigin()}/auth/callback`);
      if (options?.next) {
        redirectTo.searchParams.set('next', options.next);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectTo.toString() },
      });

      if (error) {
        setLoading(false);
        throw error;
      }
    } catch {
      setLoading(false);
      throw new Error('oauth_start_failed');
    }
  }, [options?.flow, options?.intent, options?.next, trackOauthStarted]);

  return { signInWithGoogle, loading };
}

export { extractInviteTokenFromNext };
