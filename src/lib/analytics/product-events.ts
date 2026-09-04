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
  | 'payment_failed'
  | 'payment_completed'
  | 'checkout_started'
  | 'checkout_abandoned'
  | 'plan_selected'
  | 'promotion_viewed'
  | 'coupon_entered'
  | 'coupon_applied'
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
  | 'after_interview_feedback_shown'
  | 'after_interview_feedback_started'
  | 'after_interview_feedback_submitted'
  | 'after_interview_feedback_skipped'
  | 'after_interview_feedback_error'
  | 'interview_exit_feedback_shown'
  | 'interview_exit_feedback_started'
  | 'interview_exit_feedback_submitted'
  | 'interview_exit_feedback_skipped'
  | 'interview_exit_feedback_error'
  | 'nps_submitted'
  | 'technical_issue_reported'
  | 'technical_issue_approved'
  | 'technical_issue_rejected'
  | 'credit_restored'
  | 'service_recovery_credit_granted'
  | 'qg_generate'
  | 'qg_answer_reveal'
  | 'qg_practice_click'
  | 'qg_question_rated'
  | 'qg_profile_created'
  | 'qg_profile_updated'
  | 'qg_profile_saved_to_account'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'profile_completion_updated';

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
