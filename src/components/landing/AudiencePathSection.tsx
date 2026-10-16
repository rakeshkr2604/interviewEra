'use client';

import { ArrowRight, Building2, GraduationCap, Rocket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import {
  CollegesProductShot,
  HiringTeamsProductShot,
  StudentsProductShot,
} from '@/components/landing/AudienceProductShots';
import {
  LANDING_HOME_HEADER_BLOCK,
  LANDING_HOME_HEADING,
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
  context: string;
  index: string;
  shot?: 'students' | 'colleges' | 'hiring';
  /** Small status chip (e.g. Coming soon on Hiring Teams). */
  badge?: string;
}[] = [
  {
    title: 'Students',
    description: 'Resume-aware Mock Interviews for campus placements. Free to start.',
    href: '/signup',
    cta: 'Start Free Mock Interview',
    ctaKey: CTA_KEYS.AUDIENCE_STUDENTS,
    section: 'audience_students',
    icon: Rocket,
    context: 'Individual practice',
    index: '01',
    shot: 'students',
  },
  {
    title: 'Colleges',
    description: 'Structured Mock Interviews for your entire placement batch.',
    href: '/campus',
    cta: 'For Colleges',
    ctaKey: CTA_KEYS.AUDIENCE_COLLEGES,
    section: 'audience_colleges',
    icon: GraduationCap,
    context: 'Campus readiness',
    index: '02',
    shot: 'colleges',
    badge: 'Coming soon',
  },
  {
    title: 'Hiring Teams',
    description: 'Structured Mock Interviews to evaluate candidates consistently.',
    href: '/teams',
    cta: 'For Teams',
    ctaKey: CTA_KEYS.AUDIENCE_HIRING_TEAMS,
    section: 'audience_hiring_teams',
    icon: Building2,
    context: 'Candidate evaluation',
    index: '03',
    shot: 'hiring',
    badge: 'Coming soon',
  },
];

function Shot({ kind }: { kind: 'students' | 'colleges' | 'hiring' }): ReactNode {
  if (kind === 'students') return <StudentsProductShot />;
  if (kind === 'colleges') return <CollegesProductShot />;
  return <HiringTeamsProductShot />;
}

export function AudiencePathSection() {
  return (
    <section
      className={cn(
        'landing-audience-path px-4 py-16 sm:px-5 sm:py-20 lg:py-24',
        'ie-lh-surface-35 relative overflow-hidden border-b',
      )}
      aria-labelledby="audience-path-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 55% 65% at 50% 0%, color-mix(in srgb, var(--accent-primary) 10%, transparent), transparent 72%)',
        }}
        aria-hidden
      />
      <div className={cn(LANDING_PAGE_CONTAINER, 'relative')}>
        <div className={LANDING_HOME_HEADER_BLOCK}>
          <h2 id="audience-path-heading" className={LANDING_HOME_HEADING}>
            Who is InterviewEra for?
          </h2>
          <p className={LANDING_HOME_SUBHEAD}>Pick the path that matches your role.</p>
        </div>

        <ul
          className="relative mx-auto mt-10 grid max-w-[70rem] gap-5 lg:grid-cols-3 lg:gap-6"
          role="list"
        >
          {PATHS.map((path) => {
            const Icon = path.icon;
            return (
              <li key={path.title} className="flex" role="listitem">
                <TrackedCtaLink
                  href={path.href}
                  ctaKey={path.ctaKey}
                  ctaText={path.cta}
                  section={path.section}
                  // Campus pulls motion/react via CampusLandingClient — avoid
                  // viewport prefetch thrashing the homepage main thread.
                  prefetch={path.href === '/campus' ? false : undefined}
                  className={cn(
                    'ie-lh-surface-94 group flex min-h-11 w-full flex-col overflow-hidden',
                    'rounded-[var(--ie-radius-2xl)] border',
                    'transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1',
                    'motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)] focus-visible:ring-offset-2',
                  )}
                >
                  <div className="p-6 pb-5 sm:p-7 sm:pb-6 lg:p-6 lg:pb-5 xl:p-7 xl:pb-6">
                    <div className="flex items-start justify-between gap-4">
                      <span
                        className="ie-lh-icon-tile-primary flex size-12 items-center justify-center rounded-2xl"
                        aria-hidden
                      >
                        <Icon className="size-[1.35rem]" strokeWidth={1.8} />
                      </span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-xs font-medium tracking-[0.12em] text-[var(--text-muted)]">
                        {path.index}
                      </span>
                    </div>

                    <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--accent-hover)]">
                      {path.context}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <h3 className="ie-lh-text-primary font-[family-name:var(--font-bricolage)] text-2xl font-bold leading-tight tracking-[-0.02em]">
                        {path.title}
                      </h3>
                      {path.badge ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                          style={{
                            color: 'var(--accent-primary)',
                            background:
                              'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                            border:
                              '1px solid color-mix(in srgb, var(--accent-primary) 28%, transparent)',
                          }}
                        >
                          {path.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="ie-lh-text-secondary mt-3 max-w-sm text-[15px] leading-relaxed">
                      {path.description}
                    </p>
                  </div>

                  <div className="mt-auto px-3 pb-3 sm:px-4 sm:pb-4 lg:px-3 lg:pb-3 xl:px-4 xl:pb-4">
                    {path.shot ? <Shot kind={path.shot} /> : null}
                  </div>

                  <span className="flex min-h-14 items-center justify-between gap-4 border-t border-[var(--card-border)] px-6 py-4 text-sm font-semibold text-[var(--accent-link)] sm:px-7 lg:px-6 xl:px-7">
                    <span>{path.cta}</span>
                    <ArrowRight
                      className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none"
                      aria-hidden
                    />
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
