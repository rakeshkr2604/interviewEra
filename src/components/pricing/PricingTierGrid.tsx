'use client';

import { useEffect, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { CheckoutButton } from '@/components/pricing/CheckoutButton';
import { CampaignCountdown } from '@/components/pricing/CampaignCountdown';
import { PaymentTrustSection } from '@/components/pricing/PaymentTrustSection';
import { PricingWhatsAppSupport } from '@/components/pricing/PricingWhatsAppSupport';
import { TechnicalIssueProtection } from '@/components/pricing/TechnicalIssueProtection';
import {
  FREE_TIER_FEATURES,
  PLAN_POSITIONING,
  PRO_FEATURES,
  STARTER_FEATURES,
} from '@/lib/pricing/tiers';
import { PAID_PLANS, type PaidPlanId } from '@/lib/pricing/plans';
import { isPaidPlanActive, isRenewalCheckout } from '@/lib/pricing/plan-status';
import { marketingPaidCtaLabel, upgradeCheckoutLabel } from '@/lib/pricing/copy';
import type { PlanTier } from '@/types/app.types';
import { cn } from '@/lib/utils';
import { buildSignupIntentHref } from '@/lib/pricing/plan-intent';
import {
  trackPlanSelected,
  trackPromotionViewedOnce,
} from '@/lib/analytics/funnel-ga4-bridge';

export type PromoPlanQuote = {
  list_amount_paise: number;
  discount_paise: number;
  final_amount_paise: number;
  label: string | null;
  discountPercent?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  serverNow?: string | null;
  isActive?: boolean;
  campaignCodeId?: string | null;
};

type PricingGridProps = {
  variant: 'public' | 'dashboard';
  currentPlan?: PlanTier;
  userEmail?: string;
  planExpiresAt?: string | null;
  planStatus?: string | null;
  promoCode?: string;
  promoQuotes?: Partial<Record<PaidPlanId, PromoPlanQuote>>;
  selectedPlan?: PaidPlanId;
  belowGrid?: ReactNode;
  onCampaignExpired?: () => void;
};

const paidFeatures = {
  starter: STARTER_FEATURES,
  pro: PRO_FEATURES,
} as const;

function rupees(paise: number): string {
  return `₹${Math.round(paise / 100)}`;
}

function IncludedRow({ text, included = true }: { text: string; included?: boolean }) {
  return (
    <li className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
      {included ? (
        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      ) : (
        <X className="mt-0.5 size-4 shrink-0 opacity-45" style={{ color: 'var(--text-muted)' }} aria-hidden />
      )}
      <span className={included ? '' : 'opacity-70'}>{text}</span>
    </li>
  );
}

function PlanPrice({ plan, quote }: { plan: PaidPlanId; quote?: PromoPlanQuote }) {
  const activeQuote = quote?.isActive !== false && quote?.final_amount_paise;
  if (!activeQuote) {
    return (
      <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        ₹{PAID_PLANS[plan].amountInr}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-2 tabular-nums">
        <span className="text-base font-medium line-through" style={{ color: 'var(--text-muted)' }}>
          {rupees(quote.list_amount_paise)}
        </span>
        <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {rupees(quote.final_amount_paise)}
        </span>
        {quote.discountPercent != null ? (
          <Badge
            className="border-0 text-[10px] font-bold tracking-wide text-white"
            style={{ background: 'var(--accent-primary)' }}
          >
            {quote.discountPercent}% OFF
          </Badge>
        ) : null}
      </div>
      {quote.label ? (
        <p className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
          {quote.label}
        </p>
      ) : null}
    </div>
  );
}

function CampaignOffer({
  quotes,
  onExpired,
}: {
  quotes?: Partial<Record<PaidPlanId, PromoPlanQuote>>;
  onExpired?: () => void;
}) {
  const quote = quotes?.starter ?? quotes?.pro;
  if (!quote?.expiresAt || !quote.serverNow || quote.isActive === false) return null;

  return (
    <div
      className="mb-6 flex flex-col items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-center sm:flex-row sm:text-left"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
        background: 'color-mix(in srgb, var(--accent-primary) 8%, var(--card-bg))',
      }}
      role="status"
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--accent-primary)' }}>
          Limited-time offer
        </p>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Campaign pricing is applied from the server quote.
        </p>
      </div>
      <CampaignCountdown expiresAt={quote.expiresAt} serverNow={quote.serverNow} onExpired={onExpired} />
    </div>
  );
}

function PaidAction({
  plan,
  props,
  quote,
}: {
  plan: PaidPlanId;
  props: PricingGridProps;
  quote?: PromoPlanQuote;
}) {
  if (props.variant === 'public') {
    return (
      <TrackedCtaLink
        href={buildSignupIntentHref(plan, props.promoCode)}
        ctaKey={CTA_KEYS.PRICING_CTA}
        ctaText={marketingPaidCtaLabel(plan)}
        section="pricing_grid"
        onClick={() =>
          trackPlanSelected({
            plan,
            sourcePage: '/pricing',
            source: 'pricing_grid',
            campaignCode: props.promoCode,
            campaignCodeId: quote?.campaignCodeId ?? undefined,
          })
        }
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)' }}
      >
        {marketingPaidCtaLabel(plan)}
      </TrackedCtaLink>
    );
  }

  const currentPlan = props.currentPlan ?? 'free';
  const isCampus = currentPlan === 'campus' || currentPlan === 'campus_admin';
  const cannotBuyStarter = plan === 'starter' && currentPlan === 'pro';
  if (isCampus) {
    return <PlanFooter>Managed by your institution</PlanFooter>;
  }
  if (cannotBuyStarter) {
    return <PlanFooter>Included in your Pro plan</PlanFooter>;
  }

  const renewal = isRenewalCheckout(plan, currentPlan, props.planExpiresAt, props.planStatus);
  const quotedLabel =
    quote?.final_amount_paise && quote.isActive !== false
      ? `Get ${PAID_PLANS[plan].label} for ${rupees(quote.final_amount_paise)}`
      : upgradeCheckoutLabel(plan, currentPlan);

  return (
    <CheckoutButton
      userEmail={props.userEmail ?? ''}
      plan={plan}
      source="upgrade"
      promoCode={props.promoCode}
      campaignCodeId={quote?.campaignCodeId ?? undefined}
      label={quotedLabel}
      isRenewal={renewal}
      planExpiresAt={renewal ? props.planExpiresAt : null}
      className="h-12 w-full rounded-xl border-0 text-sm font-semibold text-white"
      style={{
        background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
        boxShadow: '0 14px 35px color-mix(in srgb, var(--accent-primary) 24%, transparent)',
      }}
    />
  );
}

/** Keeps plan titles aligned on multi-column layouts where only Pro carries a badge. */
function PlanBadgeSpacer() {
  return (
    <div className="hidden md:block" aria-hidden>
      <Badge className="invisible w-fit border-0 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em]">
        Recommended
      </Badge>
    </div>
  );
}

function PlanFooter({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-12 items-center justify-center rounded-xl border px-4 text-center text-sm font-semibold"
      style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
    >
      {children}
    </div>
  );
}

export function PricingPlanGrid(props: PricingGridProps) {
  const currentPlan = props.currentPlan ?? 'free';
  const paidActive = isPaidPlanActive(currentPlan, props.planStatus, props.planExpiresAt);
  const sourcePage = props.variant === 'public' ? '/pricing' : '/upgrade';

  useEffect(() => {
    for (const plan of ['starter', 'pro'] as const) {
      const quote = props.promoQuotes?.[plan];
      if (
        quote?.isActive === false ||
        !quote?.campaignCodeId ||
        !quote.final_amount_paise ||
        quote.discount_paise <= 0
      ) {
        continue;
      }
      trackPromotionViewedOnce({
        plan,
        sourcePage,
        campaignCode: props.promoCode,
        campaignCodeId: quote.campaignCodeId,
        discountPaise: quote.discount_paise,
        finalAmountPaise: quote.final_amount_paise,
        expiresAt: quote.expiresAt ?? undefined,
        isActive: true,
      });
    }
  }, [props.promoCode, props.promoQuotes, sourcePage]);

  return (
    <div className="space-y-7">
      <CampaignOffer quotes={props.promoQuotes} onExpired={props.onCampaignExpired} />

      <div className="grid gap-5 md:grid-cols-3 md:items-stretch">
        <Card
          id="plan-free"
          className={cn(
            'flex h-full flex-col rounded-2xl border-2 py-0 shadow-sm',
            currentPlan === 'free' && props.variant === 'dashboard' && 'ring-2 ring-[var(--accent-primary)]/30',
          )}
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <CardHeader className="space-y-3 px-5 pb-3 pt-6">
            <PlanBadgeSpacer />
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-semibold">Free</h3>
              {currentPlan === 'free' && props.variant === 'dashboard' ? <Badge>Current plan</Badge> : null}
            </div>
            <div>
              <p className="text-3xl font-bold">₹0</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Free forever</p>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
              {PLAN_POSITIONING.free.title}
            </p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col px-5 pb-5">
            <ul className="flex-1 space-y-2.5">
              {FREE_TIER_FEATURES.map((feature) => (
                <IncludedRow key={feature.text} text={feature.text} included={feature.included} />
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {PLAN_POSITIONING.free.description}
            </p>
            <div className="mt-4">
              {props.variant === 'public' ? (
                <TrackedCtaLink
                  href="/signup"
                  ctaKey={CTA_KEYS.GET_STARTED}
                  ctaText="Start free"
                  section="pricing_grid"
                  onClick={() =>
                    trackPlanSelected({
                      plan: 'free',
                      sourcePage: '/pricing',
                      source: 'pricing_grid',
                    })
                  }
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 px-4 py-3 text-sm font-semibold"
                  style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                >
                  Start free
                </TrackedCtaLink>
              ) : currentPlan === 'free' ? (
                <PlanFooter>Your current plan</PlanFooter>
              ) : (
                <div className="min-h-12" aria-hidden />
              )}
            </div>
          </CardContent>
        </Card>

        {(['starter', 'pro'] as const).map((plan) => {
          const selected = props.selectedPlan === plan;
          const current = currentPlan === plan;
          const isPro = plan === 'pro';
          const quote = props.promoQuotes?.[plan];
          return (
            <Card
              id={`plan-${plan}`}
              key={plan}
              className={cn(
                'flex h-full flex-col rounded-2xl border-2 py-0 shadow-sm transition-transform hover:-translate-y-0.5',
                (selected || current) && 'ring-2 ring-[var(--accent-primary)]/35',
              )}
              style={{
                borderColor: isPro ? 'var(--accent-primary)' : 'var(--card-border)',
                background: 'var(--card-bg)',
              }}
            >
              <CardHeader className="space-y-3 px-5 pb-3 pt-6">
                {isPro ? (
                  <Badge
                    className="w-fit border-0 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white"
                    style={{ background: 'var(--accent-primary)' }}
                  >
                    Recommended
                  </Badge>
                ) : (
                  <PlanBadgeSpacer />
                )}
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-semibold">{PAID_PLANS[plan].label}</h3>
                  {current && props.variant === 'dashboard' ? (
                    <Badge>{paidActive ? 'Current plan' : 'Previous plan'}</Badge>
                  ) : null}
                </div>
                <div>
                  <PlanPrice plan={plan} quote={quote} />
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {PAID_PLANS[plan].credits} interview credits · {PAID_PLANS[plan].durationDays}-day access
                  </p>
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
                  {PLAN_POSITIONING[plan].title}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col px-5 pb-5">
                <ul className="flex-1 space-y-2.5">
                  {paidFeatures[plan].slice(1).map((feature) => (
                    <IncludedRow key={feature} text={feature} />
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {PLAN_POSITIONING[plan].description}
                </p>
                <div className="mt-4">
                  <PaidAction plan={plan} props={props} quote={quote} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {props.belowGrid}

      <PaymentTrustSection />

      {props.variant === 'public' ? <PricingWhatsAppSupport /> : null}
      <TechnicalIssueProtection />
    </div>
  );
}
