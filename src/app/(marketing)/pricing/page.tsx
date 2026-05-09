import type { Metadata } from 'next';
import { PricingPageClient } from './PricingPageClient';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple, transparent pricing for InterviewEra. Start free with 5 credits, upgrade to Starter or Pro for unlimited scored mock interviews.',
};

export const revalidate = 3600;

export default function PricingPage() {
  return <PricingPageClient />;
}
