import Link from 'next/link';
import { ArrowLeft, Building2, CalendarPlus, GraduationCap, Rocket, Target } from 'lucide-react';
import { AuthBrandChipIcon } from '@/components/auth/AuthBrandChipIcon';
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit';
import { IntentBadge } from '@/components/auth/IntentBadge';
import { AuthPremiumShell } from '@/components/layout/AuthPremiumShell';
import { AuthSplitLayout } from '@/components/layout/AuthSplitLayout';
import { SignupPageClient } from './SignupPageClient';
import { generateMetadata } from '@/lib/seo/metadata';
import { isSafePath } from '@/lib/auth/auth-params';
import { parseAuthIntent, type AuthIntent } from '@/lib/auth/auth-intent';

interface SignupPageProps {
  searchParams: Promise<{ next?: string; email?: string; intent?: string }>;
}

export const metadata = generateMetadata({
  title: 'Sign up',
  description:
    'Create your InterviewEra account — AI mock interviews personalized to your resume. Start with free credits.',
  path: '/signup',
  keywords: ['InterviewEra sign up', 'AI mock interview account', 'placement interview practice'],
});

const COPY: Record<
  AuthIntent,
  { h1: string; subtitle: string; bullets: { icon: typeof Rocket; text: string }[] }
> = {
  candidate: {
    h1: 'Start your first mock interview',
    subtitle:
      'AI mock interviews tailored to your resume, with rubric-scored feedback built for placement season.',
    bullets: [
      { icon: Rocket, text: 'Resume-aware questions — not one-size-fits-all banks' },
      { icon: Target, text: 'Scores and fixes you can use before the next mock' },
      { icon: CalendarPlus, text: 'Optional placement month helps us tune your prep rhythm' },
    ],
  },
  college: {
    h1: 'Set up your campus workspace',
    subtitle: 'Bulk student onboarding, deadlines, and a T&P dashboard for your placement batch.',
    bullets: [
      { icon: GraduationCap, text: 'CSV bulk invite for your entire batch' },
      { icon: Target, text: 'Live progress tracking per student' },
      { icon: Rocket, text: 'Pilot-friendly pricing for Indian campuses' },
    ],
  },
  business: {
    h1: 'Create your hiring workspace',
    subtitle: 'Evaluate candidates with structured AI interviews and scoring.',
    bullets: [
      { icon: Building2, text: 'Work-email signup for your organization' },
      { icon: Target, text: 'Structured candidate evaluation' },
      { icon: Rocket, text: 'Scale hiring without losing signal' },
    ],
  },
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const intent = parseAuthIntent(params.intent);
  const next = isSafePath(params.next) ? params.next : undefined;
  const email = params.email?.trim() || undefined;
  const copy = COPY[intent];

  return (
    <div
      className="ie-landing-premium min-h-screen"
      style={{ background: 'var(--page-gradient)', color: 'var(--text-primary)' }}
    >
      <AuthPremiumShell>
        <div className="mb-8 sm:mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80 sm:text-base"
            style={{ color: 'var(--accent-primary)' }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to home
          </Link>
        </div>

        <AuthSplitLayout
          left={
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tracking-wide"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <AuthBrandChipIcon />
                  <BrandWordmarkSplit interviewClassName="font-medium" eraClassName="font-semibold" />
                </div>
                {intent !== 'candidate' ? <IntentBadge intent={intent} /> : null}
              </div>

              <div className="space-y-4">
                <h1 className="text-[2rem] font-bold leading-[1.08] tracking-tight text-balance sm:text-4xl md:text-5xl md:leading-[1.05]">
                  {copy.h1}
                </h1>
                <p className="text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
                  {copy.subtitle}
                </p>
              </div>

              <ul className="mx-auto max-w-md space-y-3.5 text-left sm:max-w-lg lg:mx-0 lg:max-w-none">
                {copy.bullets.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex gap-3 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                    <span
                      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
            </>
          }
          right={<SignupPageClient intent={intent} next={next} email={email} />}
        />
      </AuthPremiumShell>
    </div>
  );
}
