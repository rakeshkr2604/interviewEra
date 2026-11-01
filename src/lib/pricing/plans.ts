/**
 * Canonical paid-plan config — single source for backend amounts, duration, credits.
 * Display copy may re-export from here via tiers.ts.
 */

export type PaidPlanId = 'starter' | 'pro';

export interface PaidPlanConfig {
  id: PaidPlanId;
  label: string;
  /** Authoritative list amount in paise (100 paise = ₹1). Never trust client amounts. */
  amountPaise: number;
  amountInr: number;
  /** Lowest campaign selling price. This is not the normal/list price. */
  promoFloorPaise: number;
  durationDays: number;
  credits: number;
}

export const FREE_PLAN = {
  id: 'free',
  label: 'Free',
  amountPaise: 0,
  amountInr: 0,
  durationDays: null,
  /** Lifetime credits granted to NEW signups only. Must match migration 119 trigger + column default. */
  credits: 2,
} as const;

export const PAID_PLANS: Record<PaidPlanId, PaidPlanConfig> = {
  starter: {
    id: 'starter',
    label: 'Starter',
    amountPaise: 39900,
    amountInr: 399,
    promoFloorPaise: 33900,
    durationDays: 30,
    credits: 8,
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    amountPaise: 99900,
    amountInr: 999,
    promoFloorPaise: 84900,
    durationDays: 30,
    credits: 25,
  },
} as const;

export function getPaidPlan(plan: PaidPlanId): PaidPlanConfig {
  return PAID_PLANS[plan];
}

export function getPlanPromoFloorPaise(plan: PaidPlanId): number {
  return PAID_PLANS[plan].promoFloorPaise;
}

export function isPaidPlanId(value: string): value is PaidPlanId {
  return value === 'starter' || value === 'pro';
}

/**
 * Renewal extension: if current expiry is in the future, extend from expiry;
 * otherwise extend from now.
 */
export function computePlanExpiry(
  currentExpiresAt: Date | null | undefined,
  durationDays: number,
  now: Date = new Date(),
): Date {
  const base =
    currentExpiresAt && currentExpiresAt.getTime() > now.getTime() ? currentExpiresAt : now;
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + durationDays);
  return next;
}
