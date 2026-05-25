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
      } = supabase.auth.onAuthStateChange((event) => {
        if (event !== 'SIGNED_IN') return;
        const pending = sessionStorage.getItem(STORAGE_KEY);
        if (!pending) return;
        sessionStorage.removeItem(STORAGE_KEY);
        // Validate: only same-origin paths, no open redirect
        if (pending.startsWith('/') && !pending.startsWith('//')) router.push(pending);
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
