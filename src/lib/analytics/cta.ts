/**
 * Landing CTA analytics — visitor → cta_click step in the revenue funnel.
 */

import { getStoredAttribution } from '@/lib/analytics/attribution';
import type { CtaKey } from '@/lib/analytics/cta-keys';
import { standardizeAnalyticsProps } from '@/lib/analytics/schema';
import { trackEvent } from '@/lib/analytics/gtag';
import { trackProductEventClient } from '@/lib/analytics/product-events';

const EVENT_NAME = 'landing_cta_clicked';

const DEDUPE_MS = 800;
const recentClicks = new Map<string, number>();

let cachedAuthenticated: boolean | null = null;

/** Updated by CtaAuthCache in root layout for click-time auth resolution. */
export function setCtaAuthCache(authenticated: boolean): void {
  cachedAuthenticated = authenticated;
}

function shouldDedupeClick(key: string): boolean {
  const now = Date.now();
  const last = recentClicks.get(key);
  if (last !== undefined && now - last < DEDUPE_MS) return true;
  recentClicks.set(key, now);
  return false;
}

function resolveAuthenticated(explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit;
  return cachedAuthenticated ?? false;
}

/** Fire landing_cta_clicked to GA4 + client product-event + durable product_events beacon. */
export function trackLandingCtaClicked(params: {
  ctaKey: CtaKey;
  ctaText: string;
  section: string;
  page?: string;
  authenticated?: boolean;
}): void {
  if (typeof window === 'undefined') return;

  const page =
    params.page ??
    (typeof window !== 'undefined' ? window.location.pathname : '/');

  const attribution = getStoredAttribution();
  const dedupeKey = `${page}:${params.section}:${params.ctaKey}`;
  if (shouldDedupeClick(dedupeKey)) return;

  const standardized = standardizeAnalyticsProps(EVENT_NAME, {
    ctaKey: params.ctaKey,
    ctaText: params.ctaText,
    page,
    section: params.section,
    authenticated: resolveAuthenticated(params.authenticated),
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
  });

  const { event_name: _en, ...productProps } = standardized;
  trackProductEventClient(EVENT_NAME, productProps);
  trackEvent(EVENT_NAME, standardized);

  void fetch('/api/analytics/cta-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify({
      cta_key: productProps.cta_key,
      cta_text: productProps.cta_text,
      page: productProps.page,
      section: productProps.section,
    }),
  }).catch(() => {
    /* best-effort durable store */
  });
}
