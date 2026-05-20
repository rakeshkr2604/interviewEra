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
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'auth_redirect';

export function PostAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_IN') return;

      const pending = sessionStorage.getItem(STORAGE_KEY);
      if (!pending) return;

      // Validate: only same-origin paths, no open redirect
      if (pending.startsWith('/') && !pending.startsWith('//')) {
        sessionStorage.removeItem(STORAGE_KEY);
        router.push(pending);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
