import { ContentLearnNext } from '@/components/content/ContentLearnNext'
import { ContentRecommendedTools } from '@/components/content/ContentRecommendedTools'
import { ContentRelatedConcepts } from '@/components/content/ContentRelatedConcepts'
import { getContentRelationships } from '@/lib/seo/content/relationships'
import { cn } from '@/lib/utils'

export function ContentRelationshipsSection({
  path,
  className,
}: {
  path: string
  className?: string
}) {
  const data = getContentRelationships(path)
  if (!data) return null

  const hasConcepts = data.relatedConcepts.length > 0
  const hasLearnNext = data.learnNext.length > 0
  const hasTools = data.recommendedTools.length > 0
  if (!hasConcepts && !hasLearnNext && !hasTools) return null

  return (
    <section
      className={cn('ie-content-relationships border-t py-10 sm:py-12', className)}
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 55%, transparent)',
      }}
      aria-label="Explore related topics"
    >
      <div className="ie-content-relationships__inner mx-auto w-full max-w-6xl px-4 sm:px-5">
        {hasConcepts ? <ContentRelatedConcepts concepts={data.relatedConcepts} /> : null}
        {hasLearnNext ? <ContentLearnNext steps={data.learnNext} className={hasConcepts ? 'mt-8' : undefined} /> : null}
        {hasTools ? (
          <ContentRecommendedTools
            tools={data.recommendedTools}
            className={hasConcepts || hasLearnNext ? 'mt-8' : undefined}
          />
        ) : null}
      </div>
    </section>
  )
}
