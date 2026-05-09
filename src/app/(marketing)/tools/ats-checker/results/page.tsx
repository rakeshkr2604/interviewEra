import type { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo/metadata';
import { AtsResultsPageClient } from './AtsResultsPageClient';

export const metadata: Metadata = generateMetadata({
  title: 'ATS check results',
  description: 'Your ATS compatibility score and actionable resume feedback.',
  path: '/tools/ats-checker/results',
  noIndex: true,
  noIndexFollow: true,
});

export default function AtsCheckerResultsPage() {
  return <AtsResultsPageClient />;
}
