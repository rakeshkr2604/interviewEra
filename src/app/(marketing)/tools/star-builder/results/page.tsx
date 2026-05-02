import type { Metadata } from 'next';
import { StarBuilderResultsPageClient } from './StarBuilderResultsPageClient';

export const metadata: Metadata = {
  title: 'Your STAR answer | InterviewEra',
  description: 'Polished behavioral answer, scores, and suggestions.',
  robots: { index: false, follow: true },
};

export default function StarBuilderResultsPage() {
  return <StarBuilderResultsPageClient />;
}
