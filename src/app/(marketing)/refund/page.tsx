import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { refundDocument } from '@/lib/legal/refund-content';
import { generateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generateMetadata({
  title: refundDocument.title,
  description: refundDocument.description,
  path: refundDocument.path,
});

export default function RefundPage() {
  return <LegalDocument doc={refundDocument} />;
}
