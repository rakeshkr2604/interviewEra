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
  'Prep scattered across videos and random question lists',
  'Answers memorised, lost when a follow-up lands',
  'No signal on whether this week improved',
] as const;

const AFTER = [
  'Repeatable answer structure under pressure',
  'Follow-up pressure feels familiar',
  'Interview Report after each Mock Interview shows what to tighten',
] as const;

export function LandingBeforeAfter() {
  return (
    <section
      className={cn(LANDING_HOME_SECTION, 'relative overflow-hidden')}
      aria-labelledby="landing-before-after-heading"
    >
      <AmbientLayer variant="before-after" />
      <div className={cn(LANDING_PAGE_CONTAINER, 'relative z-[1]')}>
        <div className={LANDING_HOME_HEADER_BLOCK}>
          <span className={LANDING_HOME_EYEBROW}>Practice outcomes</span>
          <h2 id="landing-before-after-heading" className={LANDING_HOME_HEADING}>
            How Mock Interview practice changes your interview behavior
          </h2>
          <p className={LANDING_HOME_SUBHEAD}>
            Once practice is structured, repeated, and measured — performance tends to shift.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-4xl gap-3.5 md:grid-cols-2 md:gap-4">
          <div className="ie-lh-surface-70 rounded-2xl border p-5 sm:p-6">
            <h3 className="ie-lh-text-muted text-sm font-bold uppercase tracking-wider">
              Without structured practice
            </h3>
            <ul className="mt-3 space-y-2.5 p-0">
              {BEFORE.map((item) => (
                <li key={item} className="ie-lh-text-secondary flex gap-3 text-sm leading-snug">
                  <span aria-hidden className="ie-lh-dot-muted mt-[6px] size-1.5 shrink-0 rounded-full" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="ie-lh-surface-accent rounded-2xl border p-5 sm:p-6">
            <h3 className="ie-lh-text-accent text-sm font-bold uppercase tracking-wider">
              After a few InterviewEra sessions
            </h3>
            <ul className="mt-3 space-y-2.5 p-0">
              {AFTER.map((item) => (
                <li key={item} className="ie-lh-text-primary flex gap-3 text-sm leading-snug">
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
