'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const CommunityBanner = dynamic(
  () => import('@/components/community/CommunityBanner').then((m) => m.CommunityBanner),
  { ssr: false },
);

/**
 * Idle-gated community banner — keeps lucide + storage hydration off the LCP path.
 * Banner still appears within a few seconds (and on first interaction).
 */
export function CommunityBannerDeferred() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const activate = () => {
      if (!cancelled) setReady(true);
    };

    type IdleWin = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const w = window as IdleWin;

    const onInteraction = () => activate();
    window.addEventListener('pointerdown', onInteraction, { once: true, passive: true });
    window.addEventListener('keydown', onInteraction, { once: true });

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof w.requestIdleCallback === 'function') {
      idleId = w.requestIdleCallback(activate, { timeout: 3500 });
    } else {
      timeoutId = setTimeout(activate, 2500);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', onInteraction);
      window.removeEventListener('keydown', onInteraction);
      if (idleId != null) w.cancelIdleCallback?.(idleId);
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, []);

  if (!ready) return null;
  return <CommunityBanner />;
}
