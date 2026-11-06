import { ArrowRight, CalendarClock, Check } from 'lucide-react';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { Reveal } from '@/components/landing/landing-home-shared';
import { LandingLaunchOfferNotice } from '@/components/landing/LandingLaunchOfferNotice';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { HOME_DSA_ROADMAP } from '@/lib/landing/home-content';
import {
  LANDING_HOME_EYEBROW,
  LANDING_HOME_HEADER_BLOCK,
  LANDING_HOME_HEADING,
  LANDING_HOME_SUBHEAD,
  LANDING_PAGE_CONTAINER,
} from '@/lib/landing/container';
import { buildSignupIntentHref } from '@/lib/pricing/plan-intent';
import { FREE_PLAN } from '@/lib/pricing/plans';
import {
  FREE_TIER_FEATURES,
  MARKETING_PRICING_CARDS,
  PLAN_POSITIONING,
  PRO_FEATURES,
  STARTER_FEATURES,
} from '@/lib/pricing/tiers';
import { cn } from '@/lib/utils';
import '@/components/landing/LandingHomeSections.css';

type StarterFeature = (typeof STARTER_FEATURES)[number];
type ProFeature = (typeof PRO_FEATURES)[number];

/**
 * Compact subset of the canonical entitlement strings (tiers.ts). Typed against the
 * source arrays, so renaming or removing an entitlement there fails typecheck here.
 */
const STARTER_PREVIEW: readonly StarterFeature[] = [
  STARTER_FEATURES[0],
  'Full answer feedback',
  '30-day improvement roadmap',
  'Progress tracking across sessions',
  '1 human resume review session per billing cycle',
];
const PRO_PREVIEW: readonly ProFeature[] = [
  PRO_FEATURES[0],
  'Everything in Starter',
  'Model-answer comparison',
  'PDF report export',
  '2 human resume review sessions per billing cycle',
];
const FREE_PREVIEW = FREE_TIER_FEATURES.filter((feature) => feature.included)
  .slice(0, 3)
  .map((feature) => feature.text);

const FEATURES_BY_PLAN = {
  free: FREE_PREVIEW,
  starter: STARTER_PREVIEW,
  pro: PRO_PREVIEW,
} as const;

function planHref(id: (typeof MARKETING_PRICING_CARDS)[number]['id']): string {
  return id === 'free' ? '/signup' : buildSignupIntentHref(id);
}

/**
 * Homepage pricing preview. Prices, credits and entitlements all come from the
 * canonical pricing config; prices are static text (no animated figures).
 * A launch offer appears only when the server confirms one (see LandingLaunchOfferNotice).
 */
export function LandingPricingPreview() {
  return (
    <section
      id="pricing-preview"
      className="landing-pricing-preview px-4 py-16 sm:px-5 sm:py-20"
      aria-labelledby="pricing-preview-heading"
    >
      <div className={LANDING_PAGE_CONTAINER}>
        <Reveal className={LANDING_HOME_HEADER_BLOCK}>
          <span className={LANDING_HOME_EYEBROW}>Pricing</span>
          <h2 id="pricing-preview-heading" className={LANDING_HOME_HEADING}>
            Start free. Pay once when you need more practice.
          </h2>
          <p className={LANDING_HOME_SUBHEAD}>
            New accounts get {FREE_PLAN.credits} lifetime mock-interview credits. Starter and Pro are
            one-time purchases with 30-day access — no subscription, no auto-renewal.
          </p>
        </Reveal>

        <div className="mx-auto mt-8 max-w-5xl">
          <LandingLaunchOfferNotice />
        </div>

        <ul className="ie-price-grid mx-auto mt-6 max-w-5xl">
          {MARKETING_PRICING_CARDS.map((card, index) => (
            <li key={card.id} className="h-full">
              <Reveal delay={index * 0.06} className="h-full">
                <article
                  className={cn('ie-price-card', card.highlighted && 'ie-price-card--featured')}
                  aria-labelledby={`price-${card.id}-title`}
                >
                  {card.popular ? <span className="ie-price-card__badge">Recommended</span> : null}
                  <h3 id={`price-${card.id}-title`} className="ie-price-card__name">
                    {card.name}
                  </h3>
                  <p className="ie-price-card__position">{PLAN_POSITIONING[card.id].title}</p>
                  <p className="ie-price-card__price">
                    <span className="ie-price-card__amount">{card.priceDisplay}</span>
                    <span className="ie-price-card__period">
                      {card.id === 'free' ? 'no payment' : 'one-time'}
                    </span>
                  </p>
                  <p className="ie-price-card__note">{card.periodNote}</p>
                  <ul className="ie-price-card__features">
                    {FEATURES_BY_PLAN[card.id].map((feature) => (
                      <li key={feature}>
                        <Check className="ie-price-card__check size-4" aria-hidden />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <TrackedCtaLink
                    href={planHref(card.id)}
                    ctaKey={CTA_KEYS.HOME_PRICING_PREVIEW}
                    ctaText={card.id === 'free' ? 'Create Free Account' : card.ctaLabel}
                    section={`home_pricing_${card.id}`}
                    className={cn(
                      'ie-price-card__cta ie-focus-visible',
                      card.highlighted ? 'v3-btn-primary' : 'ie-price-card__cta--secondary',
                    )}
                  >
                    {card.id === 'free' ? 'Create Free Account' : card.ctaLabel}
                  </TrackedCtaLink>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-6 flex max-w-5xl flex-col items-center gap-6">
          <TrackedCtaLink
            href="/pricing"
            ctaKey={CTA_KEYS.COMPARE_PLANS}
            ctaText="Compare all plans"
            section="home_pricing_preview"
            className="ie-price-compare-link ie-focus-visible"
          >
            Compare all plans and fair-use limits
            <ArrowRight className="size-4" aria-hidden />
          </TrackedCtaLink>

          <aside className="ie-roadmap-card" aria-labelledby="home-dsa-roadmap-heading">
            <span className="ie-roadmap-card__icon" aria-hidden>
              <CalendarClock className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="ie-roadmap-card__eyebrow">{HOME_DSA_ROADMAP.eyebrow}</p>
              <h3 id="home-dsa-roadmap-heading" className="ie-roadmap-card__title">
                {HOME_DSA_ROADMAP.title}
              </h3>
              <p className="ie-roadmap-card__body">{HOME_DSA_ROADMAP.body}</p>
              <p className="ie-roadmap-card__disclosure">{HOME_DSA_ROADMAP.disclosure}</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
