'use client';

/**
 * PostAuthRedirect — fires once after a successful Google OAuth sign-in
 * and redirects to the path stored in sessionStorage under 'auth_redirect'.
 *
 * Why sessionStorage (not cookies)?
 *   Supabase OAuth sometimes lands on the Site URL (/) instead of our
 *   /auth/callback because localhost isn't whitelisted in the Supabase
 *   dashboard. The browser Supabase client then exchanges the code itself
 *   and fires onAuthStateChange. sessionStorage survives tab navigations
 *   (unlike page-reload-cleared state) and is isolated to the origin,
 *   so it's safe to store a redirect path there.
 *
 * Usage: mount once in the root layout. LoginForm sets the storage key
 * before initiating OAuth.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isSafePath } from '@/lib/auth/auth-params';
import { isAuthV2Enabled } from '@/lib/auth/flags';
import {
  extractInviteTokenFromNext,
  resolveDestinationFromTier,
} from '@/lib/auth/resolve-destination-core';

const STORAGE_KEY = 'auth_redirect';

export function PostAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Perf: only the post-OAuth return navigation has a pending redirect. On every
    // other visit (the vast majority) we skip importing/initialising Supabase entirely,
    // keeping it out of the bundle and off the hydration path.
    if (typeof window === 'undefined' || !sessionStorage.getItem(STORAGE_KEY)) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const { createClient } = await import('@/lib/supabase/client');
      if (cancelled) return;
      const supabase = createClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event) => {
        if (event !== 'SIGNED_IN') return;
        const pending = sessionStorage.getItem(STORAGE_KEY);
        if (!pending) return;
        sessionStorage.removeItem(STORAGE_KEY);

        if (!isSafePath(pending)) return;

        if (isAuthV2Enabled()) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('users')
              .select('plan_tier')
              .eq('id', user.id)
              .single();
            const inviteToken = extractInviteTokenFromNext(pending);
            const destination = resolveDestinationFromTier(profile?.plan_tier, {
              next: pending,
              inviteToken,
            });
            router.push(destination);
            return;
          }
        }

        router.push(pending);
      });
      unsubscribe = () => subscription.unsubscribe();
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router]);

  return null;
}
