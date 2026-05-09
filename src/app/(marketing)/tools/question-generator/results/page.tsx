import type { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo/metadata';
import { QuestionGeneratorResultsPageClient } from './QuestionGeneratorResultsPageClient';

export const metadata: Metadata = generateMetadata({
  title: 'Your interview questions',
  description: 'Role-tailored interview questions you just generated.',
  path: '/tools/question-generator/results',
  noIndex: true,
  noIndexFollow: true,
});

export default function QuestionGeneratorResultsPage() {
  return <QuestionGeneratorResultsPageClient />;
}
