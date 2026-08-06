'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { T } from '@/components/landing/landing-home-tokens';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { CommunityCTA } from '@/components/community/CommunityCTA';
import { cn } from '@/lib/utils';

/**
 * Minimal client island so the homepage stays static (better bfcache): primary CTA href
 * upgrades from /signup → /dashboard after idle Supabase check.
 *
 * Hierarchy: CTAs → trust strip → audience line → optional community link.
 * Trust sits above conditional community CTA to avoid CLS when community appears.
 */
export default function LandingHeroCtaIsland({ trustStrip }: { trustStrip?: ReactNode }) {
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

  const primaryLabel = isAuthenticated ? 'Dashboard' : 'Start Free Mock Interview';

  return (
    <div className="hero-cta-island max-w-[32rem]">
      <div className="hero-cta-island__actions flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
        <TrackedCtaLink
          href={primaryHref}
          ctaKey={CTA_KEYS.START_FREE_INTERVIEW}
          ctaText={primaryLabel}
          section="hero"
          authenticated={isAuthenticated}
          className="v3-btn-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold no-underline sm:w-auto sm:px-8"
          style={{
            color: '#fff',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {primaryLabel}
        </TrackedCtaLink>
        <TrackedCtaLink
          href="/#interview-report"
          ctaKey={CTA_KEYS.SEE_SAMPLE_REPORT}
          ctaText="See Sample Interview Report"
          section="hero_secondary"
          authenticated={isAuthenticated}
          className="v3-btn-secondary hero-v3-btn-secondary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] px-6 py-3.5 text-[14.5px] font-semibold no-underline sm:w-auto sm:px-7 sm:text-[15px]"
          style={{
            borderColor: T.bord2,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          See Sample Interview Report
        </TrackedCtaLink>
      </div>

      {trustStrip ? <div className="mt-4 sm:mt-6">{trustStrip}</div> : null}

      <ul
        className="hero-audience-line mt-3.5 grid list-none grid-cols-1 gap-1.5 p-0 text-[13px] leading-snug sm:mt-5 sm:flex sm:flex-wrap sm:items-center sm:gap-y-2 sm:text-[14px] sm:leading-relaxed"
        style={{ color: T.text2 }}
        aria-label="Who InterviewEra is for"
      >
        {(
          [
            { label: 'Students: 3 free interviews', sep: T.ok },
            { label: 'Colleges run campus placements', sep: T.acc },
          ] as const
        ).map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                'inline-block size-[5px] shrink-0 rounded-full',
                i === 0 ? 'sm:mr-3' : 'sm:mx-3',
              )}
              style={{ background: item.sep }}
            />
            <span className="min-w-0">{item.label}</span>
          </li>
        ))}
      </ul>

      {/* Reserved line height so optional community link does not shove layout */}
      <div className="mt-2 min-h-[1.25rem] sm:mt-2.5">
        <CommunityCTA placement="landing_hero" className="mb-0 block text-[13px]" />
      </div>
    </div>
  );
}
