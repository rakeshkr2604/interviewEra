import type { Metadata } from 'next';
import { PricingPageClient } from './PricingPageClient';
import { generateMetadata } from '@/lib/seo/metadata';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { faqPageJsonLd, breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld';
import { PRICING_FAQ } from '@/lib/landing/home-content';
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url';
import { PAID_PLANS } from '@/lib/pricing/plans';
import type { PaidPlanId } from '@/lib/pricing/plans';
import { createServiceClient } from '@/lib/supabase/server';
import { quoteCampaignDiscount } from '@/lib/campaign-codes';
import type { PromoPlanQuote } from '@/components/pricing/PricingTierGrid';
import { normalizePricingCampaignCode } from '@/lib/pricing/plan-intent';

export const metadata: Metadata = generateMetadata({
  title: 'Pricing',
  description: `Simple, transparent pricing for InterviewEra. Start free with 3 credits. One-time 30-day plans from ₹${PAID_PLANS.starter.amountInr}.`,
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

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const campaignCode = normalizePricingCampaignCode(params.code);
  const quotes = await loadCampaignQuotes(campaignCode);
  return (
    <>
      <JsonLdScript id="pricing-faq-ld" data={PRICING_FAQ_LD} />
      <JsonLdScript id="pricing-breadcrumb-ld" data={PRICING_BREADCRUMB_LD} />
      <PricingPageClient campaignCode={quotes ? campaignCode : undefined} initialQuotes={quotes} />
    </>
  );
}
