'use client';

import { useEffect, useState } from 'react';
import { T } from '@/components/landing/landing-home-tokens';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { CommunityCTA } from '@/components/community/CommunityCTA';

/**
 * Minimal client island so the homepage stays static (better bfcache): primary CTA href
 * upgrades from /signup → /dashboard after idle Supabase check.
 */
export default function LandingHeroCtaIsland() {
  const [primaryHref, setPrimaryHref] = useState<'/signup' | '/dashboard'>('/signup');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
        const authed = !!(user && !error);
        if (!cancelled) {
          setPrimaryHref(authed ? '/dashboard' : '/signup');
          setIsAuthenticated(authed);
        }
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) {
            setPrimaryHref(session?.user ? '/dashboard' : '/signup');
            setIsAuthenticated(!!session?.user);
          }
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

  const primaryLabel = isAuthenticated ? 'Dashboard' : 'Start Free';

  return (
    <div className="max-w-[32rem]">
      <div className="mb-5 flex flex-wrap gap-3">
        <TrackedCtaLink
          href={primaryHref}
          ctaKey={CTA_KEYS.START_FREE_INTERVIEW}
          ctaText={primaryLabel}
          section="hero"
          authenticated={isAuthenticated}
          className="v3-btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-[15px] font-semibold no-underline"
          style={{
            color: '#fff',
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: 'nowrap',
          }}
        >
          {primaryLabel}
        </TrackedCtaLink>
        <TrackedCtaLink
          href="/campus"
          prefetch={false}
          ctaKey={CTA_KEYS.FOR_COLLEGES}
          ctaText="For Colleges"
          section="hero_secondary"
          authenticated={isAuthenticated}
          className="v3-btn-secondary hero-v3-btn-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] px-7 py-3.5 text-[15px] font-semibold no-underline"
          style={{
            borderColor: T.bord2,
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: 'nowrap',
          }}
        >
          For Colleges
        </TrackedCtaLink>
      </div>
      <p
        className="mb-3 text-[13px] leading-relaxed"
        style={{ color: T.text2 }}
      >
        Students start free • Colleges run campus placements • Hiring teams coming soon.
      </p>
      <CommunityCTA placement="landing_hero" className="mb-0 block" />
    </div>
  );
}
