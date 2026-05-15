import type { Metadata } from 'next';
import CampusLandingClient from '@/components/landing/campus/CampusLandingClient';
import { CAMPUS_META, FAQ_ITEMS } from '@/lib/landing/campus-content';
import { generateMetadata } from '@/lib/seo/metadata';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { faqPageJsonLd, breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld';
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url';

export const metadata: Metadata = generateMetadata({
  title: CAMPUS_META.title,
  description: CAMPUS_META.description,
  path: '/campus',
  keywords: 'campus placement training, AI mock interviews college, placement cell software India, T&P officer platform',
});

const ORIGIN = getCanonicalSiteOrigin();

const CAMPUS_FAQ_LD = faqPageJsonLd(
  FAQ_ITEMS.map((item) => ({ question: item.q, answer: item.a })),
);

const CAMPUS_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Campus Placements', path: '/campus' },
  ],
  ORIGIN,
);

export default function CampusPage() {
  const calendlyUrl =
    process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com/interviewera/demo';

  return (
    <>
      <JsonLdScript id="campus-faq-ld" data={CAMPUS_FAQ_LD} />
      <JsonLdScript id="campus-breadcrumb-ld" data={CAMPUS_BREADCRUMB_LD} />
      <CampusLandingClient calendlyUrl={calendlyUrl} />
    </>
  );
}
