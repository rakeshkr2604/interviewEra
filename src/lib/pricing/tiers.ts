/**
 * Canonical B2C pricing — single source for marketing + /upgrade + exhausted state.
 * Paid plan amounts/credits/duration: src/lib/pricing/plans.ts
 * User-facing labels: src/lib/pricing/copy.ts
 */

import { FREE_PLAN, PAID_PLANS } from '@/lib/pricing/plans';
import { marketingPaidCtaLabel } from '@/lib/pricing/copy';

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
  { text: `${FREE_PLAN.credits} interview credits`, included: true as const },
  { text: 'Resume-personalized questions', included: true as const },
  { text: 'Advanced interview scoring + score guide', included: true as const },
  { text: 'Up to 2 adaptive follow-up questions', included: true as const },
  { text: 'Full answer feedback', included: false as const },
  { text: '30-day improvement roadmap', included: false as const },
  { text: 'Model-answer comparison and PDF export', included: false as const },
] as const;

/** Paid tiers — same strings everywhere */
export const STARTER_FEATURES = [
  `${PAID_PLANS.starter.credits} interview credits · ${PAID_PLANS.starter.durationDays}-day access`,
  'Full answer feedback',
  'Dimension notes and report synthesis',
  '30-day improvement roadmap',
  'Advanced interview scoring + score guide',
  'Up to 2 adaptive follow-up questions',
  'Resume-personalized questions',
  'Progress tracking across sessions',
  'Post-interview report and email',
] as const;

export const PRO_FEATURES = [
  `${PAID_PLANS.pro.credits} interview credits · ${PAID_PLANS.pro.durationDays}-day access`,
  'Full feedback with deeper analysis',
  'Dimension notes, synthesis, and 30-day roadmap',
  'Advanced interview scoring + score guide',
  'Model-answer comparison',
  'PDF report export',
  'Resume-personalized practice and progress tracking',
] as const;

export const PLAN_POSITIONING = {
  free: {
    title: 'Try InterviewEra',
    description: 'Best for a first mock interview and light practice.',
  },
  starter: {
    title: 'Get interview-ready',
    description: 'Best when interviews are coming up and you need full feedback.',
  },
  pro: {
    title: 'Serious preparation',
    description: 'Best for deeper analysis, model answers, and PDF export.',
  },
} as const;

export type ComparisonValue = 'included' | 'not_included' | 'limited' | string;

export const PRICING_COMPARISON = [
  { feature: 'Interview credits', free: '3', starter: '8', pro: '25' },
  { feature: 'Access duration', free: 'Free forever', starter: '30 days', pro: '30 days' },
  { feature: 'Resume personalization', free: 'included', starter: 'included', pro: 'included' },
  { feature: 'Adaptive follow-ups', free: 'Up to 2', starter: 'Up to 2', pro: 'Up to 2' },
  { feature: 'Advanced scoring', free: 'included', starter: 'included', pro: 'included' },
  { feature: 'Score guide', free: 'included', starter: 'included', pro: 'included' },
  { feature: 'Detailed answer feedback', free: 'not_included', starter: 'included', pro: 'included' },
  { feature: 'Improvement guidance', free: 'not_included', starter: '30-day roadmap', pro: '30-day roadmap' },
  { feature: 'Progress tracking', free: 'included', starter: 'included', pro: 'included' },
  { feature: 'Model-answer comparison', free: 'not_included', starter: 'not_included', pro: 'included' },
  { feature: 'PDF export', free: 'not_included', starter: 'not_included', pro: 'included' },
  { feature: 'Post-interview report and email', free: 'included', starter: 'included', pro: 'included' },
] as const satisfies readonly {
  feature: string;
  free: ComparisonValue;
  starter: ComparisonValue;
  pro: ComparisonValue;
}[];

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
