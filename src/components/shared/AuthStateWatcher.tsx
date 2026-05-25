'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

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

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Subscribes to Supabase auth state changes globally. When a background token
 * refresh fails (stale/revoked session), Supabase fires SIGNED_OUT after clearing
 * localStorage. We redirect to /login only if the user is on a protected route.
 *
 * Perf: Supabase is dynamically imported and the work is deferred to browser-idle,
 * so the (large) client never sits in the initial bundle or blocks hydration (TBT).
 * Protected routes are already gated server-side by middleware; this is a secondary
 * client-side cleanup for stale localStorage tokens, so a brief delay is safe.
 */
export function AuthStateWatcher() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Perf: public/marketing routes (e.g. the homepage) have no protected content to
    // guard, so we skip importing/initialising Supabase entirely there — it never
    // enters the bundle or the load critical path. Re-runs on SPA navigation, so it
    // activates the moment the user enters a protected route.
    if (!isProtectedPath(pathname)) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const work = async () => {
      const [{ createClient }, { signOutIfStaleAuth, shouldClearStaleAuthCookies }] =
        await Promise.all([
          import('@/lib/supabase/client'),
          import('@/lib/supabase/session'),
        ]);
      if (cancelled) return;
      const supabase = createClient();

      void supabase.auth.getUser().then(({ error }) => {
        if (error && shouldClearStaleAuthCookies(error)) {
          void signOutIfStaleAuth(supabase, error).then(() => {
            if (isProtectedPath(window.location.pathname)) router.push('/login');
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
      unsubscribe = () => subscription.unsubscribe();
    };

    const w = window as IdleWindow;
    const usedIdle = typeof w.requestIdleCallback === 'function';
    const handle: number = usedIdle
      ? w.requestIdleCallback!(() => void work(), { timeout: 2500 })
      : (window.setTimeout(() => void work(), 200) as unknown as number);

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (usedIdle) w.cancelIdleCallback?.(handle);
      else clearTimeout(handle);
    };
  }, [pathname, router]);

  return null;
}
