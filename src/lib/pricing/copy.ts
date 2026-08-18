/**
 * User-facing pricing & payment copy — one-time 30-day plans (no auto-renewal).
 * UI only; backend amounts live in plans.ts.
 */

import type { PlanTier } from '@/types/app.types';
import { PAID_PLANS, type PaidPlanId } from '@/lib/pricing/plans';

export const PLAN_ACCESS_PERIOD_LABEL = '30-day access';

export const PAYMENT_TRUST_BULLETS = [
  'One-time payment',
  'No auto-renewal',
  'Renew manually anytime',
  'UPI • Cards • Wallets • Net Banking',
  'Payments secured by Razorpay',
] as const;

/** Rendered as a highlighted list by <PaymentMethodsLabel />. */
export const PAYMENT_METHOD_KEYWORDS = [
  'UPI',
  'Google Pay',
  'PhonePe',
  'Paytm',
  'cards',
  'net banking',
  'wallets',
] as const;

export const UPGRADE_PAGE_FOOTER =
  'Payments processed securely by Razorpay. No auto-renewal. Renew whenever you need.';

export const BILLING_PAYMENT_METHODS_NOTE =
  'One-time payments via Razorpay. Available payment methods are shown at checkout. Credits deduct when an interview starts.';

export const PAYMENT_FAILED_USER_MESSAGE = 'Payment failed. Please try again.';

export const PAYMENT_CANCELLED_MESSAGE = 'Payment cancelled. No charge was made.';

export const PAYMENT_NETWORK_ERROR_MESSAGE =
  'Network error. Check your connection and try again.';

export const PAYMENT_ORDER_FAILED_MESSAGE = 'Could not start checkout. Please try again.';

export const PAYMENT_ALREADY_PROCESSED_MESSAGE =
  'This payment was already processed. Your plan is up to date.';

export const PAYMENT_TIMEOUT_MESSAGE =
  'Payment timed out. If money was debited, contact support@interviewera.com with your payment ID.';

export const PAYMENT_VERIFY_FAILED_USER_MESSAGE =
  'Payment verification failed. If money was debited, contact support@interviewera.com with your payment ID.';

export const EMPTY_PAYMENTS_MESSAGE = 'No payments yet.';

export const CURRENT_PLAN_BADGE_LABEL = '✓ Current Plan';

export const ON_PRO_PLAN_FOOTER = "You're on Pro";

export function planPriceLine(plan: PaidPlanId): string {
  return `₹${PAID_PLANS[plan].amountInr}`;
}

/**
 * Approximate USD hint for marketing pricing cards (international clarity).
 * Rate used: ~₹83 = US$1 (mid-2026 ballpark). Rounded to whole dollars — not FX-precise.
 *   Starter ₹299 → ~$3.60 → ~$4
 *   Pro     ₹799 → ~$9.63 → ~$10
 */
export const PLAN_USD_APPROX: Record<PaidPlanId, string> = {
  starter: '~$4',
  pro: '~$10',
} as const;

export function planUsdApproxHint(plan: PaidPlanId): string {
  return PLAN_USD_APPROX[plan];
}

export function planPeriodLine(): string {
  return PLAN_ACCESS_PERIOD_LABEL;
}

export function planCreditsFeatureLine(plan: PaidPlanId): string {
  return `${PAID_PLANS[plan].credits} interview credits`;
}

export function checkoutOrderDescription(plan: PaidPlanId): string {
  return `${PAID_PLANS[plan].label} — ₹${PAID_PLANS[plan].amountInr} · ${PLAN_ACCESS_PERIOD_LABEL}`;
}

/** CTA on /upgrade pricing grid */
export function upgradeCheckoutLabel(plan: PaidPlanId, currentPlan: PlanTier): string {
  if (plan === 'starter') {
    return currentPlan === 'starter' ? 'Renew Starter' : 'Upgrade to Starter';
  }
  if (currentPlan === 'pro') {
    return 'Renew Pro';
  }
  return 'Upgrade to Pro';
}

/** Marketing signup CTAs (pre-login) */
export function marketingPaidCtaLabel(plan: PaidPlanId): string {
  return plan === 'starter' ? 'Start Starter' : 'Get Pro';
}

export function formatPlanExpiryEnIn(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export function paymentSuccessMessage(plan: PaidPlanId, expiresAtIso: string): string {
  const planName = PAID_PLANS[plan].label;
  const until = formatPlanExpiryEnIn(expiresAtIso);
  return `Payment successful! Your ${planName} plan is active until ${until}.`;
}

export function planExpiresCopy(iso: string, isActive: boolean): string {
  const formatted = formatPlanExpiryEnIn(iso);
  return isActive ? `Plan expires on ${formatted}.` : `Plan expired on ${formatted}.`;
}

export function renewConfirmBody(planExpiresAt: string): string {
  const formatted = formatPlanExpiryEnIn(planExpiresAt);
  return `Your remaining days will NOT be lost.\n\nIf your current plan expires on ${formatted}, your renewal will extend from that date.\n\nRenewal adds the new plan's credits to your remaining balance.`;
}
