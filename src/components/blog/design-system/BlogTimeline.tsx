import type { BlogTimelineStep } from '@/components/blog/design-system/types'

type BlogTimelineProps = {
  steps: readonly BlogTimelineStep[]
  ariaLabel?: string
}

export function BlogTimeline({ steps, ariaLabel = 'Timeline' }: BlogTimelineProps) {
  return (
    <ol className="ie-blog-ds-timeline" aria-label={ariaLabel}>
      {steps.map((step, index) => (
        <li key={`${step.title}-${index}`} className="ie-blog-ds-timeline__item">
          <span className="ie-blog-ds-timeline__node" aria-hidden>
            <span className="ie-blog-ds-timeline__dot" />
            {index < steps.length - 1 ? <span className="ie-blog-ds-timeline__line" /> : null}
          </span>
          <div className="ie-blog-ds-timeline__content">
            <p className="ie-blog-ds-timeline__title">{step.title}</p>
            {step.description ? (
              <p className="ie-blog-ds-timeline__desc">{step.description}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
