import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import type { ContentLearnNextLink } from '@/lib/seo/content/types'
import { cn } from '@/lib/utils'

export function ContentLearnNext({
  steps,
  className,
}: {
  steps: readonly ContentLearnNextLink[]
  className?: string
}) {
  if (!steps.length) return null

  return (
    <section className={cn('ie-content-relationships__block', className)} aria-label="Learn next">
      <h2 className="ie-content-relationships__heading">Learn next</h2>
      <p className="ie-content-relationships__hint">Continue in this order for the fastest path through this topic.</p>
      <ol className="ie-content-relationships__learn-list" role="list">
        {steps.map((step, index) => (
          <li key={step.href + step.label} className="ie-content-relationships__learn-item">
            <Link href={step.href} className="ie-content-relationships__learn-card">
              <span className="ie-content-relationships__learn-step">Step {index + 1}</span>
              <span className="ie-content-relationships__learn-label">{step.label}</span>
              {step.description ? (
                <span className="ie-content-relationships__learn-desc">{step.description}</span>
              ) : null}
            </Link>
            {index < steps.length - 1 ? (
              <ChevronDown className="ie-content-relationships__learn-arrow" aria-hidden />
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}
