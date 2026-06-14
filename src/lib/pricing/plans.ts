/**
 * Canonical paid-plan config — single source for backend amounts, duration, credits.
 * Display copy may re-export from here via tiers.ts.
 */

export type PaidPlanId = 'starter' | 'pro';

export interface PaidPlanConfig {
  id: PaidPlanId;
  label: string;
  /** Amount in paise (100 paise = ₹1). Backend-only — never trust client. */
  amountPaise: number;
  amountInr: number;
  durationDays: number;
  credits: number;
}

export const PAID_PLANS: Record<PaidPlanId, PaidPlanConfig> = {
  starter: {
    id: 'starter',
    label: 'Starter',
    amountPaise: 14900,
    amountInr: 149,
    durationDays: 30,
    credits: 8,
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    amountPaise: 39900,
    amountInr: 399,
    durationDays: 30,
    credits: 25,
  },
} as const;

export function getPaidPlan(plan: PaidPlanId): PaidPlanConfig {
  return PAID_PLANS[plan];
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
