'use client';

import Script from 'next/script';
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent';

/**
 * Microsoft Clarity — session recording + heatmaps (optional analytics).
 *
 * Loads only after the visitor explicitly accepts analytics cookies.
 * Essential auth/session cookies are unrelated and never gated here.
 *
 * - id="ms-clarity" lets Next.js Script deduplication discard duplicate mounts
 * - strategy="lazyOnload" keeps Clarity off the LCP / TBT critical path
 */

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

export function Clarity() {
  const { ready, analyticsAllowed } = useAnalyticsConsent();

  if (
    !ready ||
    !analyticsAllowed ||
    process.env.NODE_ENV !== 'production' ||
    !CLARITY_ID
  ) {
    return null;
  }

  return (
    <Script
      id="ms-clarity"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`,
      }}
    />
  );
}
