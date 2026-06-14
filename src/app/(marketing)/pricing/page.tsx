import type { Metadata } from 'next';
import { PricingPageClient } from './PricingPageClient';
import { generateMetadata } from '@/lib/seo/metadata';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { faqPageJsonLd, breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld';
import { PRICING_FAQ } from '@/lib/landing/home-content';
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url';

export const metadata: Metadata = generateMetadata({
  title: 'Pricing',
  description:
    'Simple, transparent pricing for InterviewEra. Start free with 3 credits. One-time 30-day plans from ₹149.',
  path: '/pricing',
  keywords: 'InterviewEra pricing, AI mock interview price, placement prep cost, interview practice India',
});

export const revalidate = 3600;

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

export default function PricingPage() {
  return (
    <>
      <JsonLdScript id="pricing-faq-ld" data={PRICING_FAQ_LD} />
      <JsonLdScript id="pricing-breadcrumb-ld" data={PRICING_BREADCRUMB_LD} />
      <PricingPageClient />
    </>
  );
}
