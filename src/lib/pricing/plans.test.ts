import { describe, expect, it } from 'vitest';
import { computePlanExpiry, FREE_PLAN, getPaidPlan, PAID_PLANS } from '@/lib/pricing/plans';

describe('PAID_PLANS', () => {
  it('defines the canonical credit and access entitlements', () => {
    expect(FREE_PLAN.credits).toBe(2);
    expect(FREE_PLAN.amountPaise).toBe(0);
    expect(FREE_PLAN.durationDays).toBeNull();
    expect(getPaidPlan('starter').amountPaise).toBe(39900);
    expect(getPaidPlan('starter').amountInr).toBe(399);
    expect(getPaidPlan('starter').promoFloorPaise).toBe(33900);
    expect(getPaidPlan('pro').amountPaise).toBe(99900);
    expect(getPaidPlan('pro').amountInr).toBe(999);
    expect(getPaidPlan('pro').promoFloorPaise).toBe(84900);
    expect(PAID_PLANS.starter.durationDays).toBe(30);
    expect(PAID_PLANS.starter.credits).toBe(8);
    expect(PAID_PLANS.pro.durationDays).toBe(30);
    expect(PAID_PLANS.pro.credits).toBe(25);
  });
});

describe('computePlanExpiry', () => {
  it('extends from now when no current expiry', () => {
    const now = new Date('2026-07-15T10:00:00.000Z');
    const result = computePlanExpiry(null, 30, now);
    expect(result.toISOString()).toBe('2026-08-14T10:00:00.000Z');
  });

  it('extends from current expiry when renewing before expiry', () => {
    const now = new Date('2026-07-15T10:00:00.000Z');
    const current = new Date('2026-07-20T10:00:00.000Z');
    const result = computePlanExpiry(current, 30, now);
    expect(result.toISOString()).toBe('2026-08-19T10:00:00.000Z');
  });

  it('extends from now when plan already expired', () => {
    const now = new Date('2026-07-25T10:00:00.000Z');
    const current = new Date('2026-07-20T10:00:00.000Z');
    const result = computePlanExpiry(current, 30, now);
    expect(result.toISOString()).toBe('2026-08-24T10:00:00.000Z');
  });
});
