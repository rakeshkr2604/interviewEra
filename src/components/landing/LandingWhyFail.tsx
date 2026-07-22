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
 * Editorial "why candidates fail" section — the core positioning insight.
 *
 * Rebuilt as a centered header + 2×2 grid of elevated diagnostic cards, each with a
 * color-coded icon tile. Color system mirrors the interview demo card:
 *   accent-primary (blue)   → skill / technique gaps (follow-up, explanation)
 *   accent-warning (amber)  → pressure / confidence failures
 *
 * Server-rendered (no client JS).
 */

type FailureMode = {
  Icon: LucideIcon;
  head: string;
  body: string;
  tone: 'primary' | 'warning';
};

const FAILURE_MODES: FailureMode[] = [
  {
    Icon: GitBranch,
    head: 'The follow-up breaks them',
    body: 'The first answer is rehearsed. The second question — "why that approach and not the other?" — is where preparation runs out.',
    tone: 'primary',
  },
  {
    Icon: Layers,
    head: 'Structure collapses under pressure',
    body: 'Nerves turn a clear point into a loop of "basically… we sort of… I think". Panels can only score what they can follow.',
    tone: 'warning',
  },
  {
    Icon: AudioLines,
    head: 'They have never explained their work out loud',
    body: 'A project that reads well on a resume becomes hard to narrate when someone is listening and waiting.',
    tone: 'primary',
  },
  {
    Icon: TrendingDown,
    head: 'Confidence drops mid-answer',
    body: 'One uncertain pause snowballs. Without practice, there is no muscle memory for recovering and finishing strong.',
    tone: 'warning',
  },
];

export function LandingWhyFail() {
  return (
    <section className={LANDING_HOME_SECTION}>
      <div className={LANDING_PAGE_CONTAINER}>
        <div className={LANDING_HOME_HEADER_BLOCK}>
          <span className={LANDING_HOME_EYEBROW}>The real reason</span>
          <h2 className={LANDING_HOME_HEADING}>
            Most candidates don&rsquo;t fail because they lack knowledge
          </h2>
          <p className={cn(LANDING_HOME_SUBHEAD, 'sm:text-[17px]')}>
            They know the concepts. They have done the projects. They fail in the gap between knowing
            something and explaining it clearly, under pressure, while someone keeps asking
            &ldquo;why?&rdquo;.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
          {FAILURE_MODES.map((m) => (
            <div
              key={m.head}
              className="ie-lh-surface-92 rounded-2xl border p-6 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none"
            >
              <div
                className={cn(
                  'flex size-11 items-center justify-center rounded-xl',
                  m.tone === 'primary' ? 'ie-lh-icon-tile-primary' : 'ie-lh-icon-tile-warning',
                )}
              >
                <m.Icon className="size-5" aria-hidden />
              </div>

              <h3 className="ie-lh-text-primary mt-4 text-base font-bold leading-snug tracking-tight">
                {m.head}
              </h3>
              <p className="ie-lh-text-secondary mt-2 text-sm leading-relaxed">{m.body}</p>
            </div>
          ))}
        </div>

        <div className="ie-lh-surface-accent-band mx-auto mt-8 max-w-4xl rounded-2xl border-l-2 px-6 py-5">
          <p className="ie-lh-text-primary text-base font-medium leading-relaxed sm:text-[17px]">
            InterviewEra recreates those exact conditions{' '}
            <span className="ie-lh-text-accent">before the real interview does</span> — adaptive
            follow-ups, realistic pacing, and a score that shows you where the structure broke.
          </p>
        </div>
      </div>
    </section>
  );
}
