/**
 * Unified funnel analytics — GA4 custom events + product-events pipeline.
 */

import { trackEvent } from '@/lib/analytics/gtag';
import {
  attributionToGa4Params,
  enrichPayloadWithAttribution,
  type AttributionData,
} from '@/lib/analytics/attribution';
import { standardizeAnalyticsProps } from '@/lib/analytics/schema';
import {
  trackProductEvent,
  trackProductEventClient,
  type ProductEventName,
} from '@/lib/analytics/product-events';

export type FunnelEventName =
  | 'signup_completed'
  | 'resume_uploaded'
  | 'mock_interview_started'
  | 'mock_interview_completed'
  | 'payment_started'
  | 'payment_completed'
  | 'pricing_page_viewed';

export type FunnelEventPayload = {
  userId?: string;
  interviewId?: string;
  resumeId?: string;
  role?: string;
  source?: string;
  sourcePage?: string;
  plan?: string;
  amount?: number;
  paymentId?: string;
  authenticated?: boolean;
  score?: number;
  method?: string;
  qualityMet?: boolean;
  sessionScore?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  [key: string]: string | number | boolean | undefined;
};

export type FunnelTrackOptions = {
  /** Send to GA4 (client only). Default true on client. */
  ga4?: boolean;
  /** Send to product-events log / CustomEvent. Default true. */
  product?: boolean;
  /** Server-side attribution from request cookies; client auto-reads storage when omitted. */
  attribution?: AttributionData;
};

/** Maps funnel events to legacy product-event names where they differ. */
const FUNNEL_TO_PRODUCT: Partial<Record<FunnelEventName, ProductEventName>> = {
  mock_interview_completed: 'interview_completed',
};

const RUNTIME_FUNNEL_EVENTS = new Set<FunnelEventName>([
  'signup_completed',
  'resume_uploaded',
  'mock_interview_started',
  'mock_interview_completed',
  'payment_started',
  'payment_completed',
  'pricing_page_viewed',
]);

function resolveProductEventName(eventName: FunnelEventName): ProductEventName {
  return FUNNEL_TO_PRODUCT[eventName] ?? (eventName as ProductEventName);
}

function buildStandardizedPayload(
  eventName: FunnelEventName,
  payload: FunnelEventPayload,
): Record<string, string | number | boolean | undefined> {
  const score = payload.score ?? payload.sessionScore;
  const withScore =
    typeof score === 'number' && Number.isFinite(score)
      ? { ...payload, score }
      : payload;

  return standardizeAnalyticsProps(eventName, {
    ...withScore,
    ...attributionToGa4Params(withScore),
  });
}

/**
 * Track a North Star funnel step.
 * - Browser: GA4 `trackEvent` + `trackProductEventClient`
 * - Server: `trackProductEvent` (Vercel log line)
 */
export function trackFunnelEvent(
  eventName: FunnelEventName,
  payload: FunnelEventPayload = {},
  options: FunnelTrackOptions = {},
): void {
  if (!RUNTIME_FUNNEL_EVENTS.has(eventName)) return;

  const sendProduct = options.product !== false;
  const isClient = typeof window !== 'undefined';
  const sendGa4 = options.ga4 !== false && isClient;

  const enrichedPayload = enrichPayloadWithAttribution(payload, options.attribution);
  const standardized = buildStandardizedPayload(eventName, enrichedPayload);
  const productName = resolveProductEventName(eventName);

  if (sendProduct) {
    const { event_name: _en, ...productProps } = standardized;
    if (isClient) {
      trackProductEventClient(productName, productProps);
    } else {
      trackProductEvent({ event_name: productName, ...productProps });
    }
  }

  if (sendGa4) {
    trackEvent(eventName, standardized);
  }
}

/** GA4 event name equals funnel name for all P0 steps. */
export function funnelGa4EventName(eventName: FunnelEventName): string {
  return eventName;
}

/** Product-event name written to `[product-event]` logs. */
export function funnelProductEventName(eventName: FunnelEventName): ProductEventName {
  return resolveProductEventName(eventName);
}
