import type { Metadata } from 'next';
import { AtsResultsPageClient } from './AtsResultsPageClient';

export const metadata: Metadata = {
  title: 'ATS check results | InterviewEra',
  description: 'Your ATS compatibility score and actionable resume feedback.',
  robots: { index: false, follow: true },
};

export default function AtsCheckerResultsPage() {
  return <AtsResultsPageClient />;
}
