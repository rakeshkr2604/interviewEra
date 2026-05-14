import type { Metadata } from 'next';
import { PricingPageClient } from './PricingPageClient';
import { generateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generateMetadata({
  title: 'Pricing',
  description:
    'Simple, transparent pricing for InterviewEra. Start free with 3 credits. AI mock interviews from ₹149/month.',
  path: '/pricing',
});

export const revalidate = 3600;

export default function PricingPage() {
  return <PricingPageClient />;
}
