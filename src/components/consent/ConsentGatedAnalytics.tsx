'use client';

import Script from 'next/script';
import { Suspense } from 'react';
import { GoogleAnalyticsPageView } from '@/components/analytics/GoogleAnalyticsPageView';
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent';
import { GA_MEASUREMENT_ID } from '@/lib/analytics/gtag';

/**
 * Loads GA4 scripts + SPA pageviews only after explicit analytics Accept.
 * Clarity and Vercel metrics self-gate via the same consent store.
 */
export function ConsentGatedAnalytics() {
  const { ready, analyticsAllowed } = useAnalyticsConsent();

  if (!ready || !analyticsAllowed) {
    return null;
  }

  const gaEnabled =
    process.env.NODE_ENV === 'production' && Boolean(GA_MEASUREMENT_ID);

  if (!gaEnabled) {
    return (
      <Suspense fallback={null}>
        <GoogleAnalyticsPageView />
      </Suspense>
    );
  }

  return (
    <>
      <Script
        id="google-analytics-gtag"
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics-init"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
                `,
        }}
      />
      <Suspense fallback={null}>
        <GoogleAnalyticsPageView />
      </Suspense>
    </>
  );
}
