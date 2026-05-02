import type { Metadata } from 'next';
import { FileSearch, Shield, Sparkles, Zap } from 'lucide-react';
import { AtsCheckerForm } from './AtsCheckerForm';
import { FreeToolPageLayout } from '@/components/landing/FreeToolPageLayout';

export const metadata: Metadata = {
  title: 'Free ATS Resume Checker | InterviewEra',
  description:
    'Find out if your resume passes Applicant Tracking Systems. Instant ATS compatibility score with actionable fixes — no sign-up required.',
  keywords: 'ATS resume checker, applicant tracking system, resume scanner, ATS score, resume check',
  openGraph: {
    title: 'Free ATS Resume Checker',
    description:
      'Find out if your resume passes Applicant Tracking Systems. Instant results.',
    type: 'website',
  },
};

const BULLETS = [
  { icon: Sparkles, text: 'Instant score + concrete fixes you can apply today' },
  { icon: Zap, text: 'Keyword and structure signals recruiters’ ATS tools look for' },
  { icon: Shield, text: 'No account required — file is analyzed and discarded' },
] as const;

export default function AtsCheckerPage() {
  return (
    <FreeToolPageLayout
      eyebrow="Free tool · no sign-up"
      eyebrowIcon={FileSearch}
      title="Free ATS resume checker"
      description="See if your resume survives Applicant Tracking Systems — score, risks, and fixes in one pass. Add a job description for sharper keyword alignment."
      bullets={BULLETS}
    >
      <AtsCheckerForm />
    </FreeToolPageLayout>
  );
}
