'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Info, Ticket } from 'lucide-react';
import { PricingPageViewTracker } from '@/components/analytics/PricingPageViewTracker';
import {
  PricingPlanGrid,
  type PromoPlanQuote,
} from '@/components/pricing/PricingTierGrid';
import { PricingComparisonTable } from '@/components/pricing/PricingComparisonTable';
import { PricingFaq } from '@/components/pricing/PricingFaq';
import { PricingHeroHeadline } from '@/components/pricing/PricingHeroHeadline';
import { PricingHeroRotator } from '@/components/pricing/PricingHeroRotator';
import { PricingToolkitSection } from '@/components/pricing/PricingToolkitSection';
import { PricingJourneySection } from '@/components/pricing/PricingJourneySection';
import { PricingLaunchOffer } from '@/components/pricing/PricingLaunchOffer';
import { PricingRoadmapCard } from '@/components/pricing/PricingRoadmapCard';
import { CommunityCTA } from '@/components/community/CommunityCTA';
import { Reveal } from '@/components/landing/landing-home-shared';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { FREE_PLAN, type PaidPlanId } from '@/lib/pricing/plans';
import type { LaunchOffer } from '@/lib/pricing/launch-offer';
import type { ComparisonGroup } from '@/lib/pricing/tiers';
/** Pricing-only styles — removed from shared marketing.css critical path (Loop 18). */
import './pricing-page.css';

type PublicPricingJson = {
  plans?: Partial<
    Record<
      PaidPlanId,
      {
        basePricePaise?: number;
        finalPricePaise?: number;
        discountAmountPaise?: number;
        discountPercent?: number;
      }
    >
  >;
  campaign?: {
    active?: boolean;
    name?: string | null;
    label?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
  };
  serverNow?: string;
};

function quotesFromPublicPricing(
  json: PublicPricingJson,
): Partial<Record<PaidPlanId, PromoPlanQuote>> | undefined {
  if (!json.campaign?.active) return undefined;
  const quotes: Partial<Record<PaidPlanId, PromoPlanQuote>> = {};
  for (const plan of ['starter', 'pro'] as const) {
    const row = json.plans?.[plan];
    if (!row?.basePricePaise || !row.finalPricePaise || row.finalPricePaise >= row.basePricePaise) {
      continue;
    }
    quotes[plan] = {
      list_amount_paise: row.basePricePaise,
      discount_paise: row.discountAmountPaise ?? row.basePricePaise - row.finalPricePaise,
      final_amount_paise: row.finalPricePaise,
      label: json.campaign.label ?? json.campaign.name ?? null,
      discountPercent: row.discountPercent && row.discountPercent > 0 ? row.discountPercent : null,
      startsAt: json.campaign.startsAt ?? null,
      expiresAt: json.campaign.endsAt ?? null,
      serverNow: json.serverNow ?? null,
      isActive: true,
      campaignCodeId: null,
    };
  }
  return Object.keys(quotes).length ? quotes : undefined;
}

/**
 * Two header ranks keep the page readable: `primary` for the section that
 * carries the decision (comparison), `support` for secondary reading.
 */
function SectionIntro({
  eyebrow,
  title,
  titleId,
  body,
  rank = 'support',
}: {
  eyebrow: string;
  title: ReactNode;
  titleId?: string;
  body?: string;
  rank?: 'primary' | 'support';
}) {
  const primary = rank === 'primary';
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p
        className={
          primary
            ? 'text-xs font-bold uppercase tracking-[0.18em]'
            : 'text-[0.6875rem] font-semibold uppercase tracking-[0.2em]'
        }
        style={{ color: primary ? 'var(--accent-primary)' : 'var(--text-muted)' }}
      >
        {eyebrow}
      </p>
      <h2
        id={titleId}
        className={
          primary
            ? 'mt-2.5 text-2xl font-bold tracking-tight sm:text-3xl'
            : 'mt-2 text-xl font-semibold tracking-tight sm:text-2xl'
        }
      >
        {title}
      </h2>
      {body ? (
        <p
          className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-relaxed sm:text-base"
          style={{ color: 'var(--text-secondary)' }}
        >
          {body}
        </p>
      ) : null}
    </Reveal>
  );
}

const PRIMARY_CTA_CLASS =
  'landing-cta-lift ie-focus-visible inline-flex min-h-12 items-center justify-center rounded-xl px-7 py-3 text-base font-semibold text-white';
const PRIMARY_CTA_STYLE = { background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)' };

export function PricingPageClient({
  campaignCode,
  initialQuotes,
  launchOffer,
  serverNow,
  comparisonGroups,
}: {
  campaignCode?: string;
  initialQuotes?: Partial<Record<PaidPlanId, PromoPlanQuote>>;
  launchOffer?: LaunchOffer | null;
  serverNow?: string;
  comparisonGroups?: readonly ComparisonGroup[];
}) {
  const router = useRouter();
  const [quotes, setQuotes] = useState(initialQuotes);
  const [offer, setOffer] = useState(launchOffer ?? null);

  useEffect(() => {
    setQuotes(initialQuotes);
  }, [initialQuotes]);

  useEffect(() => {
    setOffer(launchOffer ?? null);
  }, [launchOffer]);

  const handleExpired = useCallback(() => {
    if (campaignCode) {
      setQuotes(undefined);
      router.refresh();
      return;
    }
    void (async () => {
      try {
        const res = await fetch('/api/pricing/public', { cache: 'no-store' });
        if (!res.ok) {
          setQuotes(undefined);
          router.refresh();
          return;
        }
        const json = (await res.json()) as PublicPricingJson;
        setQuotes(quotesFromPublicPricing(json));
      } catch {
        setQuotes(undefined);
      }
      router.refresh();
    })();
  }, [campaignCode, router]);

  const handleLaunchOfferExpired = useCallback(() => {
    setOffer(null);
    router.refresh();
  }, [router]);

  return (
    <main
      id="main-content"
      className="overflow-x-clip"
      style={{ color: 'var(--text-primary)', background: 'var(--page-gradient)' }}
    >
      <PricingPageViewTracker sourcePage="/pricing" />

      {/* Roadmap notice — top-of-page strip, planned release only */}
      <PricingRoadmapCard />

      {/* 1 · Hero — page-level rank */}
      <section className="relative px-4 pb-6 pt-10 text-center sm:px-6 sm:pb-6 sm:pt-12">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-56 max-w-4xl opacity-50 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--accent-primary) 22%, transparent), transparent 70%)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl">
          <p
            className="mb-2.5 text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: 'var(--accent-primary)' }}
          >
            Plans &amp; pricing
          </p>
          <PricingHeroHeadline />
          <p
            className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            One AI-powered platform for <PricingHeroRotator />.
          </p>
          <p
            className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
          >
            <Info className="size-3.5 shrink-0 opacity-70" aria-hidden />
            <span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                1 interview credit
              </span>{' '}
              = one mock interview session with a report.
            </span>
          </p>
          <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <TrackedCtaLink
              href="/signup"
              ctaKey={CTA_KEYS.SIGN_UP}
              ctaText="Create your free account"
              section="pricing_hero"
              className={PRIMARY_CTA_CLASS}
              style={PRIMARY_CTA_STYLE}
            >
              Create your free account <span aria-hidden>&nbsp;→</span>
            </TrackedCtaLink>
            <TrackedCtaLink
              href="#compare-plans"
              ctaKey={CTA_KEYS.COMPARE_PLANS}
              ctaText="Compare plans"
              section="pricing_hero"
              className="ie-focus-visible inline-flex min-h-12 items-center justify-center rounded-xl border-2 px-7 py-3 text-base font-semibold"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
            >
              Compare plans
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      {/* 2 · Free preparation toolkit */}
      <PricingToolkitSection />

      {/* 3 · How InterviewEra works */}
      <PricingJourneySection />

      {/* 4 · Plans */}
      <section className="px-4 py-14 sm:px-6 sm:py-16" aria-labelledby="pricing-plans">
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            eyebrow="Plans"
            title="Choose how much mock-interview practice you need"
            titleId="pricing-plans"
            body={`New accounts get ${FREE_PLAN.credits} free mock-interview credits. Paid plans are one-time payments with 30-day access and no auto-renewal.`}
          />
          <div className="mt-8">
            <PricingPlanGrid
              variant="public"
              promoCode={campaignCode}
              promoQuotes={quotes}
              onCampaignExpired={handleExpired}
              belowGrid={
                <div className="flex justify-center">
                  <Link
                    href="/login?next=%2Fupgrade"
                    className="ie-focus-visible inline-flex items-center gap-1.5 rounded-md text-sm font-medium underline-offset-4 hover:underline"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Ticket className="size-3.5 shrink-0 opacity-80" aria-hidden />
                    Have a promo code?{' '}
                    <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                      Sign in to apply it
                    </span>
                  </Link>
                </div>
              }
            />
          </div>
          <CommunityCTA
            placement="pricing_page"
            variant="compact"
            persistent
            title="Free job alerts while you decide"
            subtitle="Join our WhatsApp channel for placement updates — no purchase required."
            className="mx-auto mt-7 w-full max-w-3xl"
          />
        </div>
      </section>

      {/* 5 · Comparison — primary rank: this is where the decision happens */}
      <section
        id="compare-plans"
        className="scroll-mt-20 border-t px-4 py-14 sm:px-6 sm:py-20"
        style={{ borderColor: 'var(--card-border)' }}
        aria-labelledby="comparison-title"
      >
        <div className="mx-auto max-w-5xl">
          <SectionIntro
            rank="primary"
            eyebrow="Side-by-side"
            title="Compare every plan"
            titleId="comparison-title"
            body="Preparation tools are free on every plan and never consume mock-interview credits. Paid plans add credits, detailed feedback, model answers and export."
          />
          <Reveal delay={0.06} className="mt-8 sm:mt-9">
            <PricingComparisonTable groups={comparisonGroups} />
          </Reveal>
        </div>
      </section>

      {/* 6 · Launch offer — only when a live, dated, non-exhausted campaign exists */}
      {offer && serverNow ? (
        <PricingLaunchOffer offer={offer} serverNow={serverNow} onExpired={handleLaunchOfferExpired} />
      ) : null}

      {/* 7 · FAQ */}
      <PricingFaq />

      {/* Closing CTA — outranks every section header except the h1 */}
      <section className="relative px-4 py-16 text-center sm:px-6 sm:py-20">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-56 max-w-3xl opacity-45 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--accent-primary) 20%, transparent), transparent 70%)',
          }}
          aria-hidden
        />
        <Reveal className="relative mx-auto max-w-2xl">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Start preparing with a free account
          </h2>
          <p
            className="mx-auto mt-3 max-w-lg text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            No card required. New accounts get {FREE_PLAN.credits} free mock-interview credits and
            all four preparation tools.
          </p>
          <TrackedCtaLink
            href="/signup"
            ctaKey={CTA_KEYS.START_FREE_INTERVIEW}
            ctaText="Create your free account"
            section="pricing_bottom"
            className={`${PRIMARY_CTA_CLASS} mt-7 min-h-13 px-8 py-3.5`}
            style={PRIMARY_CTA_STYLE}
          >
            Create your free account
          </TrackedCtaLink>
          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            1 interview credit starts one mock interview session with a report.
          </p>
        </Reveal>
      </section>
    </main>
  );
}
