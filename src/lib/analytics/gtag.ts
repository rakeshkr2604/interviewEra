/**
 * Google Analytics 4 (gtag.js) helpers.
 *
 * Scripts are loaded once from `app/layout.tsx` via next/script.
 * Use `pageview` for route changes and `trackEvent` for custom events.
 */

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-S0W24B29KG";

export const isGaEnabled =
  process.env.NODE_ENV === "production" && Boolean(GA_MEASUREMENT_ID);

type GtagCommand = "config" | "event" | "js" | "set";

type GtagEventParams = Record<
  string,
  string | number | boolean | undefined
>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (
      command: GtagCommand | string,
      targetId: string | Date,
      params?: GtagEventParams,
    ) => void;
  }
}

/** Record a page view (path may include query string). */
export function pageview(url: string): void {
  if (!isGaEnabled || typeof window === "undefined" || !window.gtag) {
    return;
  }

  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: url,
  });
}

/** Fire a custom GA4 event from client components or handlers. */
export function trackEvent(
  action: string,
  params?: GtagEventParams,
): void {
  if (!isGaEnabled || typeof window === "undefined" || !window.gtag) {
    return;
  }

  window.gtag("event", action, params);
}
