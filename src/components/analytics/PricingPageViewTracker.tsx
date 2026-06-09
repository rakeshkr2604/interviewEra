'use client';

import { useEffect } from 'react';
import { trackPricingPageViewedOnce } from '@/lib/analytics/funnel-ga4-bridge';

type PricingPageViewTrackerProps = {
  sourcePage: '/pricing' | '/upgrade';
  /** When omitted, auth state is resolved on the client (for public /pricing). */
  authenticated?: boolean;
};

export function PricingPageViewTracker({
  sourcePage,
  authenticated,
}: PricingPageViewTrackerProps) {
  useEffect(() => {
    if (authenticated !== undefined) {
      trackPricingPageViewedOnce(sourcePage, authenticated);
      return;
    }

    let cancelled = false;

    (async () => {
      let isAuthenticated = false;
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        isAuthenticated = !!user;
      } catch {
        /* best-effort */
      }

      if (!cancelled) {
        trackPricingPageViewedOnce(sourcePage, isAuthenticated);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sourcePage, authenticated]);

  return null;
}
