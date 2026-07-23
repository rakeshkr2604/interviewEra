'use client';

import { Building2, GraduationCap, Rocket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { trackCtaClick } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import type { CtaKey } from '@/lib/analytics/cta-keys';
import { MarketingPageHeader } from '@/components/layout/MarketingPageHeader';
import {
  IE_MARKETING_SURFACE_CARD_CLASS,
  IE_MARKETING_SURFACE_CARD_STYLE,
} from '@/lib/theme/component-classes';

type TeamsAudienceCard =
  | {
      title: string;
      description?: string;
      bullets?: readonly string[];
      cta: string;
      ctaKey: CtaKey;
      section: string;
      icon: LucideIcon;
      href: string;
      external?: false;
      badge?: string;
    }
  | {
      title: string;
      description?: string;
      bullets?: readonly string[];
      cta: string;
      ctaKey: CtaKey;
      section: string;
      icon: LucideIcon;
      href: string;
      external: true;
      badge?: string;
    };

const CARDS: TeamsAudienceCard[] = [
  {
    title: 'Hiring Teams',
    description: 'Structured AI candidate evaluation for recruiting teams.',
    cta: 'Contact Sales',
    ctaKey: CTA_KEYS.AUDIENCE_HIRING_TEAMS,
    section: 'teams_hiring',
    icon: Building2,
    href: 'mailto:sales@interviewera.com',
    external: true,
    badge: 'Coming Soon',
  },
  {
    title: 'For Colleges',
    bullets: ['Campus placements', 'Bulk onboarding', 'T&P (Training & Placement) dashboard', 'Student analytics'],
    cta: 'Set up Campus Workspace',
    ctaKey: CTA_KEYS.CAMPUS_WORKSPACE,
    section: 'teams_colleges',
    icon: GraduationCap,
    href: '/signup?intent=college',
  },
  {
    title: 'Students',
    bullets: ['AI mock interviews', 'Resume-aware practice', '5-dimension scoring'],
    cta: 'Start Free',
    ctaKey: CTA_KEYS.AUDIENCE_STUDENTS,
    section: 'teams_students',
    icon: Rocket,
    href: '/signup',
  },
];

function CardBody({
  card,
  Icon,
}: {
  card: TeamsAudienceCard;
  Icon: LucideIcon;
}) {
  return (
    <>
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
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {card.title}
        </h2>
        {card.badge ? (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
              color: 'var(--accent-primary)',
              border: '1px solid color-mix(in srgb, var(--accent-primary) 28%, transparent)',
            }}
          >
            {card.badge}
          </span>
        ) : null}
      </div>
      {card.description ? (
        <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {card.description}
        </p>
      ) : null}
      {card.bullets ? (
        <ul className="mt-3 flex-1 space-y-1.5" role="list">
          {card.bullets.map((item) => (
            <li
              key={item}
              className="text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      <span
        className="mt-4 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold"
        style={{ color: 'var(--accent-link)' }}
      >
        {card.cta}
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
          aria-hidden
        />
      </span>
    </>
  );
}

const cardClassName = `group flex min-h-[44px] h-full flex-col p-6 ${IE_MARKETING_SURFACE_CARD_CLASS}`;

const cardStyle = IE_MARKETING_SURFACE_CARD_STYLE;

export function TeamsPageContent() {
  return (
    <div className="space-y-10 py-8 sm:py-12">
      <MarketingPageHeader
        title="Choose your path"
        subtitle="InterviewEra supports students, campus placement programs, and hiring teams. Pick the workspace that fits your role."
      />

      <ul className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3" role="list">
        {CARDS.map((card) => {
          const Icon = card.icon;

          if (card.external) {
            return (
              <li key={card.title} role="listitem" className="flex">
                <a
                  href={card.href}
                  className={cardClassName}
                  style={cardStyle}
                  onClick={trackCtaClick({
                    ctaKey: card.ctaKey,
                    ctaText: card.cta,
                    section: card.section,
                    page: '/teams',
                  })}
                  aria-label={`${card.title}: ${card.cta}`}
                >
                  <CardBody card={card} Icon={Icon} />
                </a>
              </li>
            );
          }

          return (
            <li key={card.title} role="listitem" className="flex">
              <TrackedCtaLink
                href={card.href}
                ctaKey={card.ctaKey}
                ctaText={card.cta}
                section={card.section}
                className={cardClassName}
                style={cardStyle}
                aria-label={`${card.title}: ${card.cta}`}
              >
                <CardBody card={card} Icon={Icon} />
              </TrackedCtaLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
