/**
 * Canonical B2C pricing — single source for marketing + /upgrade + exhausted state.
 * Paid plan amounts/credits/duration: src/lib/pricing/plans.ts
 * User-facing labels: src/lib/pricing/copy.ts
 */

import { PAID_PLANS } from '@/lib/pricing/plans';
import { marketingPaidCtaLabel, planCreditsFeatureLine } from '@/lib/pricing/copy';

export const BILLING_AMOUNTS = {
  starter: {
    monthlyInr: PAID_PLANS.starter.amountInr,
    annualTotalInr: 799,
    annualEquivMonthlyInr: 67,
  },
  pro: {
    monthlyInr: PAID_PLANS.pro.amountInr,
    annualTotalInr: 1999,
    annualEquivMonthlyInr: 167,
  },
} as const;

/** Free tier rows: ✓ / ✕ must match dashboard */
export const FREE_TIER_FEATURES = [
  { text: '3 lifetime credits', included: true as const },
  { text: 'Basic score report', included: true as const },
  { text: 'Detailed analysis (blurred preview)', included: false as const },
  { text: 'Model answer comparisons (blurred preview)', included: false as const },
] as const;

/** Paid tiers — same strings everywhere */
export const STARTER_FEATURES = [
  planCreditsFeatureLine('starter'),
  'Full AI feedback on every answer',
  '5 dimension scores per answer',
  'Progress tracking across sessions',
  'Resume-personalized questions',
] as const;

export const PRO_FEATURES = [
  planCreditsFeatureLine('pro'),
  'Full feedback + detailed analysis',
  'Model answer comparisons',
  'Keyword gap analysis',
  'PDF report export',
  'Interview replay',
] as const;

/** Marketing page: signup CTAs (checkout happens after login on /upgrade) */
export const MARKETING_PRICING_CARDS = [
  {
    id: 'free' as const,
    name: 'Free',
    priceDisplay: '₹0',
    periodNote: 'Forever',
    ctaLabel: 'Get started free',
    href: '/signup',
    highlighted: false,
    popular: false,
  },
  {
    id: 'starter' as const,
    name: 'Starter',
    priceDisplay: `₹${BILLING_AMOUNTS.starter.monthlyInr}`,
    periodNote: '30-day access',
    ctaLabel: marketingPaidCtaLabel('starter'),
    href: '/signup',
    highlighted: false,
    popular: false,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    priceDisplay: `₹${BILLING_AMOUNTS.pro.monthlyInr}`,
    periodNote: '30-day access',
    ctaLabel: marketingPaidCtaLabel('pro'),
    href: '/signup',
    highlighted: true,
    popular: true,
  },
] as const;

/** @deprecated Use upgradeCheckoutLabel from copy.ts — kept for imports during migration */
export function starterCheckoutLabel(_cycle: 'monthly' | 'annual'): string {
  return marketingPaidCtaLabel('starter');
}

/** @deprecated Use upgradeCheckoutLabel from copy.ts */
export function proCheckoutLabel(_cycle: 'monthly' | 'annual'): string {
  return marketingPaidCtaLabel('pro');
}
