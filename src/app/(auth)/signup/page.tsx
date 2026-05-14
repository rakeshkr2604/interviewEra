import Link from 'next/link';
import { ArrowLeft, CalendarPlus, Rocket, Target } from 'lucide-react';
import { AuthBrandChipIcon } from '@/components/auth/AuthBrandChipIcon';
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit';
import { AuthPremiumShell } from '@/components/layout/AuthPremiumShell';
import { AuthSplitLayout } from '@/components/layout/AuthSplitLayout';
import { SignupForm } from './SignupForm';
import { authPageMetadata } from '@/lib/seo/metadata';

interface SignupPageProps {
  searchParams: Promise<{ next?: string; email?: string }>;
}

export const metadata = authPageMetadata({
  title: 'Sign up',
  description:
    'Create your InterviewEra account — AI mock interviews personalized to your resume. Start with free credits.',
  path: '/signup',
  keywords: ['InterviewEra sign up', 'AI mock interview account', 'placement interview practice'],
});

const BULLETS = [
  { icon: Rocket, text: 'Resume-aware questions — not one-size-fits-all banks' },
  { icon: Target, text: 'Scores and fixes you can use before the next mock' },
  { icon: CalendarPlus, text: 'Optional placement month helps us tune your prep rhythm' },
] as const;

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { next: rawNext } = await searchParams;
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : undefined;
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
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tracking-wide lg:mx-0"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                  color: 'var(--text-primary)',
                }}
              >
                <AuthBrandChipIcon />
                <BrandWordmarkSplit interviewClassName="font-medium" eraClassName="font-semibold" />
              </div>

              <div className="space-y-4">
                <h1 className="text-[2rem] font-bold leading-[1.08] tracking-tight text-balance sm:text-4xl md:text-5xl md:leading-[1.05]">
                  Create your account
                </h1>
                <p className="text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
                  AI mock interviews tailored to your resume, with rubric-scored feedback built for placement season
                  and early-career interviews.
                </p>
              </div>

              <ul className="mx-auto max-w-md space-y-3.5 text-left sm:max-w-lg lg:mx-0 lg:max-w-none">
                {BULLETS.map(({ icon: Icon, text }) => (
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
          right={<SignupForm next={next} />}
        />
      </AuthPremiumShell>
    </div>
  );
}
