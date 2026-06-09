/**
 * Structured product analytics — server logs + optional client beacon.
 */

import {
  standardizeAnalyticsProps,
  type AnalyticsProps,
} from '@/lib/analytics/schema';

export type ProductEventName =
  | 'upload_started'
  | 'upload_failed'
  | 'parse_degraded'
  | 'parse_failed'
  | 'ocr_attempted'
  | 'ocr_succeeded'
  | 'ocr_failed'
  | 'interview_generation_started'
  | 'interview_generation_completed'
  | 'interview_generation_fallback'
  | 'interview_completed'
  | 'signup_completed'
  | 'resume_uploaded'
  | 'mock_interview_started'
  | 'payment_started'
  | 'payment_completed'
  | 'pricing_page_viewed'
  | 'landing_cta_clicked'
  | 'streak_extended'
  | 'streak_broken';

export type ProductEventPayload = {
  /** @deprecated Legacy field — use event_name at emit boundary. */
  event?: ProductEventName;
  event_name?: ProductEventName;
  user_id?: string;
  /** @deprecated Prefer user_id — normalized at emit time. */
  userId?: string;
  resume_id?: string;
  resumeId?: string;
  interview_id?: string;
  interviewId?: string;
  code?: string;
  quality?: string;
  stage?: string;
  durationMs?: number;
  [key: string]: string | number | boolean | undefined;
};

function emitProductEvent(
  eventName: ProductEventName,
  props?: Record<string, string | number | boolean | undefined>,
): AnalyticsProps {
  return standardizeAnalyticsProps(eventName, props ?? {});
}

/** Server-side: one JSON line per event (grep `[product-event]` in logs). */
export function trackProductEvent(payload: ProductEventPayload): void {
  const eventName = payload.event_name ?? payload.event;
  if (!eventName) return;

  const { event: _e, event_name: _en, ...rest } = payload;
  const standardized = emitProductEvent(eventName, rest);
  console.info('[product-event]', JSON.stringify({ ts: new Date().toISOString(), ...standardized }));
}

/** Client-side: log + dispatch for listeners (e.g. Vercel Analytics wrapper). */
export function trackProductEventClient(
  eventName: ProductEventName,
  props?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === 'undefined') return;

  const detail = { ...emitProductEvent(eventName, props), ts: Date.now() };
  window.dispatchEvent(new CustomEvent('ie-product-event', { detail }));
  if (process.env.NODE_ENV === 'development') {
    console.info('[product-event:client]', detail);
  }
}
