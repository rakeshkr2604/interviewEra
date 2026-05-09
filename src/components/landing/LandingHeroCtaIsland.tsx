'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { T } from '@/components/landing/landing-home-tokens';

/**
 * Minimal client island so the homepage stays static (better bfcache): primary CTA href
 * upgrades from /signup → /dashboard after idle Supabase check.
 */
export default function LandingHeroCtaIsland() {
  const [primaryHref, setPrimaryHref] = useState<'/signup' | '/dashboard'>('/signup');

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    type IdleWin = Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    const w = window as IdleWin;

    const work = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        if (cancelled) return;
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) {
          const { signOutIfStaleAuth } = await import('@/lib/supabase/session');
          await signOutIfStaleAuth(supabase, error);
        }
        if (!cancelled) setPrimaryHref(user && !error ? '/dashboard' : '/signup');
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) setPrimaryHref(session?.user ? '/dashboard' : '/signup');
        });
        unsub = () => sub.subscription.unsubscribe();
      } catch {
        /* keep /signup */
      }
    };

    if (w.requestIdleCallback) {
      idleHandle = w.requestIdleCallback(() => void work(), { timeout: 2000 });
    } else {
      timeoutHandle = setTimeout(() => void work(), 0);
    }

    return () => {
      cancelled = true;
      unsub?.();
      if (idleHandle !== undefined) {
        const cw = window as Window & { cancelIdleCallback?: (id: number) => void };
        cw.cancelIdleCallback?.(idleHandle);
      }
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    };
  }, []);

  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
      <Link
        href={primaryHref}
        className="v3-btn-primary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '15px 32px',
          borderRadius: '12px',
          background: T.acc,
          color: '#fff',
          fontSize: '15px',
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Start a scored interview — free →
      </Link>
      <Link
        href="#how"
        className="v3-btn-secondary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '15px 32px',
          borderRadius: '12px',
          background: 'transparent',
          color: T.text,
          fontSize: '15px',
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          border: `1.5px solid ${T.bord2}`,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        See how scoring works
      </Link>
    </div>
  );
}
