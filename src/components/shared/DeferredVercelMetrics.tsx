'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const SpeedInsightsLazy = dynamic(
  () => import('@vercel/speed-insights/next').then((m) => m.SpeedInsights),
  { ssr: false },
);

const AnalyticsLazy = dynamic(
  () => import('@vercel/analytics/react').then((m) => m.Analytics),
  { ssr: false },
);

/**
 * Loads Vercel Analytics + Speed Insights after idle so they do not contend
 * with LCP / initial main-thread parsing.
 */
export function DeferredVercelMetrics() {
  const [load, setLoad] = useState(false);

  useEffect(() => {
    type IdleWin = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const w = window as IdleWin;
    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    if (w.requestIdleCallback) {
      idleHandle = w.requestIdleCallback(() => setLoad(true), { timeout: 4000 });
    } else {
      timeoutHandle = setTimeout(() => setLoad(true), 1);
    }

    return () => {
      if (idleHandle !== undefined) {
        const win = window as Window & { cancelIdleCallback?: (id: number) => void };
        win.cancelIdleCallback?.(idleHandle);
      }
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    };
  }, []);

  if (!load) return null;

  return (
    <>
      <SpeedInsightsLazy />
      <AnalyticsLazy />
    </>
  );
}
