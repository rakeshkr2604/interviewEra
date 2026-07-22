import { Check, X } from 'lucide-react';
import {
  POSITIONING_BRIDGE,
  POSITIONING_HEADLINE,
  POSITIONING_LEFT,
  POSITIONING_MICRO_KICKER,
  POSITIONING_RIGHT,
  POSITIONING_SUBLINES,
  POSITIONING_WHY_MATTERS,
} from '@/lib/landing/home-content';
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
 * ChatGPT / generic-tools objection — uses POSITIONING_* from home-content.
 * Additive to the FAQ ChatGPT answer; not a replacement.
 */
export function LandingPositioningSection() {
  return (
    <section className={LANDING_HOME_SECTION} aria-labelledby="landing-positioning-heading">
      <div className={LANDING_PAGE_CONTAINER}>
        <div className={LANDING_HOME_HEADER_BLOCK}>
          <span className={LANDING_HOME_EYEBROW}>{POSITIONING_MICRO_KICKER}</span>
          <h2 id="landing-positioning-heading" className={LANDING_HOME_HEADING}>
            {POSITIONING_HEADLINE}
          </h2>
          <div className={cn(LANDING_HOME_SUBHEAD, 'space-y-1.5')}>
            {POSITIONING_SUBLINES.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>

        <div className="ie-lh-surface-accent-soft mx-auto mt-10 max-w-2xl rounded-2xl border px-5 py-4 text-center sm:mt-12">
          <p className="ie-lh-text-primary text-sm leading-relaxed sm:text-base">{POSITIONING_BRIDGE}</p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2 md:gap-5">
          <ComparisonCard
            label={POSITIONING_LEFT.label}
            tone={POSITIONING_LEFT.tone}
            items={POSITIONING_LEFT.items}
            positive={false}
          />
          <ComparisonCard
            label={POSITIONING_RIGHT.label}
            tone={POSITIONING_RIGHT.tone}
            items={POSITIONING_RIGHT.items}
            positive
          />
        </div>

        <div className="mx-auto mt-12 max-w-4xl">
          <h3 className="ie-lh-text-primary text-center text-lg font-bold tracking-tight sm:text-xl">
            {POSITIONING_WHY_MATTERS.title}
          </h3>
          <ul className="mt-6 grid list-none gap-4 p-0 sm:grid-cols-3">
            {POSITIONING_WHY_MATTERS.points.map((point) => (
              <li key={point.title} className="ie-lh-surface-90 rounded-2xl border p-5">
                <p className="ie-lh-text-primary text-sm font-semibold leading-snug">{point.title}</p>
                <p className="ie-lh-text-secondary mt-2 text-sm leading-relaxed">{point.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function ComparisonCard({
  label,
  tone,
  items,
  positive,
}: {
  label: string;
  tone: string;
  items: readonly string[];
  positive: boolean;
}) {
  return (
    <div className={cn('rounded-2xl border p-6 sm:p-7', positive ? 'ie-lh-surface-accent' : 'ie-lh-surface-70')}>
      <h3
        className={cn(
          'text-sm font-bold uppercase tracking-wider',
          positive ? 'ie-lh-text-accent' : 'ie-lh-text-muted',
        )}
      >
        {label}
      </h3>
      <p className="ie-lh-text-secondary mt-1.5 text-sm leading-relaxed">{tone}</p>
      <ul className="mt-5 space-y-3.5 p-0">
        {items.map((item) => (
          <li
            key={item}
            className={cn(
              'flex gap-3 text-sm leading-relaxed',
              positive ? 'ie-lh-text-primary' : 'ie-lh-text-secondary',
            )}
          >
            {positive ? (
              <Check className="ie-lh-text-success mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
              <X className="ie-lh-text-muted mt-0.5 size-4 shrink-0" aria-hidden />
            )}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
