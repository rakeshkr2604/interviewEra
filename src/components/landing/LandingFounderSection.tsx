import { StartFreeCtaLink } from '@/components/analytics/StartFreeCtaLink';
import { siteOrganizationStructured } from '@/lib/seo/metadata';
import {
  LANDING_HOME_EYEBROW,
  LANDING_HOME_HEADER_BLOCK,
  LANDING_HOME_HEADING,
  LANDING_HOME_SECTION,
  LANDING_PAGE_CONTAINER,
} from '@/lib/landing/container';
import { cn } from '@/lib/utils';

const FOUNDER = siteOrganizationStructured.founder;

/**
 * Homepage founder / trust strip — personal, no invented metrics.
 * Facts aligned with /about; MCA / placement-season framing per product direction.
 */
export function LandingFounderSection() {
  return (
    <section className={LANDING_HOME_SECTION} aria-labelledby="landing-founder-heading">
      <div className={LANDING_PAGE_CONTAINER}>
        <div className={LANDING_HOME_HEADER_BLOCK}>
          <span className={LANDING_HOME_EYEBROW}>Built by someone in the same race</span>
          <h2 id="landing-founder-heading" className={LANDING_HOME_HEADING}>
            Not a faceless tool — a practice system from the placement trenches
          </h2>
        </div>

        <div
          className={cn(
            'ie-lh-surface-88 mx-auto mt-10 max-w-3xl rounded-[22px] border-2 p-6 sm:mt-12 sm:p-8 lg:rounded-3xl',
          )}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <div
              className="ie-lh-icon-tile-ring flex size-14 shrink-0 items-center justify-center rounded-2xl text-base font-bold sm:size-16"
              aria-hidden
            >
              RK
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="ie-lh-text-primary text-base font-bold sm:text-lg">{FOUNDER.name}</p>
                <span className="ie-lh-pill-accent rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide">
                  {FOUNDER.jobTitle}
                </span>
              </div>

              <p className="ie-lh-text-secondary text-sm leading-[1.8] sm:text-base">
                InterviewEra is a solo-built product. I built it as someone who has navigated the same
                Indian campus and early-career job market myself — so the gaps it closes are ones I
                felt in practice, not slide decks.
              </p>
              <p className="ie-lh-text-secondary text-sm leading-[1.8] sm:text-base">
                Most prep stays unstructured: long chat threads, vague encouragement, no score band.
                Panels still have to place you. I built InterviewEra so you can upload a resume, sit a
                scored mock that references your real work, and leave knowing exactly what to fix next.
              </p>
              <p className="ie-lh-text-secondary text-sm leading-[1.8] sm:text-base">
                The goal is simple: walk into Day 1 with a practice loop you can repeat — not hope the
                panel fills in the gaps for you.
              </p>

              <div className="pt-2">
                <StartFreeCtaLink
                  section="landing_founder"
                  ctaText="Start Free"
                  href="/signup"
                  className="ie-lh-bg-accent ie-lh-text-on-accent landing-cta-lift inline-flex min-h-[44px] items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold sm:text-base"
                >
                  Start Free — run your first mock
                </StartFreeCtaLink>
                <p className="ie-lh-text-muted mt-3 text-xs">
                  More on the product and mission →{' '}
                  <a href="/about" className="ie-lh-text-link font-medium underline-offset-2 hover:underline">
                    About InterviewEra
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
