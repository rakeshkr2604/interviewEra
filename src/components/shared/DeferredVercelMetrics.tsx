'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent';

const SpeedInsightsLazy = dynamic(
  () => import('@vercel/speed-insights/next').then((m) => m.SpeedInsights),
  { ssr: false },
);

const AnalyticsLazy = dynamic(
  () => import('@vercel/analytics/react').then((m) => m.Analytics),
  { ssr: false },
);

/**
 * Loads Vercel Analytics + Speed Insights after idle — and only after the
 * visitor explicitly accepts optional analytics cookies.
 */
export function DeferredVercelMetrics() {
  const { ready, analyticsAllowed } = useAnalyticsConsent();
  const [idleReady, setIdleReady] = useState(false);

  useEffect(() => {
    if (!ready || !analyticsAllowed) {
      return;
    }

    type IdleWin = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const w = window as IdleWin;
    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const markIdle = () => {
      if (!cancelled) setIdleReady(true);
    };

    if (w.requestIdleCallback) {
      idleHandle = w.requestIdleCallback(markIdle, { timeout: 4000 });
    } else {
      timeoutHandle = setTimeout(markIdle, 1);
    }

    return () => {
      cancelled = true;
      if (idleHandle !== undefined) {
        const win = window as Window & { cancelIdleCallback?: (id: number) => void };
        win.cancelIdleCallback?.(idleHandle);
      }
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    };
  }, [ready, analyticsAllowed]);

  if (!ready || !analyticsAllowed || !idleReady) return null;

  return (
    <>
      <SpeedInsightsLazy />
      <AnalyticsLazy />
    </>
  );
}
