/**
 * Unified funnel analytics — GA4 custom events + product-events pipeline.
 */

import { trackEvent } from '@/lib/analytics/gtag';
import {
  trackProductEvent,
  trackProductEventClient,
  type ProductEventName,
  type ProductEventPayload,
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
  [key: string]: string | number | boolean | undefined;
};

export type FunnelTrackOptions = {
  /** Send to GA4 (client only). Default true on client. */
  ga4?: boolean;
  /** Send to product-events log / CustomEvent. Default true. */
  product?: boolean;
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

function toGa4Params(payload: FunnelEventPayload): Record<string, string | number | boolean> {
  const ga: Record<string, string | number | boolean> = {};

  if (payload.userId) ga.user_id = payload.userId;
  if (payload.interviewId) ga.interview_id = payload.interviewId;
  if (payload.resumeId) ga.resume_id = payload.resumeId;
  if (payload.role) ga.role = payload.role;
  if (payload.source) ga.source = payload.source;
  if (payload.plan) ga.plan = payload.plan;
  if (typeof payload.amount === 'number' && Number.isFinite(payload.amount)) {
    ga.amount = payload.amount;
  }
  if (payload.paymentId) ga.payment_id = payload.paymentId;
  if (payload.sourcePage) ga.source_page = payload.sourcePage;
  if (typeof payload.authenticated === 'boolean') {
    ga.authenticated = payload.authenticated;
  }

  const score = payload.score ?? payload.sessionScore;
  if (typeof score === 'number' && Number.isFinite(score)) {
    ga.score = score;
  }

  if (payload.method && typeof payload.method === 'string') {
    ga.method = payload.method;
  }

  return ga;
}

function toProductProps(
  payload: FunnelEventPayload,
): Record<string, string | number | boolean | undefined> {
  return { ...payload };
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

  const productName = resolveProductEventName(eventName);
  const productProps = toProductProps(payload);

  if (sendProduct) {
    if (isClient) {
      trackProductEventClient(productName, productProps);
    } else {
      trackProductEvent({ event: productName, ...productProps });
    }
  }

  if (sendGa4) {
    trackEvent(eventName, toGa4Params(payload));
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
