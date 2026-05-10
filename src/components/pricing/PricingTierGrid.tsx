'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BillingCycleToggle, type BillingCycle } from '@/components/pricing/BillingCycleToggle';
import {
  BILLING_AMOUNTS,
  FREE_TIER_FEATURES,
  MARKETING_PRICING_CARDS,
  PRO_FEATURES,
  STARTER_FEATURES,
  proCheckoutLabel,
  starterCheckoutLabel,
} from '@/lib/pricing/tiers';
import type { PlanTier } from '@/types/app.types';
import { CheckoutButton } from '@/components/pricing/CheckoutButton';

const TIER_ORDER: Record<PlanTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  campus: 3,
  campus_admin: 3,
};

const upgradeCardInner =
  'flex h-full min-h-0 w-full flex-1 flex-col gap-0 border-0 bg-transparent px-0 py-5 shadow-none ring-0 rounded-none sm:px-1 sm:py-6';

const upgradeCtaStyle = {
  background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
  boxShadow: '0 16px 48px color-mix(in srgb, var(--accent-primary) 32%, transparent)',
} as const;

/** Landing pricing: same tokens as rest of marketing site (light + dark) */
const marketingCardShell =
  'flex h-full flex-col gap-0 rounded-2xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] py-5 text-[var(--text-primary)] shadow-[0_12px_40px_-8px_color-mix(in_srgb,var(--text-primary)_10%,transparent)] ring-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_-10px_color-mix(in_srgb,var(--accent-primary)_22%,transparent)]';
const marketingCardPopular =
  'relative overflow-visible border-[var(--accent-primary)] pt-9 ring-2 ring-[color-mix(in_srgb,var(--accent-primary)_45%,transparent)] shadow-[0_0_40px_color-mix(in_srgb,var(--accent-primary)_28%,transparent)]';

function MarketingFeatureRow({ text, included }: { text: string; included: boolean }) {
  return (
    <p className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
      {included ? (
        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      ) : (
        <X className="mt-0.5 size-4 shrink-0 opacity-40" style={{ color: 'var(--text-muted)' }} aria-hidden />
      )}
      <span className={included ? '' : 'opacity-70'}>{text}</span>
    </p>
  );
}

function MarketingPaidFeatureRow({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      {text}
    </li>
  );
}

function FeatureRow({ text, included }: { text: string; included: boolean }) {
  return (
    <p className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
      {included ? (
        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      ) : (
        <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" aria-hidden />
      )}
      <span className={included ? '' : 'text-muted-foreground'}>{text}</span>
    </p>
  );
}

function PaidFeatureRow({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      {text}
    </li>
  );
}

function marketingSignupHref(plan: 'starter' | 'pro', cycle: BillingCycle): string {
  const q = new URLSearchParams();
  q.set('plan', plan);
  q.set('cycle', cycle);
  return `/signup?${q.toString()}`;
}

/** Landing: same toggle + price logic as /upgrade; CTAs pass plan + cycle for post-signup upsell. */
export function MarketingPricingSection() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');

  const starterMain =
    cycle === 'annual'
      ? BILLING_AMOUNTS.starter.annualEquivMonthlyInr
      : BILLING_AMOUNTS.starter.monthlyInr;
  const starterSub =
    cycle === 'annual'
      ? `Effective /mo · billed ₹${BILLING_AMOUNTS.starter.annualTotalInr}/yr`
      : 'Billed monthly';

  const proMain = cycle === 'annual' ? BILLING_AMOUNTS.pro.annualEquivMonthlyInr : BILLING_AMOUNTS.pro.monthlyInr;
  const proSub =
    cycle === 'annual'
      ? `Effective /mo · billed ₹${BILLING_AMOUNTS.pro.annualTotalInr}/yr`
      : 'Billed monthly';

  const proPerDay = Math.max(1, Math.round(BILLING_AMOUNTS.pro.monthlyInr / 30));

  return (
    <div className="space-y-8">
      <p
        className="mx-auto max-w-3xl text-center text-xl font-bold leading-snug md:text-2xl md:leading-snug"
        style={{ color: 'var(--text-primary)' }}
      >
        One bad interview can cost you{' '}
        <span style={{ color: 'var(--accent-primary)' }}>₹5L–₹20L</span> in lost offers.
      </p>
      <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed md:text-base" style={{ color: 'var(--text-secondary)' }}>
        Start <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>free</span>, no card — upgrade when you want PDF export, replay, and full analysis per answer.
      </p>
      <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed md:text-base" style={{ color: 'var(--text-secondary)' }}>
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Pro</span> works out to about{' '}
        <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
          ₹{proPerDay}/day
        </span>{' '}
        on monthly billing — less than one coffee vs the cost of walking in under-prepared.
      </p>
      <BillingCycleToggle value={cycle} onChange={setCycle} id="marketing-billing" variant="default" />
      <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          ₹{BILLING_AMOUNTS.pro.monthlyInr}/mo on Pro
        </span>{' '}
        stacks against a <span style={{ color: 'var(--accent-primary)' }}>₹10L+</span> first job — one serious month of
        practice vs one silent rejection email.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Free */}
        <Card className={marketingCardShell}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Free
              </CardTitle>
            </div>
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              ₹0
              <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>
                {' '}
                Forever
              </span>
            </p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4">
            <div className="flex-1 space-y-2">
              {FREE_TIER_FEATURES.map((f) => (
                <MarketingFeatureRow key={f.text} text={f.text} included={f.included} />
              ))}
            </div>
            <Link
              href="/signup"
              className="block rounded-xl border-2 px-4 py-3 text-center text-sm font-semibold shadow-sm transition-all duration-300 hover:shadow-md"
              style={{
                borderColor: 'var(--card-border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
              }}
            >
              Get started free
            </Link>
          </CardContent>
        </Card>

        {/* Starter */}
        <Card className={marketingCardShell}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Starter
            </CardTitle>
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              ₹{starterMain}
              <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>
                /mo
              </span>
            </p>
            <p className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
              {starterSub}
            </p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4">
            <ul className="flex-1 space-y-2">
              {STARTER_FEATURES.map((f) => (
                <MarketingPaidFeatureRow key={f} text={f} />
              ))}
            </ul>
            <Link
              href={marketingSignupHref('starter', cycle)}
              className="block rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:bg-indigo-700 hover:shadow-indigo-500/45"
            >
              {cycle === 'annual' ? 'Start Starter — annual' : MARKETING_PRICING_CARDS[1].ctaLabel}
            </Link>
          </CardContent>
        </Card>

        {/* Pro — most popular */}
        <Card className={cn(marketingCardShell, marketingCardPopular, 'sm:col-span-2 lg:col-span-1')}>
          <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
            <Badge
              className="px-3 py-1 text-xs font-semibold whitespace-nowrap text-white shadow-md"
              style={{ background: 'var(--accent-primary)', boxShadow: '0 8px 24px color-mix(in srgb, var(--accent-primary) 35%, transparent)' }}
            >
              Popular for heavy practice
            </Badge>
          </div>
          <CardHeader className="pb-2 pt-2">
            <CardTitle className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Pro
            </CardTitle>
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
              ₹{proMain}
              <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>
                /mo
              </span>
            </p>
            <p className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
              {proSub}
            </p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4">
            <ul className="flex-1 space-y-2">
              {PRO_FEATURES.map((f) => (
                <MarketingPaidFeatureRow key={f} text={f} />
              ))}
            </ul>
            <Link
              href={marketingSignupHref('pro', cycle)}
              className="block rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:bg-indigo-700 hover:shadow-indigo-500/45"
            >
              {cycle === 'annual' ? 'Get Pro — annual' : MARKETING_PRICING_CARDS[2].ctaLabel}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface AppPricingGridProps {
  currentPlan: PlanTier;
  userEmail: string;
  billingCycle: 'monthly' | 'annual';
}

/** Logged-in /upgrade — Razorpay + current plan states */
export function AppPricingGrid({ currentPlan, userEmail, billingCycle }: AppPricingGridProps) {
  const canBuyStarter = TIER_ORDER[currentPlan] < TIER_ORDER.starter;
  const canBuyPro = TIER_ORDER[currentPlan] < TIER_ORDER.pro;

  const starterMonthlyLabel =
    billingCycle === 'annual'
      ? `₹${BILLING_AMOUNTS.starter.annualEquivMonthlyInr}`
      : `₹${BILLING_AMOUNTS.starter.monthlyInr}`;
  const starterPeriodLabel =
    billingCycle === 'annual'
      ? `/mo · billed ₹${BILLING_AMOUNTS.starter.annualTotalInr}/yr`
      : '/mo';

  const proMonthlyLabel =
    billingCycle === 'annual'
      ? `₹${BILLING_AMOUNTS.pro.annualEquivMonthlyInr}`
      : `₹${BILLING_AMOUNTS.pro.monthlyInr}`;
  const proPeriodLabel =
    billingCycle === 'annual'
      ? `/mo · billed ₹${BILLING_AMOUNTS.pro.annualTotalInr}/yr`
      : '/mo';

  /** Full-width, button-shaped footer so tiers match CTAs (not plain right-aligned text). */
  function PlanTierFooter({ children }: { children: React.ReactNode }) {
    return (
      <div
        role="status"
        className="flex min-h-12 w-full shrink-0 items-center justify-center rounded-[14px] border-2 px-4 text-center text-sm font-semibold"
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
          color: 'var(--text-secondary)',
        }}
      >
        {children}
      </div>
    );
  }

  function renderPlanStatus(plan: PlanTier) {
    if (currentPlan === plan) {
      return <PlanTierFooter>Current plan</PlanTierFooter>;
    }
    if (TIER_ORDER[currentPlan] > TIER_ORDER[plan]) {
      return <PlanTierFooter>Included in your plan</PlanTierFooter>;
    }
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
      <div
        className={cn(
          'dashboard-premium-card dashboard-premium-card--overflow-visible flex min-h-0 flex-col transition-transform duration-200 hover:-translate-y-0.5',
          currentPlan === 'free' &&
            'ring-2 ring-[color-mix(in_srgb,var(--accent-primary)_42%,transparent)]',
        )}
      >
        <Card className={cn(upgradeCardInner, 'gap-4')}>
          <CardHeader className="shrink-0 px-5 pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Free
              </CardTitle>
              {currentPlan === 'free' && (
                <Badge variant="secondary" className="text-xs">
                  Current
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              ₹0
            </p>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-0 px-5 pb-5">
            <div className="min-h-0 flex-1 space-y-2">
              {FREE_TIER_FEATURES.map((f) => (
                <FeatureRow key={f.text} text={f.text} included={f.included} />
              ))}
            </div>
            <div className="mt-auto shrink-0 pt-4">{renderPlanStatus('free')}</div>
          </CardContent>
        </Card>
      </div>

      <div
        className={cn(
          'dashboard-premium-card dashboard-premium-card--overflow-visible flex min-h-0 flex-col transition-transform duration-200 hover:-translate-y-0.5',
          currentPlan === 'starter' &&
            'ring-2 ring-[color-mix(in_srgb,var(--accent-primary)_42%,transparent)]',
        )}
      >
        <Card className={cn(upgradeCardInner, 'gap-4')}>
          <CardHeader className="shrink-0 px-5 pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Starter
              </CardTitle>
              {currentPlan === 'starter' && (
                <Badge variant="secondary" className="text-xs">
                  Current
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {starterMonthlyLabel}
              <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
                {starterPeriodLabel}
              </span>
            </p>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-0 px-5 pb-5">
            <ul className="min-h-0 flex-1 space-y-2">
              {STARTER_FEATURES.map((f) => (
                <PaidFeatureRow key={f} text={f} />
              ))}
            </ul>
            <div className="mt-auto shrink-0 pt-4">
              {canBuyStarter ? (
                <CheckoutButton
                  userEmail={userEmail}
                  plan="starter"
                  billingCycle={billingCycle}
                  label={starterCheckoutLabel(billingCycle)}
                  className="landing-cta-lift h-12 rounded-[14px] border-0 text-base font-semibold text-white"
                  style={upgradeCtaStyle}
                />
              ) : (
                renderPlanStatus('starter')
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div
        className={cn(
          'dashboard-premium-card dashboard-premium-card--overflow-visible relative flex min-h-0 flex-col pt-8 transition-transform duration-200 hover:-translate-y-0.5 md:pt-10',
          'ring-2 ring-[color-mix(in_srgb,var(--accent-primary)_45%,transparent)]',
        )}
      >
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
          <Badge
            className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shadow-md"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
              color: '#fff',
              boxShadow: '0 8px 24px color-mix(in srgb, var(--accent-primary) 35%, transparent)',
            }}
          >
            Most popular
          </Badge>
        </div>
        <Card className={cn(upgradeCardInner, 'gap-4 pt-2')}>
          <CardHeader className="shrink-0 px-5 pb-2 pt-0">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Pro
              </CardTitle>
              {currentPlan === 'pro' && (
                <Badge variant="secondary" className="text-xs">
                  Current
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {proMonthlyLabel}
              <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
                {proPeriodLabel}
              </span>
            </p>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-0 px-5 pb-5">
            <ul className="min-h-0 flex-1 space-y-2">
              {PRO_FEATURES.map((f) => (
                <PaidFeatureRow key={f} text={f} />
              ))}
            </ul>
            <div className="mt-auto shrink-0 pt-4">
              {canBuyPro ? (
                <CheckoutButton
                  userEmail={userEmail}
                  plan="pro"
                  billingCycle={billingCycle}
                  label={proCheckoutLabel(billingCycle)}
                  className="landing-cta-lift h-12 rounded-[14px] border-0 text-base font-semibold text-white"
                  style={upgradeCtaStyle}
                />
              ) : (
                renderPlanStatus('pro')
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
