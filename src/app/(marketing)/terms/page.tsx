import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { termsDocument } from '@/lib/legal/terms-content';
import { generateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generateMetadata({
  title: termsDocument.title,
  description: termsDocument.description,
  path: termsDocument.path,
});

export default function TermsPage() {
  return <LegalDocument doc={termsDocument} />;
}
