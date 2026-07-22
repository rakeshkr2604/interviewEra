import Script from "next/script";

/**
 * Microsoft Clarity — session recording + heatmaps.
 *
 * Design constraints:
 * - Pure Server Component: no "use client", no hooks, no browser APIs.
 *   next/script with lazyOnload works from Server Components — Next.js
 *   serialises the Script marker into the RSC payload and the client runtime
 *   inserts the actual <script> tag after the window load event.
 * - process.env.NODE_ENV is a build-time constant evaluated server-side, so
 *   early-returning null in dev causes ZERO hydration mismatch (null on server
 *   = null on client; the Script element is simply never emitted).
 * - id="ms-clarity" lets Next.js Script deduplication discard any second render
 *   of this component (e.g. route transitions that re-render the root layout).
 * - strategy="lazyOnload" defers the tag until after load, keeping it out of
 *   the LCP / TBT critical path (accepted trade-off: slightly delayed early-
 *   session recording).
 */

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

export function Clarity() {
  if (process.env.NODE_ENV !== "production" || !CLARITY_ID) {
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
