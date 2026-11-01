'use client';

import { FileSearch, ListChecks, MessageSquareQuote, Sparkles, type LucideIcon } from 'lucide-react';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { Reveal } from '@/components/landing/landing-home-shared';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';

export const FREE_TOOLKIT_NOTE =
  'Included with every registered account. No mock-interview credits used. Fair-use limits apply.';

const TOOLS: readonly {
  name: string;
  href: string;
  benefit: string;
  icon: LucideIcon;
}[] = [
  {
    name: 'ATS Resume Checker',
    href: '/tools/ats-checker',
    benefit:
      'See how a typical parser reads your resume, with explainable fixes and an optional job-description match.',
    icon: FileSearch,
  },
  {
    name: 'Interview Question Generator',
    href: '/tools/question-generator',
    benefit:
      'Generate role, company, topic or job-description specific questions, with answer coaching for each one.',
    icon: ListChecks,
  },
  {
    name: 'STAR Answer Builder',
    href: '/tools/star-builder',
    benefit:
      'Turn a rough experience into a structured behavioural answer, scored with concrete improvement tips.',
    icon: MessageSquareQuote,
  },
  {
    name: 'Interview Prompt Builder',
    href: '/tools/prompt-builder',
    benefit:
      'Build a focused preparation prompt for your own ChatGPT chat, written locally in your browser.',
    icon: Sparkles,
  },
];

export function PricingToolkitSection() {
  return (
    <section className="px-4 py-10 sm:px-6 sm:py-10" aria-labelledby="toolkit-title">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p
            className="text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: 'var(--accent-primary)' }}
          >
            Free preparation toolkit
          </p>
          <h2 id="toolkit-title" className="mt-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
            Four tools. One free account.
          </h2>
          <p
            className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-relaxed sm:text-base"
            style={{ color: 'var(--text-secondary)' }}
          >
            {FREE_TOOLKIT_NOTE}
          </p>
        </Reveal>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <li key={tool.href} className="h-full">
                <Reveal delay={index * 0.05} className="h-full">
                  <article
                    className="ie-pricing-lift flex h-full flex-col rounded-2xl border p-5"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                  >
                    <span
                      className="flex size-10 items-center justify-center rounded-xl"
                      style={{ background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' }}
                      aria-hidden
                    >
                      <Icon className="size-5" style={{ color: 'var(--accent-primary)' }} />
                    </span>
                    <h3 className="mt-4 text-base font-semibold">{tool.name}</h3>
                    <p
                      className="mt-2 flex-1 text-sm leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {tool.benefit}
                    </p>
                    <TrackedCtaLink
                      href={tool.href}
                      ctaKey={CTA_KEYS.TOOL_CTA}
                      ctaText={`Open ${tool.name}`}
                      section="pricing_toolkit"
                      className="ie-focus-visible mt-4 inline-flex items-center text-sm font-semibold underline-offset-4 hover:underline"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      Open tool<span className="sr-only">: {tool.name}</span>
                      <span aria-hidden>&nbsp;→</span>
                    </TrackedCtaLink>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
