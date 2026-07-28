import { GOOGLE_APPRENTICESHIP_TIMELINE_STEPS } from '@/lib/seo/content/google-apprenticeship-hub'

export function GoogleApprenticeshipTimelineVisual() {
  return (
    <figure className="ie-ga-timeline-visual" aria-labelledby="ga-timeline-title">
      <div className="ie-ga-timeline-visual__inner">
        <p id="ga-timeline-title" className="ie-ga-timeline-visual__title">
          Application to joining — typical flow
        </p>
        <ol className="ie-ga-timeline-flow">
          {GOOGLE_APPRENTICESHIP_TIMELINE_STEPS.map((step, index) => (
            <li key={step.label} className="ie-ga-timeline-flow__item">
              <span className="ie-ga-timeline-flow__num" aria-hidden>
                {index + 1}
              </span>
              <div className="ie-ga-timeline-flow__body">
                <strong>{step.label}</strong>
                <span>{step.detail}</span>
              </div>
              {index < GOOGLE_APPRENTICESHIP_TIMELINE_STEPS.length - 1 ? (
                <span className="ie-ga-timeline-flow__arrow" aria-hidden>
                  ↓
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="ie-ga-timeline-visual__caption">
        Google Apprenticeship selection process flow — application through joining March or June 2027
      </figcaption>
    </figure>
  )
}
