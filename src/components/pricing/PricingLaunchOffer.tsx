'use client';

import { Ticket } from 'lucide-react';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CampaignCountdown } from '@/components/pricing/CampaignCountdown';
import { Reveal } from '@/components/landing/landing-home-shared';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { PAID_PLANS, type PaidPlanId } from '@/lib/pricing/plans';
import { buildSignupIntentHref } from '@/lib/pricing/plan-intent';
import type { LaunchOffer } from '@/lib/pricing/launch-offer';

function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

/**
 * Rendered only when the server returned a live, dated, non-exhausted campaign.
 * The remaining count comes from verified consumed redemptions, never reservations.
 */
export function PricingLaunchOffer({
  offer,
  serverNow,
  onExpired,
}: {
  offer: LaunchOffer;
  serverNow: string;
  onExpired?: () => void;
}) {
  const plans = (Object.keys(PAID_PLANS) as PaidPlanId[]).filter((plan) => offer.plans[plan]);

  return (
    <section className="px-4 pb-4 sm:px-6" aria-labelledby="launch-offer-title">
      <Reveal className="mx-auto max-w-5xl">
        <div
          className="rounded-2xl border-2 p-5 sm:p-7"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-primary) 45%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-primary) 6%, var(--card-bg))',
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em]"
                style={{ color: 'var(--accent-primary)' }}
              >
                <Ticket className="size-3.5" aria-hidden />
                Launch offer
              </p>
              <h2 id="launch-offer-title" className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                {offer.discountPercent
                  ? `${offer.discountPercent}% off ${plans.map((plan) => PAID_PLANS[plan].label).join(' or ')}`
                  : offer.label}
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Use code{' '}
                <code
                  className="rounded-md px-1.5 py-0.5 font-mono text-sm font-bold"
                  style={{ background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)' }}
                >
                  {offer.code}
                </code>{' '}
                at checkout. One redemption per account; it cannot be combined with other offers.
              </p>
              <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {offer.remainingRedemptions} of {offer.maxRedemptions} launch-offer purchases left
              </p>
            </div>
            {offer.expiresAt ? (
              <CampaignCountdown
                expiresAt={offer.expiresAt}
                serverNow={serverNow}
                onExpired={onExpired}
                size="hero"
              />
            ) : null}
          </div>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {plans.map((plan) => {
              const price = offer.plans[plan]!;
              return (
                <li
                  key={plan}
                  className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                >
                  <div>
                    <p className="text-sm font-semibold">{PAID_PLANS[plan].label}</p>
                    <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className="sr-only">Standard price </span>
                      <s>{rupees(price.listPaise)}</s>{' '}
                      <span className="sr-only">Launch price </span>
                      <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                        {rupees(price.finalPaise)}
                      </span>{' '}
                      · {PAID_PLANS[plan].credits} credits · {PAID_PLANS[plan].durationDays} days
                    </p>
                  </div>
                  <TrackedCtaLink
                    href={buildSignupIntentHref(plan, offer.code)}
                    ctaKey={CTA_KEYS.LAUNCH_OFFER}
                    ctaText={`Claim ${PAID_PLANS[plan].label} offer`}
                    section="pricing_launch_offer"
                    className="ie-focus-visible inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)' }}
                  >
                    Claim {PAID_PLANS[plan].label} offer
                  </TrackedCtaLink>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            The final amount is confirmed by our server before payment. One-time payment, no auto-renewal.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
