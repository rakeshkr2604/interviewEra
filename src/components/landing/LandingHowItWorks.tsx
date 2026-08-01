import type { LucideIcon } from 'lucide-react';
import { FileUp, Mic, MessagesSquare, BarChart3 } from 'lucide-react';
import { HOW_IT_WORKS } from '@/lib/landing/home-content';
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
 * Early four-step path — outcome-led, same visual language as WhyFail / demo cards.
 * Server-rendered (no client JS).
 */

const STEP_ICONS: Record<(typeof HOW_IT_WORKS)[number]['icon'], LucideIcon> = {
  upload: FileUp,
  mic: Mic,
  probe: MessagesSquare,
  trend: BarChart3,
};

export function LandingHowItWorks() {
  return (
    <section
      className={cn(LANDING_HOME_SECTION, 'landing-how-it-works')}
      aria-labelledby="landing-how-it-works-heading"
    >
      <div className={LANDING_PAGE_CONTAINER}>
        <div className={LANDING_HOME_HEADER_BLOCK}>
          <span className={LANDING_HOME_EYEBROW}>How it works</span>
          <h2 id="landing-how-it-works-heading" className={LANDING_HOME_HEADING}>
            Four steps to a score you can trust
          </h2>
          <p className={cn(LANDING_HOME_SUBHEAD, 'sm:text-[17px]')}>
            Upload once, practise out loud, handle the follow-ups, and leave knowing what to fix —
            before the real placement interview.
          </p>
        </div>

        <ol className="mx-auto mt-12 grid max-w-5xl list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step) => {
            const Icon = STEP_ICONS[step.icon];
            return (
              <li
                key={step.step}
                className="ie-lh-surface-92 rounded-2xl border p-5 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="ie-lh-icon-tile-primary flex size-11 shrink-0 items-center justify-center rounded-xl"
                    aria-hidden
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="ie-lh-text-muted font-[family-name:var(--font-jetbrains)] text-[11px] font-semibold tracking-wider uppercase">
                    Step {String(step.step).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="ie-lh-text-primary mt-4 text-base font-bold leading-snug tracking-tight">
                  {step.title}
                </h3>
                <p className="ie-lh-text-secondary mt-2 text-sm leading-relaxed">{step.description}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
