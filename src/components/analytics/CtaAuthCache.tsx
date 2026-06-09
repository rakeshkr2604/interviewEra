'use client';

import { useEffect } from 'react';
import { setCtaAuthCache } from '@/lib/analytics/cta';

/** Keeps CTA click handlers in sync with auth without per-link Supabase calls. */
export function CtaAuthCache() {
  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        if (cancelled) return;

        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!cancelled) setCtaAuthCache(!!user);

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) setCtaAuthCache(!!session?.user);
        });
        unsub = () => sub.subscription.unsubscribe();
      } catch {
        if (!cancelled) setCtaAuthCache(false);
      }
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  return null;
}
