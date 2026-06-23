import Link from 'next/link'
import type { AgenticRelatedGuide } from '@/lib/seo/blog/agentic-ai-hub-related'

export function AgenticHubRelatedGuides({
  guides,
  title = 'Related guides',
}: {
  guides: readonly AgenticRelatedGuide[]
  title?: string
}) {
  if (!guides.length) return null
  return (
    <aside className="ie-agentic-related-guides" aria-label={title}>
      <p className="ie-agentic-related-guides__title">{title}</p>
      <div className="ie-agentic-related-guides__grid">
        {guides.map((g) => (
          <Link key={g.href + g.label} href={g.href} className="ie-agentic-related-guides__card">
            <span className="ie-agentic-related-guides__label">{g.label}</span>
            <span className="ie-agentic-related-guides__teaser">{g.teaser}</span>
          </Link>
        ))}
      </div>
    </aside>
  )
}
