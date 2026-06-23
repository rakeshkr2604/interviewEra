import Link from 'next/link'
import type { ContentToolLink } from '@/lib/seo/content/types'
import { cn } from '@/lib/utils'

export function ContentRecommendedTools({
  tools,
  className,
}: {
  tools: readonly ContentToolLink[]
  className?: string
}) {
  if (!tools.length) return null

  return (
    <section className={cn('ie-content-relationships__block', className)} aria-label="Recommended tools">
      <h2 className="ie-content-relationships__heading">Recommended tools</h2>
      <ul className="ie-content-relationships__tools" role="list">
        {tools.map((tool) => (
          <li key={tool.href + tool.label}>
            <Link href={tool.href} className="ie-content-relationships__tool-card">
              <span className="ie-content-relationships__tool-label">{tool.label}</span>
              {tool.description ? (
                <span className="ie-content-relationships__tool-desc">{tool.description}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
