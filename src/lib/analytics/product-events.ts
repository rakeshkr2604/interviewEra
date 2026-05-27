/**
 * Structured product analytics — server logs + optional client beacon.
 */

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
  | 'streak_extended'
  | 'streak_broken';

export type ProductEventPayload = {
  event: ProductEventName;
  userId?: string;
  resumeId?: string;
  interviewId?: string;
  code?: string;
  quality?: string;
  stage?: string;
  durationMs?: number;
  [key: string]: string | number | boolean | undefined;
};

/** Server-side: one JSON line per event (grep `[product-event]` in logs). */
export function trackProductEvent(payload: ProductEventPayload): void {
  console.info('[product-event]', JSON.stringify({ ts: new Date().toISOString(), ...payload }));
}

/** Client-side: log + dispatch for listeners (e.g. Vercel Analytics wrapper). */
export function trackProductEventClient(
  event: ProductEventName,
  props?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === 'undefined') return;
  const detail = { event, ...props, ts: Date.now() };
  window.dispatchEvent(new CustomEvent('ie-product-event', { detail }));
  if (process.env.NODE_ENV === 'development') {
    console.info('[product-event:client]', detail);
  }
}
