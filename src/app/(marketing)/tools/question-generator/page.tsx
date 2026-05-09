import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Zap, ShieldCheck, ListChecks } from 'lucide-react';
import { brandPageTitle } from '@/lib/seo/metadata';
import { QuestionGeneratorForm } from './QuestionGeneratorForm';
import { FreeToolPageLayout } from '@/components/landing/FreeToolPageLayout';

const QGEN_OG_TITLE = 'Free Interview Question Generator';

export const metadata: Metadata = {
  title: QGEN_OG_TITLE,
  description:
    'Get 10 role-specific interview questions in 10 seconds — no sign-up required. Tailored by role, experience level, and domain.',
  keywords:
    'interview question generator, free interview questions, placement interview questions, technical interview questions, HR interview questions, mock interview preparation',
  openGraph: {
    title: brandPageTitle(QGEN_OG_TITLE),
    description: 'Generate tailored interview questions instantly. No sign-up.',
    type: 'website',
  },
};

const BULLETS = [
  {
    icon: Zap,
    title: 'Under 10 seconds',
    body: 'Ten tailored questions per run, tuned to your role and seniority.',
  },
  {
    icon: ListChecks,
    title: 'Mix of categories',
    body: 'Technical, behavioral, and situational prompts like real interviews.',
  },
  {
    icon: ShieldCheck,
    title: 'No account needed',
    body: 'Try the tool instantly. Upgrade when you want AI mock practice.',
  },
] as const;

export default function QuestionGeneratorPage() {
  return (
    <FreeToolPageLayout
      eyebrow="Free tool · no sign-up"
      eyebrowIcon={Sparkles}
      title="Interview questions built for your exact role"
      description="Enter a role, pick experience and domain, and get ten ready-to-practice questions in seconds — no sign-up."
      bullets={BULLETS}
      footerSlot={
        <p
          className="mx-auto max-w-md text-sm text-left lg:mx-0"
          style={{ color: 'var(--text-muted)' }}
        >
          Also try:{' '}
          <Link
            href="/tools/ats-checker"
            className="font-medium underline-offset-4 transition-colors hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            ATS resume checker
          </Link>
          {' · '}
          <Link
            href="/tools/star-builder"
            className="font-medium underline-offset-4 transition-colors hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            STAR answer builder
          </Link>
        </p>
      }
    >
      <QuestionGeneratorForm />
    </FreeToolPageLayout>
  );
}
