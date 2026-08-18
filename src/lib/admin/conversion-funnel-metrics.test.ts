import { describe, expect, it } from 'vitest';
import {
  aggregateConversionEvents,
  type ConversionEventRow,
} from '@/lib/admin/conversion-funnel-metrics';

function event(
  id: string,
  eventName: string,
  createdAt: string,
  props: Record<string, unknown> = {},
): ConversionEventRow {
  return {
    id,
    event_name: eventName,
    user_id: 'user-1',
    props,
    created_at: createdAt,
  };
}

describe('aggregateConversionEvents', () => {
  it('deduplicates checkout and payment outcomes by order_id', () => {
    const rows = [
      event('view-1', 'pricing_page_viewed', '2026-08-16T10:00:00.000Z'),
      event('select-1', 'plan_selected', '2026-08-16T10:01:00.000Z', {
        plan: 'starter',
      }),
      event('checkout-1', 'checkout_started', '2026-08-16T10:02:00.000Z', {
        order_id: 'order-1',
        plan: 'starter',
      }),
      event('checkout-retry', 'checkout_started', '2026-08-16T10:03:00.000Z', {
        order_id: 'order-1',
        plan: 'starter',
      }),
      event('payment-1', 'payment_started', '2026-08-16T10:04:00.000Z', {
        order_id: 'order-1',
        plan: 'starter',
      }),
      event('payment-retry', 'payment_started', '2026-08-16T10:05:00.000Z', {
        order_id: 'order-1',
        plan: 'starter',
      }),
      event('complete-verify', 'payment_completed', '2026-08-16T10:06:00.000Z', {
        order_id: 'order-1',
        payment_id: 'pay-1',
        plan: 'starter',
      }),
      event('complete-webhook', 'payment_completed', '2026-08-16T10:07:00.000Z', {
        order_id: 'order-1',
        payment_id: 'pay-1',
        plan: 'starter',
      }),
    ];

    const result = aggregateConversionEvents(rows, new Date('2026-08-16T12:00:00.000Z'));

    expect(result.steps.map((step) => [step.key, step.count])).toEqual([
      ['pricing_viewed', 1],
      ['plan_selected', 1],
      ['checkout_started', 1],
      ['payment_started', 1],
      ['payment_completed', 1],
    ]);
    expect(result.plans.find((plan) => plan.plan === 'starter')).toMatchObject({
      checkout_starts: 1,
      conversions: 1,
    });
  });

  it('attributes campaign conversion across normalized order events', () => {
    const campaign = 'campaign-1';
    const rows = [
      event('promo', 'promotion_viewed', '2026-08-16T10:00:00.000Z', {
        campaign_code_id: campaign,
        plan: 'pro',
      }),
      event('select', 'plan_selected', '2026-08-16T10:01:00.000Z', {
        campaign_code_id: campaign,
        plan: 'pro',
      }),
      event('checkout', 'checkout_started', '2026-08-16T10:02:00.000Z', {
        campaign_code_id: campaign,
        order_id: 'order-pro',
        plan: 'pro',
      }),
      event('complete', 'payment_completed', '2026-08-16T10:03:00.000Z', {
        order_id: 'order-pro',
        payment_id: 'pay-pro',
        plan: 'pro',
      }),
    ];

    const result = aggregateConversionEvents(rows);

    expect(result.campaigns).toEqual([
      {
        campaign,
        promotion_views: 1,
        selections: 1,
        checkout_starts: 1,
        conversions: 1,
        conversion_rate_pct: 100,
      },
    ]);
  });

  it('deduplicates coupon application plans by coupon_attempt_id', () => {
    const attempt = 'attempt-1';
    const rows = [
      event('entered', 'coupon_entered', '2026-08-16T10:00:00.000Z', {
        coupon_attempt_id: attempt,
      }),
      event('starter', 'coupon_applied', '2026-08-16T10:00:01.000Z', {
        coupon_attempt_id: attempt,
        plan: 'starter',
      }),
      event('pro', 'coupon_applied', '2026-08-16T10:00:02.000Z', {
        coupon_attempt_id: attempt,
        plan: 'pro',
      }),
    ];

    const result = aggregateConversionEvents(rows);

    expect(result.coupon_entries).toBe(1);
    expect(result.coupon_applications).toBe(1);
  });

  it('derives abandonment only after 60 minutes without completion or failure', () => {
    const rows = [
      event('old', 'checkout_started', '2026-08-16T10:00:00.000Z', {
        order_id: 'order-old',
        plan: 'starter',
      }),
      event('recent', 'checkout_started', '2026-08-16T10:30:01.000Z', {
        order_id: 'order-recent',
        plan: 'pro',
      }),
      event('failed-checkout', 'checkout_started', '2026-08-16T09:00:00.000Z', {
        order_id: 'order-failed',
        plan: 'starter',
      }),
      event('failed', 'payment_failed', '2026-08-16T09:05:00.000Z', {
        order_id: 'order-failed',
        payment_id: 'pay-failed',
      }),
    ];

    const result = aggregateConversionEvents(rows, new Date('2026-08-16T11:00:00.000Z'));

    expect(result.abandoned_checkouts).toBe(1);
    expect(result.unresolved_checkouts).toBe(1);
    expect(result.payment_failures).toBe(1);
  });
});
