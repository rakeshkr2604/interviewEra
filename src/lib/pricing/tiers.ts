/**
 * Canonical B2C pricing — single source for marketing + /upgrade + exhausted state.
 * Paid plan amounts/credits/duration: src/lib/pricing/plans.ts
 * User-facing labels: src/lib/pricing/copy.ts
 */

import { FREE_PLAN, PAID_PLANS } from '@/lib/pricing/plans';
import { marketingPaidCtaLabel } from '@/lib/pricing/copy';

export const BILLING_AMOUNTS = {
  starter: { monthlyInr: PAID_PLANS.starter.amountInr },
  pro: { monthlyInr: PAID_PLANS.pro.amountInr },
} as const;

/**
 * Free tier rows: ✓ / ✕ must match report gating in
 * src/lib/interview/script-report/access.ts (Starter+ details, Pro+ model answers/PDF).
 */
export const FREE_TIER_FEATURES = [
  {
    text: `${FREE_PLAN.credits} lifetime mock-interview credits for new accounts`,
    included: true as const,
  },
  { text: 'All four free preparation tools (fair-use limits)', included: true as const },
  { text: 'Basic interview evaluation: scores + score guide', included: true as const },
  { text: 'Resume-personalized questions', included: true as const },
  { text: 'Up to 2 adaptive follow-up questions', included: true as const },
  { text: 'Full answer feedback', included: false as const },
  { text: '30-day improvement roadmap', included: false as const },
  { text: 'Model-answer comparison and PDF export', included: false as const },
] as const;

/** Paid tiers — same strings everywhere */
export const STARTER_FEATURES = [
  `${PAID_PLANS.starter.credits} interview credits · ${PAID_PLANS.starter.durationDays}-day access`,
  'Everything in Free',
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
  'Everything in Starter',
  'Full answer feedback',
  'Dimension notes, synthesis, and 30-day roadmap',
  'Advanced interview scoring + score guide',
  'Model-answer comparison',
  'PDF report export',
  'Resume-personalized practice and progress tracking',
] as const;

export const PLAN_POSITIONING = {
  free: {
    title: 'Start preparing',
    description:
      'Requires a registered account. Free tools never use mock-interview credits; fair-use limits apply.',
  },
  starter: {
    title: 'Get interview-ready',
    description: 'Best when interviews are coming up and you need full feedback.',
  },
  pro: {
    title: 'Serious preparation',
    description: 'Best for more practice volume, model answers, and PDF export.',
  },
} as const;

export type ComparisonValue = 'included' | 'not_included' | 'limited' | string;

export type ComparisonRow = {
  feature: string;
  free: ComparisonValue;
  starter: ComparisonValue;
  pro: ComparisonValue;
};

export type ComparisonGroup = {
  id: string;
  label: string;
  note?: string;
  rows: readonly ComparisonRow[];
};

/**
 * Grouped comparison. Gating sources: report details/roadmap = Starter+, model answers + PDF =
 * Pro+ (script-report/access.ts). Interview modes, history/analytics and follow-ups are not
 * tier-gated. Fair-use rows are appended server-side (see fair-use.ts) so the Redis limiter
 * module never enters the client bundle.
 */
export const PRICING_COMPARISON_GROUPS: readonly ComparisonGroup[] = [
  {
    id: 'tools',
    label: 'Preparation tools',
    note: 'Free with every registered account. Using them never consumes mock-interview credits.',
    rows: [
      { feature: 'ATS Resume Checker', free: 'included', starter: 'included', pro: 'included' },
      { feature: 'Interview Question Generator', free: 'included', starter: 'included', pro: 'included' },
      { feature: 'STAR Answer Builder', free: 'included', starter: 'included', pro: 'included' },
      { feature: 'Interview Prompt Builder', free: 'included', starter: 'included', pro: 'included' },
    ],
  },
  {
    id: 'credits',
    label: 'Mock-interview credits',
    rows: [
      {
        feature: 'Interview credits',
        free: `${FREE_PLAN.credits} (new accounts)`,
        starter: String(PAID_PLANS.starter.credits),
        pro: String(PAID_PLANS.pro.credits),
      },
      { feature: 'Credits used by preparation tools', free: 'None', starter: 'None', pro: 'None' },
    ],
  },
  {
    id: 'modes',
    label: 'Interview modes',
    rows: [
      { feature: 'Technical, HR & behavioural, and mixed', free: 'included', starter: 'included', pro: 'included' },
      { feature: 'Resume personalization', free: 'included', starter: 'included', pro: 'included' },
      { feature: 'Adaptive follow-ups', free: 'Up to 2', starter: 'Up to 2', pro: 'Up to 2' },
    ],
  },
  {
    id: 'evaluation',
    label: 'Evaluation',
    rows: [
      { feature: 'Advanced scoring', free: 'included', starter: 'included', pro: 'included' },
      { feature: 'Score guide', free: 'included', starter: 'included', pro: 'included' },
      { feature: 'Detailed answer feedback', free: 'not_included', starter: 'included', pro: 'included' },
      { feature: 'Model-answer comparison', free: 'not_included', starter: 'not_included', pro: 'included' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    rows: [
      { feature: 'Post-interview report and email', free: 'included', starter: 'included', pro: 'included' },
      { feature: 'Improvement guidance', free: 'not_included', starter: '30-day roadmap', pro: '30-day roadmap' },
      { feature: 'PDF export', free: 'not_included', starter: 'not_included', pro: 'included' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    rows: [{ feature: 'Progress tracking', free: 'included', starter: 'included', pro: 'included' }],
  },
  {
    id: 'validity',
    label: 'Validity',
    rows: [
      {
        feature: 'Access duration',
        free: 'Lifetime credits',
        starter: `${PAID_PLANS.starter.durationDays} days`,
        pro: `${PAID_PLANS.pro.durationDays} days`,
      },
      { feature: 'Payment', free: 'No payment', starter: 'One-time', pro: 'One-time' },
    ],
  },
];

/** Flat view (tests, legacy consumers). */
export const PRICING_COMPARISON: readonly ComparisonRow[] = PRICING_COMPARISON_GROUPS.flatMap(
  (group) => group.rows,
);

/** Marketing page: signup CTAs (checkout happens after login on /upgrade) */
export const MARKETING_PRICING_CARDS = [
  {
    id: 'free' as const,
    name: 'Free',
    priceDisplay: '₹0',
    periodNote: 'Lifetime credits',
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
