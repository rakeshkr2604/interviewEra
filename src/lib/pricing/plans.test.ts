import { describe, expect, it } from 'vitest';
import { computePlanExpiry, getPaidPlan, PAID_PLANS } from '@/lib/pricing/plans';

describe('PAID_PLANS', () => {
  it('defines starter and pro with expected amounts', () => {
    expect(getPaidPlan('starter').amountPaise).toBe(14900);
    expect(getPaidPlan('pro').amountPaise).toBe(39900);
    expect(PAID_PLANS.starter.durationDays).toBe(30);
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
