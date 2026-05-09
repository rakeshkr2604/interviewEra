import type { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo/metadata';
import { StarBuilderResultsPageClient } from './StarBuilderResultsPageClient';

export const metadata: Metadata = generateMetadata({
  title: 'Your STAR answer',
  description: 'Polished behavioral answer, scores, and suggestions.',
  path: '/tools/star-builder/results',
  noIndex: true,
  noIndexFollow: true,
});

export default function StarBuilderResultsPage() {
  return <StarBuilderResultsPageClient />;
}
