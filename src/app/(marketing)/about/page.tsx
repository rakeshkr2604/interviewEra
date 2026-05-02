import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarCheck, Sparkles, Target, TrendingUp, UserRound } from 'lucide-react';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { FreeToolCtaBlock, FreeToolFormCard } from '@/components/landing/FreeToolFormCard';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'About InterviewEra',
  description:
    'InterviewEra is an AI-powered interview practice platform for students and job seekers — structured mocks, resume-aware questions, and clear feedback.',
};

const PILLARS = [
  {
    icon: UserRound,
    title: 'Personalized practice',
    body: 'Questions are tailored using your role, experience level, and resume context.',
  },
  {
    icon: TrendingUp,
    title: 'Actionable feedback',
    body: 'Each session gives score trends and improvement signals you can apply immediately.',
  },
  {
    icon: CalendarCheck,
    title: 'Built for consistency',
    body: 'Track progress over multiple interviews instead of relying on one-off mock sessions.',
  },
] as const;

const BULLETS = [
  { icon: Target, text: 'Resume-aware scenarios — not generic question banks' },
  { icon: Sparkles, text: 'Clear next steps after every session, not vague scores' },
  { icon: CalendarCheck, text: 'Rhythm built for placement season: repeat, compare, improve' },
] as const;

const miniHeaderStrip = {
  borderColor: 'var(--card-border)',
  background: 'linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 12%, transparent), transparent)',
} as const;

const miniCardShell = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
  boxShadow:
    'var(--card-shadow), 0 0 48px color-mix(in srgb, var(--accent-primary) 8%, transparent), 0 0 0 1px color-mix(in srgb, white 45%, transparent) inset',
} as const;

export default function AboutPage() {
  return (
    <BlogMarketingShell>
      <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-14 xl:gap-16">
        <div className="mx-auto max-w-xl space-y-7 text-center lg:col-span-5 lg:mx-0 lg:max-w-none lg:pt-2 lg:text-left">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tracking-wide lg:mx-0"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
              color: 'var(--text-primary)',
            }}
          >
            <Sparkles className="size-3.5" style={{ color: 'var(--accent-primary)' }} aria-hidden />
            About InterviewEra
          </div>

          <div className="space-y-4">
            <h1 className="text-[2rem] font-bold leading-[1.08] tracking-tight text-balance sm:text-4xl md:text-5xl md:leading-[1.05]">
              Practice interviews with AI — not guesswork.
            </h1>
            <p className="text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
              Structured mock interviews, feedback you can act on, and progress you can see — built for students and
              early-career hires in India and beyond.
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

          <p className="text-sm lg:text-left" style={{ color: 'var(--text-muted)' }}>
            More to read:{' '}
            <Link href="/blog" className="ie-blog-inline-link font-medium">
              Blog
            </Link>
            {' · '}
            <Link href="/tools/ats-checker" className="ie-blog-inline-link font-medium">
              Free tools
            </Link>
          </p>
        </div>

        <div className="mx-auto w-full max-w-xl lg:col-span-7 lg:mx-0 lg:max-w-none lg:min-w-0">
          <FreeToolFormCard
            headerEyebrow="Mission"
            headerTitle="Why we built InterviewEra"
            headerSubtitle="Replace one-off mocks with a repeatable practice system."
          >
            <div className="space-y-4 p-5 sm:p-7 lg:p-8">
              <p className="text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                We built InterviewEra for students and early-career professionals who want{' '}
                <strong style={{ color: 'var(--text-primary)' }}>structured, repeatable</strong> mock interview practice.
                Upload your resume, run realistic interview sessions, and get clear feedback on what to improve next — so
                you walk into real panels with confidence, not anxiety.
              </p>
              <p className="text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                Whether you are targeting campus placements, internships, or your first full-time role, the goal is the
                same: <strong style={{ color: 'var(--text-primary)' }}>signal over noise</strong> in how you prepare.
              </p>
            </div>
          </FreeToolFormCard>
        </div>
      </div>

      <section className="mt-14 sm:mt-16 lg:mt-20" aria-labelledby="about-pillars-heading">
        <h2 id="about-pillars-heading" className="sr-only">
          What you get
        </h2>
        <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="p-0">
              <article
                className={cn(
                  'flex h-full flex-col overflow-hidden rounded-[22px] border-2 transition-[transform,box-shadow] duration-200 lg:rounded-3xl',
                  'hover:-translate-y-1 hover:shadow-xl',
                )}
                style={miniCardShell}
              >
                <div className="border-b px-5 py-4 sm:px-6" style={miniHeaderStrip}>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-10 items-center justify-center rounded-xl"
                      style={{
                        background: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="text-base font-bold leading-snug sm:text-lg">{title}</h3>
                  </div>
                </div>
                <div className="flex flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
                  <p className="text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                    {body}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-14 sm:mt-16 lg:mt-20">
        <FreeToolCtaBlock
          title="Try InterviewEra on your own resume"
          body="Sign up free, run an AI mock interview, and see rubric-style feedback — same product ethos as our free tools."
          href="/signup"
          ctaLabel="Sign up free"
        />
      </div>
    </BlogMarketingShell>
  );
}
