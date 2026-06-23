import Link from 'next/link'
import type { ContentConceptLink } from '@/lib/seo/content/types'
import { cn } from '@/lib/utils'

export function ContentRelatedConcepts({
  concepts,
  className,
}: {
  concepts: readonly ContentConceptLink[]
  className?: string
}) {
  if (!concepts.length) return null

  return (
    <section className={cn('ie-content-relationships__block', className)} aria-label="Related concepts">
      <h2 className="ie-content-relationships__heading">Related concepts</h2>
      <ul className="ie-content-relationships__chips" role="list">
        {concepts.map((concept) => (
          <li key={concept.href + concept.label}>
            <Link href={concept.href} className="ie-content-relationships__chip">
              {concept.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
