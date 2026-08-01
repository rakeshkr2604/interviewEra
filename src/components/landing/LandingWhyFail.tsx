import type { LucideIcon } from 'lucide-react';
import { GitBranch, Layers, AudioLines, TrendingDown } from 'lucide-react';
import {
  LANDING_HOME_EYEBROW,
  LANDING_HOME_HEADER_BLOCK,
  LANDING_HOME_HEADING,
  LANDING_HOME_SECTION,
  LANDING_HOME_SUBHEAD,
  LANDING_PAGE_CONTAINER,
} from '@/lib/landing/container';
import { cn } from '@/lib/utils';

/**
 * Editorial "why candidates fail" section — canonical homepage Problem block (Phase 4).
 *
 * Layout: centered header + 2×2 grid of diagnostic cards + accent bridge band.
 * Color system mirrors the interview demo card:
 *   accent-primary (blue)   → skill / technique gaps (follow-up, explanation)
 *   accent-warning (amber)  → pressure / confidence failures
 *
 * Server-rendered (no client JS).
 */

// ── Founder copy surface (Phase 2 / Phase 4) — edit strings here only ──────────

/** Eyebrow above the section headline. */
const WHY_FAIL_EYEBROW = 'Why good candidates still get rejected';

/** Primary problem headline (h2) — one sentence per line for scan hierarchy. */
const WHY_FAIL_HEADING_LINES = [
  "Most interviews aren't lost because of weak technical skills.",
  "They're lost because candidates struggle to explain what they already know.",
] as const;

/** Supporting subhead — one sentence per block; wording unchanged. */
const WHY_FAIL_SUBHEAD_LINES = [
  'You know the concepts.',
  "You've built the projects.",
  'But when an interviewer asks follow-up questions, challenges your decisions, or asks you to explain your work clearly, confidence often breaks down.',
  "That's the part most candidates never practice.",
] as const;

/** Bridge band — text before the accent span. */
const WHY_FAIL_BRIDGE_LEAD = 'InterviewEra helps you practice under the same pressure ';

/** Bridge band — accent-highlighted phrase. */
const WHY_FAIL_BRIDGE_ACCENT = 'before your actual interview';

/** Bridge band — text after the accent span (second bridge line). */
const WHY_FAIL_BRIDGE_TAIL = '';

type WhyFailTone = 'primary' | 'warning';

type WhyFailPoint = {
  Icon: LucideIcon;
  head: string;
  bodyLines: readonly [string, string];
  tone: WhyFailTone;
};

/** Problem cards — one entry per failure mode in the 2×2 grid. */
const WHY_FAIL_POINTS: WhyFailPoint[] = [
  {
    Icon: GitBranch,
    head: 'Follow-up questions expose weak preparation',
    bodyLines: [
      'Anyone can memorize the first answer.',
      'Real interviews begin with the second question, where interviewers ask "Why?" and expect you to defend your decisions.',
    ],
    tone: 'primary',
  },
  {
    Icon: Layers,
    head: 'Clear answers become confusing under pressure',
    bodyLines: [
      'Even candidates who know the right answer often lose structure when they feel nervous.',
      'A good idea is only valuable if the interviewer can understand it.',
    ],
    tone: 'warning',
  },
  {
    Icon: AudioLines,
    head: 'Projects are harder to explain than to build',
    bodyLines: [
      'Building a project is one challenge.',
      'Explaining your architecture, decisions, trade-offs, and mistakes in real time is a completely different skill.',
    ],
    tone: 'primary',
  },
  {
    Icon: TrendingDown,
    head: 'Confidence disappears without structured practice',
    bodyLines: [
      'One difficult question can make the rest of the interview feel harder.',
      'Repeatable Mock Interview practice builds the confidence to recover and finish strong.',
    ],
    tone: 'warning',
  },
];

// ── Local presentation helpers (no copy) ─────────────────────────────────────

function WhyFailPointCard({ point }: { point: WhyFailPoint }) {
  const { Icon, head, bodyLines, tone } = point;

  return (
    <div
      className="ie-lh-surface-92 rounded-2xl border p-6 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none"
    >
      <div
        className={cn(
          'flex size-11 items-center justify-center rounded-xl',
          tone === 'primary' ? 'ie-lh-icon-tile-primary' : 'ie-lh-icon-tile-warning',
        )}
      >
        <Icon className="size-5" aria-hidden />
      </div>

      <h3
        className={cn(
          'mt-4 text-base font-bold leading-snug tracking-tight text-balance',
          tone === 'primary' ? 'ie-lh-text-accent-hover' : 'ie-lh-text-warning',
        )}
      >
        {head}
      </h3>
      <div className="mt-2 space-y-2">
        {bodyLines.map((line, lineIndex) => (
          <p
            key={line}
            className={cn(
              'text-sm leading-relaxed sm:text-[15px]',
              lineIndex === 0 ? 'ie-lh-text-secondary' : 'ie-lh-text-muted',
            )}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export function LandingWhyFail() {
  const [setupLineOne, setupLineTwo, contextLine, kickerLine] = WHY_FAIL_SUBHEAD_LINES;

  return (
    <section
      className={cn(LANDING_HOME_SECTION, 'landing-why-fail')}
      aria-labelledby="landing-why-fail-heading"
    >
      <div className={LANDING_PAGE_CONTAINER}>
        <div className={LANDING_HOME_HEADER_BLOCK}>
          <span className={LANDING_HOME_EYEBROW}>{WHY_FAIL_EYEBROW}</span>
          <h2 id="landing-why-fail-heading" className={LANDING_HOME_HEADING}>
            <span className="ie-lh-text-primary block text-balance">{WHY_FAIL_HEADING_LINES[0]}</span>
            <span
              className={cn(
                'ie-lh-text-accent-hover mt-2 block text-balance sm:mt-2.5',
              )}
            >
              {WHY_FAIL_HEADING_LINES[1]}
            </span>
          </h2>

          <div
            className={cn(
              LANDING_HOME_SUBHEAD,
              'mx-auto mt-5 max-w-[34rem] px-1 text-center sm:mt-6 sm:max-w-2xl sm:px-0',
            )}
          >
            <p
              className="ie-lh-text-muted flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm sm:gap-x-4 sm:text-base"
            >
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="ie-lh-bg-success inline-block size-[5px] shrink-0 rounded-full"
                />
                <span>{setupLineOne}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="ie-lh-bg-accent inline-block size-[5px] shrink-0 rounded-full"
                />
                <span>{setupLineTwo}</span>
              </span>
            </p>
            <p className="ie-lh-text-secondary mt-3 text-sm leading-relaxed sm:mt-4 sm:text-[17px]">
              {contextLine}
            </p>
            <p className="ie-lh-text-primary mt-3 text-sm font-semibold leading-relaxed sm:mt-4 sm:text-[17px]">
              {kickerLine}
            </p>
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
          {WHY_FAIL_POINTS.map((point) => (
            <WhyFailPointCard key={point.head} point={point} />
          ))}
        </div>

        <div className="ie-lh-surface-accent-band mx-auto mt-8 max-w-4xl rounded-2xl border-l-2 px-6 py-5 sm:px-7 sm:py-6">
          <p className="ie-lh-text-primary text-base font-medium leading-relaxed sm:text-[17px]">
            {WHY_FAIL_BRIDGE_LEAD}
            <span className="ie-lh-text-accent">{WHY_FAIL_BRIDGE_ACCENT}</span>
          </p>
          {WHY_FAIL_BRIDGE_TAIL ? (
            <p className="ie-lh-text-secondary mt-2.5 text-sm leading-relaxed sm:mt-3 sm:text-[17px]">
              {WHY_FAIL_BRIDGE_TAIL}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
