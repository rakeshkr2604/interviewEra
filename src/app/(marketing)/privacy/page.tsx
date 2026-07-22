import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { privacyDocument } from '@/lib/legal/privacy-content';
import { generateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generateMetadata({
  title: privacyDocument.title,
  description: privacyDocument.description,
  path: privacyDocument.path,
});

export default function PrivacyPage() {
  return <LegalDocument doc={privacyDocument} />;
}
