import type { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo/metadata';
import { AtsResultsPageClient } from './AtsResultsPageClient';

export const metadata: Metadata = generateMetadata({
  title: 'Resume readiness results',
  description:
    'InterviewEra parseability, field extraction, and structure readiness — plus what a typical parser extracts from your resume.',
  path: '/tools/ats-checker/results',
  noIndex: true,
  noIndexFollow: true,
});

export default function AtsCheckerResultsPage() {
  return <AtsResultsPageClient />;
}
