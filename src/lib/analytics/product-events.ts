/**
 * Structured product analytics — server logs + optional client beacon.
 */

import {
  standardizeAnalyticsProps,
  type AnalyticsProps,
} from '@/lib/analytics/schema';

export type ProductEventName =
  | 'page_view'
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
  | 'interview_created'
  | 'interview_started'
  | 'question_generated'
  | 'answer_recorded'
  | 'followup_generated'
  | 'report_generated'
  | 'interview_completed'
  | 'interview_abandoned'
  | 'interview_recovered'
  | 'interview_session_opened'
  | 'interview_first_question_played'
  | 'interview_mic_blocked'
  | 'interview_first_answer_blocked'
  | 'signup_completed'
  | 'resume_uploaded'
  | 'resume_deleted'
  | 'mock_interview_started'
  | 'payment_started'
  | 'payment_completed'
  | 'pricing_page_viewed'
  | 'landing_cta_clicked'
  | 'streak_extended'
  | 'streak_broken'
  | 'auth_started'
  | 'signup_started'
  | 'oauth_started'
  | 'oauth_completed'
  | 'login_completed'
  | 'auth_failed'
  | 'verification_sent'
  | 'verification_resent'
  | 'verification_completed'
  | 'intent_detected'
  | 'recovery_clicked'
  | 'role_selected'
  | 'dashboard_viewed'
  | 'report_opened'
  | 'report_viewed'
  | 'roadmap_opened'
  | 'recommendation_clicked'
  | 'interview_resumed'
  | 'readiness_viewed'
  | 'resume_workspace_viewed'
  | 'notifications_viewed'
  | 'campus_workspace_viewed'
  | 'campus_workspace_created'
  | 'campus_student_invite_sent'
  | 'campus_csv_import_completed'
  | 'experiment_exposed'
  | 'referral_link_shared'
  | 'feedback_submitted'
  | 'nps_submitted';

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
