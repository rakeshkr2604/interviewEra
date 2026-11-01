import {
  FileCheck2,
  Gauge,
  ListChecks,
  MessageSquareQuote,
  TrendingUp,
  Video,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { Reveal } from '@/components/landing/landing-home-shared';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';

/** Each step maps to a shipped surface: ATS checker, QG, STAR builder, script interview, report, history/analytics. */
const STEPS: readonly {
  title: string;
  body: string;
  icon: LucideIcon;
  ctaLabel: string;
  href: string;
}[] = [
  {
    title: 'Resume analysis',
    body: 'Check how your resume parses and what to fix with the ATS checker.',
    icon: FileCheck2,
    ctaLabel: 'Open tool',
    href: '/tools/ats-checker',
  },
  {
    title: 'Question preparation',
    body: 'Generate questions for your role, target company or job description.',
    icon: ListChecks,
    ctaLabel: 'Open tool',
    href: '/tools/question-generator',
  },
  {
    title: 'Answer improvement',
    body: 'Structure behavioural stories with the STAR Answer Builder.',
    icon: MessageSquareQuote,
    ctaLabel: 'Open tool',
    href: '/tools/star-builder',
  },
  {
    title: 'AI mock interview',
    body: 'Practise a technical, HR & behavioural or mixed interview personalised to your resume.',
    icon: Video,
    ctaLabel: 'Get started',
    href: '/signup',
  },
  {
    title: 'Performance feedback',
    body: 'Get scores across five dimensions in a post-interview report.',
    icon: Gauge,
    ctaLabel: 'Get started',
    href: '/signup',
  },
  {
    title: 'Progress improvement',
    body: 'Track scores across sessions and practise the areas that need work.',
    icon: TrendingUp,
    ctaLabel: 'Get started',
    href: '/signup',
  },
] as const;

export function PricingJourneySection() {
  return (
    <section
      className="border-y px-4 py-12 sm:px-6 sm:py-14"
      style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      aria-labelledby="journey-title"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.1em]"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-primary) 30%, var(--card-border))',
              background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
              color: 'var(--accent-primary)',
            }}
          >
            <Zap className="size-3.5" aria-hidden />
            How InterviewEra works
          </span>
          <h2
            id="journey-title"
            className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl"
          >
            One preparation path, from resume to{' '}
            <span className="ie-journey-highlight">interview day</span>
          </h2>
          <p
            className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed sm:text-base"
            style={{ color: 'var(--text-secondary)' }}
          >
            A complete, guided flow to prepare, practise, get feedback and improve — all in one
            place.
          </p>
        </Reveal>

        <ol className="mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-6">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="h-full">
                <Reveal delay={index * 0.05} className="h-full">
                  <article
                    className="ie-pricing-lift flex h-full flex-col rounded-2xl border p-5"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="flex size-10 items-center justify-center rounded-xl"
                        style={{
                          background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                        }}
                        aria-hidden
                      >
                        <Icon className="size-5" style={{ color: 'var(--accent-primary)' }} />
                      </span>
                      <span className="ie-journey-card__index" aria-hidden>
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold sm:text-base">{step.title}</h3>
                    <p
                      className="mt-1.5 flex-1 text-sm leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {step.body}
                    </p>
                    <TrackedCtaLink
                      href={step.href}
                      ctaKey={CTA_KEYS.TOOL_CTA}
                      ctaText={`${step.ctaLabel}: ${step.title}`}
                      section="pricing_journey"
                      className="ie-focus-visible mt-4 inline-flex items-center text-sm font-semibold underline-offset-4 hover:underline"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      {step.ctaLabel}
                      <span className="sr-only">: {step.title}</span>
                      <span aria-hidden>&nbsp;→</span>
                    </TrackedCtaLink>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
