/**
 * Canonical B2C pricing — single source for marketing + /upgrade + exhausted state.
 * Campus B2B stays separate in /campus.
 */

export const BILLING_AMOUNTS = {
  starter: {
    monthlyInr: 99,
    annualTotalInr: 799,
    /** Effective monthly when billed annually (display only) */
    annualEquivMonthlyInr: 67,
  },
  pro: {
    monthlyInr: 249,
    annualTotalInr: 1999,
    annualEquivMonthlyInr: 167,
  },
} as const;

/** Free tier rows: ✓ / ✕ must match dashboard */
export const FREE_TIER_FEATURES = [
  { text: '5 lifetime credits', included: true as const },
  { text: 'Basic score report', included: true as const },
  { text: 'Detailed analysis (blurred preview)', included: false as const },
  { text: 'Model answer comparisons (blurred preview)', included: false as const },
] as const;

/** Paid tiers — same strings everywhere (credits = CLAUDE.md) */
export const STARTER_FEATURES = [
  '12 credits per month',
  'Full AI feedback on every answer',
  '5 dimension scores per answer',
  'Progress tracking across sessions',
  'Resume-personalized questions',
] as const;

export const PRO_FEATURES = [
  '30 credits per month',
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
    periodNote: '/month',
    ctaLabel: 'Start Starter',
    href: '/signup',
    highlighted: false,
    popular: false,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    priceDisplay: `₹${BILLING_AMOUNTS.pro.monthlyInr}`,
    periodNote: '/month',
    ctaLabel: 'Get Pro',
    href: '/signup',
    highlighted: true,
    popular: true,
  },
] as const;

export function starterCheckoutLabel(cycle: 'monthly' | 'annual'): string {
  return cycle === 'annual'
    ? `Subscribe · ₹${BILLING_AMOUNTS.starter.annualTotalInr}/yr`
    : `Subscribe · ₹${BILLING_AMOUNTS.starter.monthlyInr}/mo`;
}

export function proCheckoutLabel(cycle: 'monthly' | 'annual'): string {
  return cycle === 'annual'
    ? `Subscribe · ₹${BILLING_AMOUNTS.pro.annualTotalInr}/yr`
    : `Subscribe · ₹${BILLING_AMOUNTS.pro.monthlyInr}/mo`;
}
