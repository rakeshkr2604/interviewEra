'use client';

import { ArrowRight } from 'lucide-react';
import { INTERVIEW_TRANSFORMATION_JOURNEY } from '@/lib/landing/interview-transformation-content';
import { Reveal } from '@/components/landing/landing-home-shared';
import { cn } from '@/lib/utils';

export function JourneyVisualization() {
  return (
    <Reveal className="ie-it-journey-reveal">
      <figure className="ie-it-journey" aria-label="From generating answers to improving interview performance">
        <ol className="ie-it-journey__list">
          {INTERVIEW_TRANSFORMATION_JOURNEY.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.id} className="ie-it-journey__item">
                <div className={cn('ie-it-journey__card', `ie-it-journey__card--${step.tone}`)}>
                  <span className="ie-it-journey__icon" aria-hidden>
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="ie-it-journey__step">{step.step}</span>
                  <span className="ie-it-journey__label">{step.label}</span>
                </div>
                {index < INTERVIEW_TRANSFORMATION_JOURNEY.length - 1 ? (
                  <span className="ie-it-journey__arrow" aria-hidden>
                    <ArrowRight className="size-4" />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </figure>
    </Reveal>
  );
}
