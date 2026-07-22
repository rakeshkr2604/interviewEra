import { AmbientLayer } from '@/components/landing/AmbientLayer';
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
 * Grounded before/after comparison — observational, not motivational.
 * Server-rendered. Frames the behavioural shift from unstructured prep to repeatable practice.
 */

const BEFORE = [
  'Prep scattered across YouTube videos and random question lists',
  'Answers memorised, then lost the moment a follow-up lands',
  'Mind goes blank when the interviewer digs into the "why"',
  'No real signal on whether this week is better than last',
] as const;

const AFTER = [
  'Answers built on a structure you can repeat under pressure',
  'Steadier when a question goes off the script you rehearsed',
  'Follow-up pressure feels familiar — you have sat with it before',
  'A score after each session that shows exactly what to tighten',
] as const;

export function LandingBeforeAfter() {
  return (
    <section className={cn(LANDING_HOME_SECTION, 'relative overflow-hidden')}>
      <AmbientLayer variant="before-after" />
      <div className={cn(LANDING_PAGE_CONTAINER, 'relative z-[1]')}>
        <div className={LANDING_HOME_HEADER_BLOCK}>
          <span className={LANDING_HOME_EYEBROW}>What changes</span>
          <h2 className={LANDING_HOME_HEADING}>The difference a few real sessions make</h2>
          <p className={LANDING_HOME_SUBHEAD}>
            Not a transformation story — just what tends to shift once practice is structured, repeated,
            and measured instead of improvised.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2 md:gap-5">
          <div className="ie-lh-surface-70 rounded-2xl border p-6 sm:p-7">
            <h3 className="ie-lh-text-muted text-sm font-bold uppercase tracking-wider">
              Without structured practice
            </h3>
            <ul className="mt-5 space-y-3.5 p-0">
              {BEFORE.map((item) => (
                <li key={item} className="ie-lh-text-secondary flex gap-3 text-sm leading-relaxed">
                  <span aria-hidden className="ie-lh-dot-muted mt-[7px] size-1.5 shrink-0 rounded-full" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="ie-lh-surface-accent rounded-2xl border p-6 sm:p-7">
            <h3 className="ie-lh-text-accent text-sm font-bold uppercase tracking-wider">
              After a few InterviewEra sessions
            </h3>
            <ul className="mt-5 space-y-3.5 p-0">
              {AFTER.map((item) => (
                <li key={item} className="ie-lh-text-primary flex gap-3 text-sm leading-relaxed">
                  <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="none" aria-hidden>
                    <path
                      d="M16.7 5.3 8 14l-4.7-4.7"
                      stroke="var(--accent-primary)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
