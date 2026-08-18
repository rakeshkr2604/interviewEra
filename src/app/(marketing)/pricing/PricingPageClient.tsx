'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Ticket } from 'lucide-react';
import { PricingPageViewTracker } from '@/components/analytics/PricingPageViewTracker';
import {
  PricingPlanGrid,
  type PromoPlanQuote,
} from '@/components/pricing/PricingTierGrid';
import { PricingComparisonTable } from '@/components/pricing/PricingComparisonTable';
import { PricingFaq } from '@/components/pricing/PricingFaq';
import { PricingHeroHeadline } from '@/components/pricing/PricingHeroHeadline';
import { CommunityCTA } from '@/components/community/CommunityCTA';
import { Reveal } from '@/components/landing/landing-home-shared';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import type { PaidPlanId } from '@/lib/pricing/plans';

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

const PICK_HINTS = [
  {
    plan: 'Free',
    tone: 'muted' as const,
    title: 'Just exploring',
    body: '3 credits to feel a real mock interview — no card needed.',
  },
  {
    plan: 'Starter',
    tone: 'accent' as const,
    title: 'Interview coming up',
    body: '8 sessions with full feedback and a 30-day roadmap.',
  },
  {
    plan: 'Pro',
    tone: 'success' as const,
    title: 'Serious prep',
    body: '25 sessions plus model answers and PDF export.',
  },
] as const;

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

export function PricingPageClient({
  campaignCode,
  initialQuotes,
}: {
  campaignCode?: string;
  initialQuotes?: Partial<Record<PaidPlanId, PromoPlanQuote>>;
}) {
  const router = useRouter();
  const [quotes, setQuotes] = useState(initialQuotes);

  useEffect(() => {
    setQuotes(initialQuotes);
  }, [initialQuotes]);

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

  return (
    <main
      id="main-content"
      className="overflow-x-clip"
      style={{ color: 'var(--text-primary)', background: 'var(--page-gradient)' }}
    >
      <PricingPageViewTracker sourcePage="/pricing" />

      {/* Hero — page-level rank */}
      <section className="relative px-4 pb-6 pt-10 text-center sm:px-6 sm:pb-7 sm:pt-12">
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
            One-time interview credits
          </p>
          <PricingHeroHeadline />
          <div className="mx-auto mt-3.5 max-w-3xl space-y-1.5">
            <p
              className="whitespace-nowrap text-[clamp(0.75rem,2.85vw,1.125rem)] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              3 free interview credits included. Pay only when you need more practice.
            </p>
            <p className="text-sm leading-relaxed sm:text-[0.9375rem]" style={{ color: 'var(--text-muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                1 interview credit
              </span>{' '}
              starts one mock interview session with a report.
            </p>
          </div>
        </div>
      </section>

      {/* Plans — hero acts as this section's header, so cards stay the focus */}
      <section className="px-4 pb-14 sm:px-6 sm:pb-16" aria-labelledby="pricing-plans">
        <div className="mx-auto max-w-6xl">
          <h2 id="pricing-plans" className="sr-only">
            InterviewEra plans
          </h2>
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

      {/* Quick pick — supporting rank */}
      <section
        className="border-y px-4 py-12 sm:px-6 sm:py-14"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
        aria-labelledby="pick-title"
      >
        <div className="mx-auto max-w-5xl">
          <SectionIntro
            eyebrow="Quick pick"
            title="Match the plan to where you are"
            titleId="pick-title"
          />
          <div className="mt-7 grid gap-3 sm:grid-cols-3 sm:gap-4">
            {PICK_HINTS.map((hint, index) => (
              <Reveal key={hint.plan} delay={index * 0.05} className="h-full">
                <article className={`ie-pricing-hint ie-pricing-hint--${hint.tone}`}>
                  <p className="ie-pricing-hint__plan">{hint.plan}</p>
                  <h3 className="ie-pricing-hint__title">{hint.title}</h3>
                  <p className="ie-pricing-hint__body">{hint.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison — primary rank: this is where the decision happens */}
      <section className="px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="comparison-title">
        <div className="mx-auto max-w-5xl">
          <SectionIntro
            rank="primary"
            eyebrow="Side-by-side"
            title="What changes as you upgrade"
            titleId="comparison-title"
            body={"Core practice stays the same. Paid plans add volume, deeper analysis, and\u00A0export."}
          />
          <Reveal delay={0.06} className="mt-8 sm:mt-9">
            <PricingComparisonTable />
          </Reveal>
        </div>
      </section>

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
            Start with one honest practice session
          </h2>
          <p
            className="mx-auto mt-3 max-w-lg text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            No card required. Your 3 free interview credits unlock the moment you sign up.
          </p>
          <TrackedCtaLink
            href="/signup"
            ctaKey={CTA_KEYS.START_FREE_INTERVIEW}
            ctaText="Start free"
            section="pricing_bottom"
            className="landing-cta-lift ie-focus-visible mt-7 inline-flex min-h-13 items-center justify-center rounded-xl px-8 py-3.5 text-base font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)' }}
          >
            Start free
          </TrackedCtaLink>
          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            1 interview credit starts one mock interview session with a report.
          </p>
        </Reveal>
      </section>
    </main>
  );
}
