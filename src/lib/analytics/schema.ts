/**
 * Canonical analytics property names — shared by GA4 and product-events.
 */

const CAMEL_TO_SNAKE: Record<string, string> = {
  userId: 'user_id',
  interviewId: 'interview_id',
  resumeId: 'resume_id',
  paymentId: 'payment_id',
  orderId: 'order_id',
  campaignCode: 'campaign_code',
  campaignCodeId: 'campaign_code_id',
  discountPaise: 'discount_paise',
  finalAmountPaise: 'final_amount_paise',
  expiresAt: 'expires_at',
  failureCategory: 'failure_category',
  couponAttemptId: 'coupon_attempt_id',
  sourcePage: 'source_page',
  sessionScore: 'session_score',
  qualityMet: 'quality_met',
  ctaText: 'cta_text',
  ctaKey: 'cta_key',
};

export type AnalyticsProps = Record<string, string | number | boolean | undefined>;

/** Normalize funnel/CTA payloads to snake_case + event_name for all analytics sinks. */
export function standardizeAnalyticsProps(
  eventName: string,
  props: AnalyticsProps = {},
): AnalyticsProps {
  const out: AnalyticsProps = { event_name: eventName };

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    if (key === 'event') continue;

    const targetKey = CAMEL_TO_SNAKE[key] ?? key;
    if (targetKey === 'event_name') continue;
    out[targetKey] = value;
  }

  return out;
}
