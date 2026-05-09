import type { Metadata } from 'next';
import CampusLandingClient from '@/components/landing/campus/CampusLandingClient';
import { CAMPUS_META } from '@/lib/landing/campus-content';
import { generateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generateMetadata({
  title: CAMPUS_META.title,
  description: CAMPUS_META.description,
  path: '/campus',
});

export default function CampusPage() {
  const calendlyUrl =
    process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com/interviewera/demo';

  return <CampusLandingClient calendlyUrl={calendlyUrl} />;
}
