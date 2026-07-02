'use client';

import { Building2, GraduationCap, Rocket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import {
  LANDING_HOME_HEADER_BLOCK,
  LANDING_HOME_HEADING,
  LANDING_HOME_SECTION,
  LANDING_HOME_SUBHEAD,
  LANDING_PAGE_CONTAINER,
} from '@/lib/landing/container';
import { cn } from '@/lib/utils';

const PATHS: {
  title: string;
  description: string;
  href: string;
  cta: string;
  ctaKey: (typeof CTA_KEYS)[keyof typeof CTA_KEYS];
  section: string;
  icon: LucideIcon;
}[] = [
  {
    title: 'Students',
    description: 'AI mock interviews tailored to your resume — free to start.',
    href: '/signup',
    cta: 'Start Free',
    ctaKey: CTA_KEYS.AUDIENCE_STUDENTS,
    section: 'audience_students',
    icon: Rocket,
  },
  {
    title: 'Colleges',
    description: 'Run structured mocks for your entire placement batch.',
    href: '/campus',
    cta: 'For Colleges',
    ctaKey: CTA_KEYS.AUDIENCE_COLLEGES,
    section: 'audience_colleges',
    icon: GraduationCap,
  },
  {
    title: 'Hiring Teams',
    description: 'Evaluate candidates with structured AI interviews.',
    href: '/teams',
    cta: 'For Teams',
    ctaKey: CTA_KEYS.AUDIENCE_HIRING_TEAMS,
    section: 'audience_hiring_teams',
    icon: Building2,
  },
];

export function AudiencePathSection() {
  return (
    <section
      className={cn(LANDING_HOME_SECTION, 'border-b pt-16 sm:pt-[4.5rem]')}
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 35%, transparent)',
      }}
      aria-labelledby="audience-path-heading"
    >
      <div className={LANDING_PAGE_CONTAINER}>
        <div className={LANDING_HOME_HEADER_BLOCK}>
          <h2 id="audience-path-heading" className={cn(LANDING_HOME_HEADING, 'text-2xl sm:text-3xl')}>
            Who is InterviewEra for?
          </h2>
          <p className={LANDING_HOME_SUBHEAD}>
            Pick the path that matches your role — one account, one login, no role dropdowns.
          </p>
        </div>

        <ul className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-3" role="list">
          {PATHS.map((path) => {
            const Icon = path.icon;
            return (
              <li key={path.title} role="listitem">
                <TrackedCtaLink
                  href={path.href}
                  ctaKey={path.ctaKey}
                  ctaText={path.cta}
                  section={path.section}
                  className="group flex h-full min-h-11 flex-col rounded-2xl border p-5 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)] focus-visible:ring-offset-2"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
                    boxShadow: 'var(--card-shadow)',
                  }}
                >
                  <span
                    className="mb-4 flex size-11 items-center justify-center rounded-xl"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                      color: 'var(--accent-primary)',
                    }}
                    aria-hidden
                  >
                    <Icon className="size-5" />
                  </span>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {path.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {path.description}
                  </p>
                  <span
                    className="mt-4 text-sm font-semibold"
                    style={{ color: 'var(--accent-link)' }}
                  >
                    {path.cta} →
                  </span>
                </TrackedCtaLink>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
