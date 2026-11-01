import type { Metadata } from 'next';
import { PricingPageClient } from './PricingPageClient';
import { generateMetadata } from '@/lib/seo/metadata';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { faqPageJsonLd, breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld';
import { PRICING_FAQ } from '@/lib/landing/home-content';
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url';
import { FREE_PLAN, PAID_PLANS } from '@/lib/pricing/plans';
import type { PaidPlanId } from '@/lib/pricing/plans';
import { createServiceClient } from '@/lib/supabase/server';
import { quoteCampaignDiscount } from '@/lib/campaign-codes';
import type { PromoPlanQuote } from '@/components/pricing/PricingTierGrid';
import { normalizePricingCampaignCode } from '@/lib/pricing/plan-intent';
import {
  getPublicPricingSnapshot,
  publicSnapshotToPromoQuotes,
  type PromoDisplayQuote,
} from '@/lib/pricing/effective-price';
import { loadLaunchOffer, type LaunchOffer } from '@/lib/pricing/launch-offer';
import { buildFairUseComparisonGroup } from '@/lib/pricing/fair-use';
import { PRICING_COMPARISON_GROUPS } from '@/lib/pricing/tiers';
import { isSupabasePlaceholderCredential } from '@/lib/analytics/product-events-store';

export const metadata: Metadata = generateMetadata({
  title: 'Pricing',
  description: `InterviewEra pricing: free preparation tools with every account, ${FREE_PLAN.credits} free mock-interview credits for new accounts, and one-time 30-day plans from ₹${PAID_PLANS.starter.amountInr}. No auto-renewal.`,
  path: '/pricing',
  keywords: 'InterviewEra pricing, AI mock interview price, placement prep cost, interview practice India',
});

export const revalidate = 0;

const ORIGIN = getCanonicalSiteOrigin();

const PRICING_FAQ_LD = faqPageJsonLd(
  PRICING_FAQ.map((item) => ({ question: item.q, answer: item.a })),
);

const PRICING_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Pricing', path: '/pricing' },
  ],
  ORIGIN,
);

function toPromoQuote(quote: PromoDisplayQuote): PromoPlanQuote {
  return quote;
}

async function loadGlobalPricingQuotes(): Promise<
  Partial<Record<PaidPlanId, PromoPlanQuote>> | undefined
> {
  try {
    const snapshot = await getPublicPricingSnapshot(createServiceClient());
    const quotes = publicSnapshotToPromoQuotes(snapshot);
    if (!quotes) return undefined;
    return Object.fromEntries(
      Object.entries(quotes).map(([plan, quote]) => [plan, toPromoQuote(quote)]),
    ) as Partial<Record<PaidPlanId, PromoPlanQuote>>;
  } catch (error) {
    console.warn('[pricing] global campaign snapshot unavailable', error);
    return undefined;
  }
}

async function loadCampaignQuotes(
  code: string | undefined,
): Promise<Partial<Record<PaidPlanId, PromoPlanQuote>> | undefined> {
  if (!code) return undefined;
  try {
    const service = createServiceClient();
    const entries = await Promise.all(
      (['starter', 'pro'] as const).map(async (plan) => {
        const config = PAID_PLANS[plan];
        const quote = await quoteCampaignDiscount(service, {
          code,
          plan,
          listAmountPaise: config.amountPaise,
          promoFloorPaise: config.promoFloorPaise,
        });
        if (!quote.ok || !quote.is_active) return null;
        return [
          plan,
          {
            list_amount_paise: config.amountPaise,
            discount_paise: quote.discount_paise,
            final_amount_paise: quote.final_amount_paise,
            label: quote.label,
            discountPercent: quote.discount_type === 'percent' ? quote.discount_value : null,
            startsAt: quote.starts_at,
            expiresAt: quote.expires_at,
            serverNow: quote.server_now,
            isActive: quote.is_active,
            campaignCodeId: quote.campaign_code_id,
          } satisfies PromoPlanQuote,
        ] as const;
      }),
    );
    const quotes = Object.fromEntries(entries.filter((entry) => entry !== null));
    return Object.keys(quotes).length ? quotes : undefined;
  } catch (error) {
    console.warn('[pricing] public campaign quote unavailable', error);
    return undefined;
  }
}

const COMPARISON_GROUPS = [...PRICING_COMPARISON_GROUPS, buildFairUseComparisonGroup()];

async function loadPublicLaunchOffer(now: Date): Promise<LaunchOffer | null> {
  // E2E / CI placeholder credentials: never show an offer that was not loaded from a real DB.
  if (
    isSupabasePlaceholderCredential(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    )
  ) {
    return null;
  }
  try {
    return await loadLaunchOffer(createServiceClient(), now);
  } catch (error) {
    console.warn('[pricing] launch offer unavailable', error);
    return null;
  }
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const campaignCode = normalizePricingCampaignCode(params.code);
  const codeQuotes = await loadCampaignQuotes(campaignCode);
  const quotes = codeQuotes ?? (await loadGlobalPricingQuotes());
  const now = new Date();
  const launchOffer = await loadPublicLaunchOffer(now);
  return (
    <>
      <JsonLdScript id="pricing-faq-ld" data={PRICING_FAQ_LD} />
      <JsonLdScript id="pricing-breadcrumb-ld" data={PRICING_BREADCRUMB_LD} />
      <PricingPageClient
        campaignCode={quotes ? campaignCode : undefined}
        initialQuotes={quotes}
        launchOffer={launchOffer}
        serverNow={now.toISOString()}
        comparisonGroups={COMPARISON_GROUPS}
      />
    </>
  );
}
