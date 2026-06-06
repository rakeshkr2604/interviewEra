'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container'
import { RELATED_CONTENT_BY_PATH } from '@/lib/seo/content/related'
import { cn } from '@/lib/utils'

interface RelatedGuidesStripProps {
  heading?: string
  className?: string
}

/** Path-aware related guides — SSR initial HTML includes links from precomputed map. */
export function RelatedGuidesStrip({ heading = 'Related Guides', className }: RelatedGuidesStripProps) {
  const pathname = usePathname()
  if (!pathname) return null

  const related = RELATED_CONTENT_BY_PATH[pathname]
  if (!related?.length) return null

  return (
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
  )
}
