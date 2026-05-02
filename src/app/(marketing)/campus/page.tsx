import type { Metadata } from 'next';
import CampusLandingClient from '@/components/landing/campus/CampusLandingClient';
import { CAMPUS_META } from '@/lib/landing/campus-content';

export const metadata: Metadata = {
  title: CAMPUS_META.title,
  description: CAMPUS_META.description,
};

export default function CampusPage() {
  const calendlyUrl =
    process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com/interviewera/demo';

  return <CampusLandingClient calendlyUrl={calendlyUrl} />;
}
