import type { Metadata } from 'next';
import { QuestionGeneratorResultsPageClient } from './QuestionGeneratorResultsPageClient';

export const metadata: Metadata = {
  title: 'Your interview questions | InterviewEra',
  description: 'Role-tailored interview questions you just generated.',
  robots: { index: false, follow: true },
};

export default function QuestionGeneratorResultsPage() {
  return <QuestionGeneratorResultsPageClient />;
}
