'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signOutIfStaleAuth, shouldClearStaleAuthCookies } from '@/lib/supabase/session';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/interview',
  '/report',
  '/onboarding',
  '/settings',
  '/history',
  '/analytics',
  '/feedback',
  '/upgrade',
  '/profile',
  '/admin',
  '/college',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Subscribes to Supabase auth state changes globally. When a background token
 * refresh fails (stale/revoked session), Supabase fires SIGNED_OUT after clearing
 * localStorage. We redirect to /login only if the user is on a protected route.
 *
 * Also runs a one-time getUser() check on mount so that users with dead tokens
 * stored in localStorage don't sit on broken pages — signOutIfStaleAuth calls
 * client.auth.signOut() which purges the stale localStorage entry immediately.
 */
export function AuthStateWatcher() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // One-time check: clear stale localStorage session immediately on mount.
    supabase.auth.getUser().then(({ error }) => {
      if (error && shouldClearStaleAuthCookies(error)) {
        void signOutIfStaleAuth(supabase, error).then(() => {
          if (isProtectedPath(window.location.pathname)) {
            router.push('/login');
          }
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && isProtectedPath(window.location.pathname)) {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
