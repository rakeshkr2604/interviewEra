import type { Metadata } from 'next';
import { PricingPageClient } from './PricingPageClient';

export const metadata: Metadata = {
  title: 'Pricing — InterviewEra',
  description:
    'Simple, transparent pricing for InterviewEra. Start free with 5 credits, upgrade to Starter or Pro for unlimited scored mock interviews.',
};

export default function PricingPage() {
  return <PricingPageClient />;
}
