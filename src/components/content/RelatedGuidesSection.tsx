import Link from 'next/link'
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container'
import { ContentRelationshipsSection } from '@/components/content/ContentRelationshipsSection'
import { getRelatedContent } from '@/lib/seo/content/related'
import { cn } from '@/lib/utils'

interface RelatedGuidesSectionProps {
  path: string
  heading?: string
  limit?: number
  className?: string
}

/** Server-rendered related guides — crawlable internal links at article footers. */
export function RelatedGuidesSection({
  path,
  heading = 'Related Guides',
  limit = 6,
  className,
}: RelatedGuidesSectionProps) {
  const related = getRelatedContent(path, limit)
  if (related.length === 0) return null

  return (
    <>
      <ContentRelationshipsSection path={path} />
      <section
      className={cn('border-t py-10 sm:py-12', className)}
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 55%, transparent)',
      }}
      aria-label={heading}
    >
      <div className={cn(LANDING_PAGE_CONTAINER, 'px-4 sm:px-5')}>
        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {heading}
        </h2>
        <ul className="mt-5 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {related.map((entry) => (
            <li key={entry.path} className="p-0">
              <Link
                href={entry.path}
                className="group flex h-full flex-col rounded-xl border p-4 transition-colors hover:border-(--accent-primary)"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
                }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {entry.category}
                </span>
                <span
                  className="mt-2 text-sm font-semibold leading-snug group-hover:text-(--accent-primary)"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {entry.title}
                </span>
                <span className="mt-2 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {entry.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
    </>
  )
}
