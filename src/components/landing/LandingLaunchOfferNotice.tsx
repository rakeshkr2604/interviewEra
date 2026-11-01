'use client';

import { useEffect, useRef, useState } from 'react';
import { Ticket } from 'lucide-react';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { PAID_PLANS, type PaidPlanId } from '@/lib/pricing/plans';
import type { PublicLaunchOffer } from '@/app/api/pricing/launch-offer/route';

function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

function isLive(offer: PublicLaunchOffer | null): offer is PublicLaunchOffer {
  if (!offer) return false;
  if (offer.expiresAt && new Date(offer.expiresAt).getTime() <= Date.now()) return false;
  return Object.keys(offer.plans).length > 0;
}

/**
 * Homepage launch-offer line. Renders nothing unless the server confirms a live
 * campaign (same rules as /pricing). Fetched only once the pricing preview nears
 * the viewport, so it never touches the hero / LCP path. No countdown, no counter:
 * the full verified offer lives on /pricing.
 */
export function LandingLaunchOfferNotice() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [offer, setOffer] = useState<PublicLaunchOffer | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let cancelled = false;

    const load = () => {
      fetch('/api/pricing/launch-offer')
        .then((res) => (res.ok ? (res.json() as Promise<{ offer: PublicLaunchOffer | null }>) : null))
        .then((json) => {
          if (!cancelled && json && isLive(json.offer)) setOffer(json.offer);
        })
        .catch(() => {
          /* list prices remain — degrade silently */
        });
    };

    if (!('IntersectionObserver' in window)) {
      load();
      return () => {
        cancelled = true;
      };
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          io.disconnect();
          load();
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(node);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, []);

  const plans = offer
    ? (Object.keys(PAID_PLANS) as PaidPlanId[]).filter((plan) => offer.plans[plan])
    : [];

  return (
    <div ref={ref} className="ie-price-offer-slot">
      {offer && plans.length > 0 ? (
        <div className="ie-price-offer" role="note" aria-label="Launch offer">
          <Ticket className="ie-price-offer__icon size-4" aria-hidden />
          <p className="ie-price-offer__text">
            <span className="font-semibold">Launch offer:</span>{' '}
            {offer.discountPercent ? `${offer.discountPercent}% off ` : 'Discount on '}
            {plans.map((plan) => PAID_PLANS[plan].label).join(' and ')} with code{' '}
            <code className="ie-price-offer__code">{offer.code}</code>
            {' — '}
            {plans
              .map((plan) => `${PAID_PLANS[plan].label} ${rupees(offer.plans[plan]!.finalPaise)}`)
              .join(' · ')}
            . The final amount is confirmed before payment.
          </p>
          <TrackedCtaLink
            href="/pricing"
            ctaKey={CTA_KEYS.LAUNCH_OFFER}
            ctaText="See offer details"
            section="home_pricing_launch_offer"
            className="ie-price-offer__link ie-focus-visible"
          >
            See offer details
          </TrackedCtaLink>
        </div>
      ) : null}
    </div>
  );
}
