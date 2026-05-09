'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const LandingHomeMidFold = dynamic(() => import('@/components/landing/LandingHomeMidFold'), {
  loading: () => (
    <div
      className="mx-auto min-h-[560px] max-w-[1080px] animate-pulse rounded-2xl px-7 opacity-40"
      style={{ background: 'var(--bg-secondary)' }}
      aria-hidden
    />
  ),
});

const LandingHomeBelowFold = dynamic(
  () => import('@/components/landing/LandingHomeBelowFold'),
  {
    loading: () => (
      <div
        className="mx-auto my-12 min-h-[40vh] max-w-[1080px] animate-pulse rounded-2xl px-7 opacity-40"
        style={{ background: 'var(--card-bg)' }}
        aria-hidden
      />
    ),
  },
);

export default function LandingHomeClient() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const work = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        if (cancelled) return;
        const supabase = createClient();
        void supabase.auth.getUser().then(async ({ data, error }) => {
          if (error) {
            const { signOutIfStaleAuth } = await import('@/lib/supabase/session');
            await signOutIfStaleAuth(supabase, error);
            if (!cancelled) setIsLoggedIn(false);
          } else if (!cancelled) {
            setIsLoggedIn(Boolean(data.user));
          }
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) setIsLoggedIn(Boolean(session?.user));
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      } catch {
        /* network / chunk error — landing still works */
      }
    };

    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const w = window as IdleWindow;
    const handle: number | ReturnType<typeof setTimeout> = w.requestIdleCallback
      ? w.requestIdleCallback(() => void work(), { timeout: 1500 })
      : setTimeout(() => void work(), 0);

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (typeof handle === 'number' && 'cancelIdleCallback' in window) {
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(handle);
      } else {
        clearTimeout(handle as ReturnType<typeof setTimeout>);
      }
    };
  }, []);

  return (
    <>
      <LandingHomeMidFold isLoggedIn={isLoggedIn} />
      <LandingHomeBelowFold isLoggedIn={isLoggedIn} />
    </>
  );
}
