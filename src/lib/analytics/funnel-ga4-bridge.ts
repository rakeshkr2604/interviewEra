/**
 * Client-only GA4 bridge for server-origin funnel steps.
 * Uses sessionStorage dedupe so product-events (server) + GA4 (client) never double-count.
 */

import {
  trackFunnelEvent,
  type FunnelEventName,
  type FunnelEventPayload,
} from '@/lib/analytics/funnel';
import { markAnalyticsDedupeKey } from '@/lib/analytics/dedupe';

const STORAGE_PREFIX = 'ie_funnel_ga4:';

/** Payload returned by POST /api/interview/complete for client GA4 emission. */
export type FunnelCompleteGa4Payload = {
  interviewId: string;
  role?: string;
  plan?: string;
  score?: number;
  qualityMet?: boolean;
};

function markDedupeKey(dedupeKey: string): boolean {
  return markAnalyticsDedupeKey(STORAGE_PREFIX, dedupeKey);
}

/** Fire a funnel event to GA4 once per dedupe key (no product-events). */
export function trackFunnelGa4Once(
  dedupeKey: string,
  eventName: FunnelEventName,
  payload: FunnelEventPayload = {},
): void {
  if (typeof window === 'undefined') return;
  if (!markDedupeKey(dedupeKey)) return;

  trackFunnelEvent(eventName, payload, { product: false });
}

/** Fire a funnel event to GA4 + product-events once per dedupe key. */
export function trackFunnelOnce(
  dedupeKey: string,
  eventName: FunnelEventName,
  payload: FunnelEventPayload = {},
): void {
  if (typeof window === 'undefined') return;
  if (!markDedupeKey(dedupeKey)) return;

  trackFunnelEvent(eventName, payload);
}

export function trackPaymentStartedOnce(options: {
  orderId: string;
  userId?: string;
  plan: string;
  amount: number;
  source: string;
  campaignCodeId?: string;
}): void {
  trackFunnelOnce(`payment_started:${options.orderId}`, 'payment_started', {
    userId: options.userId,
    plan: options.plan,
    amount: options.amount,
    source: options.source,
    campaignCodeId: options.campaignCodeId,
    order_id: options.orderId,
  });
}

export function trackPlanSelected(options: {
  plan: 'free' | 'starter' | 'pro';
  sourcePage: '/pricing' | '/upgrade';
  source: string;
  campaignCode?: string;
  campaignCodeId?: string;
}): void {
  trackFunnelEvent('plan_selected', options);
}

export function trackPromotionViewedOnce(options: {
  plan: 'starter' | 'pro';
  sourcePage: '/pricing' | '/upgrade';
  campaignCode?: string;
  campaignCodeId: string;
  discountPaise: number;
  finalAmountPaise: number;
  expiresAt?: string;
  isActive: boolean;
}): void {
  if (!options.isActive || options.discountPaise <= 0 || options.finalAmountPaise <= 0) {
    return;
  }
  trackFunnelOnce(
    `promotion_viewed:${options.sourcePage}:${options.campaignCodeId}:${options.plan}`,
    'promotion_viewed',
    options,
  );
}

export function trackCouponEntered(options: {
  plan: 'starter' | 'pro' | 'all';
  sourcePage: '/upgrade';
  campaignCode: string;
  couponAttemptId: string;
}): void {
  trackFunnelEvent('coupon_entered', {
    ...options,
    source: 'coupon_form',
  });
}

/** Client backup for payment_completed — GA4 only (webhook is authoritative for product-events). */
export function trackPaymentCompletedGa4Backup(options: {
  paymentId: string;
  userId?: string;
  plan: string;
  amount: number;
  source: string;
}): void {
  trackFunnelGa4Once(`payment_completed:${options.paymentId}`, 'payment_completed', {
    userId: options.userId,
    plan: options.plan,
    amount: options.amount,
    paymentId: options.paymentId,
    source: options.source,
  });
}

export function trackPricingPageViewedOnce(
  sourcePage: '/pricing' | '/upgrade',
  authenticated: boolean,
): void {
  trackFunnelOnce(`pricing_page_viewed:${sourcePage}`, 'pricing_page_viewed', {
    sourcePage,
    authenticated,
  });
}

export function trackResumeUploadedGa4(
  resumeId: string,
  options: { userId?: string; source: string },
): void {
  trackFunnelGa4Once(`resume_uploaded:${resumeId}`, 'resume_uploaded', {
    userId: options.userId,
    resumeId,
    source: options.source,
  });
}

export async function trackMockInterviewCompletedGa4(
  payload: FunnelCompleteGa4Payload,
): Promise<void> {
  let userId: string | undefined;
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id;
  } catch {
    /* best-effort */
  }

  trackFunnelGa4Once(
    `mock_interview_completed:${payload.interviewId}`,
    'mock_interview_completed',
    {
      userId,
      interviewId: payload.interviewId,
      role: payload.role,
      plan: payload.plan,
      score: payload.score,
      qualityMet: payload.qualityMet,
      source: 'interview_complete_client',
    },
  );
}
