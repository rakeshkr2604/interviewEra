import { Reveal } from '@/components/landing/landing-home-shared';
import { HOME_PROBLEM } from '@/lib/landing/home-content';
import {
  LANDING_HOME_EYEBROW,
  LANDING_HOME_HEADER_BLOCK,
  LANDING_HOME_HEADING,
  LANDING_HOME_SUBHEAD,
  LANDING_PAGE_CONTAINER,
} from '@/lib/landing/container';
import { cn } from '@/lib/utils';
import '@/components/landing/LandingHomeSections.css';

/**
 * Homepage problem narrative — three candidate pain points, server-rendered.
 * No statistics: every line describes a situation, not an invented number.
 */
export function LandingProblemSection() {
  return (
    <section
      className="landing-problem-section relative px-4 py-16 sm:px-5 sm:py-20 lg:py-24"
      aria-labelledby="landing-problem-heading"
    >
      <div className={LANDING_PAGE_CONTAINER}>
        <Reveal className={cn(LANDING_HOME_HEADER_BLOCK, 'max-w-4xl')}>
          <span className={LANDING_HOME_EYEBROW}>{HOME_PROBLEM.eyebrow}</span>
          <h2 id="landing-problem-heading" className={LANDING_HOME_HEADING}>
            {HOME_PROBLEM.title}
          </h2>
          <p className={LANDING_HOME_SUBHEAD}>{HOME_PROBLEM.subtitle}</p>
        </Reveal>

        <ol className="landing-problem-grid mx-auto mt-10 grid max-w-[70rem] list-none gap-4 p-0 sm:mt-12 md:grid-cols-3 md:gap-0">
          {HOME_PROBLEM.items.map((item, index) => (
            <li key={item.id} className="landing-problem-grid__item">
              <Reveal delay={index * 0.08} className="h-full">
                <article className="landing-problem-card flex h-full flex-col">
                  <span className="landing-problem-card__index" aria-hidden>
                    {item.label}
                  </span>
                  <h3 className="landing-problem-card__title">{item.title}</h3>
                  <p className="landing-problem-card__body">{item.body}</p>
                  <p className="landing-problem-card__symptom">
                    <span className="sr-only">For example: </span>
                    {item.symptom}
                  </p>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
