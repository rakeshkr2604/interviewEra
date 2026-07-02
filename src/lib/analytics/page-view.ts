/**
 * Durable page_view — GA4 page_path + product_events persistence.
 */

import { pageview, trackEvent } from '@/lib/analytics/gtag';
import { markAnalyticsDedupeKey } from '@/lib/analytics/dedupe';
import { trackProductEventClient } from '@/lib/analytics/product-events';

const STORAGE_PREFIX = 'ie_page_view:';

export type PageViewPayload = {
  page_path: string;
  user_id?: string;
};

/** Normalize path for dedupe keys (leading slash, no hash). */
export function normalizePagePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Track a page view once per browser session per path (SPA-safe).
 * - GA4: config page_path + custom `page_view` event
 * - Client product event + beacon to `/api/analytics/page-view` for durable store
 */
export function trackDurablePageView(
  rawPath: string,
  options: { userId?: string; force?: boolean } = {},
): boolean {
  if (typeof window === 'undefined') return false;

  const pagePath = normalizePagePath(rawPath);
  const dedupeKey = options.userId ? `${pagePath}:${options.userId}` : pagePath;

  if (!options.force && !markAnalyticsDedupeKey(STORAGE_PREFIX, dedupeKey)) {
    return false;
  }

  const payload: PageViewPayload = {
    page_path: pagePath,
    ...(options.userId ? { user_id: options.userId } : {}),
  };

  pageview(pagePath);
  trackEvent('page_view', payload);
  trackProductEventClient('page_view', payload);

  void fetch('/api/analytics/page-view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify({ path: pagePath }),
  }).catch(() => {
    /* best-effort */
  });

  return true;
}
