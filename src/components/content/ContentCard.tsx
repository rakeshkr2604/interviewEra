import Link from 'next/link'
import { ArrowRight, Clock, Sparkles } from 'lucide-react'
import type { ContentEntry } from '@/lib/seo/content/types'
import { cn } from '@/lib/utils'

interface ContentCardProps {
  entry: ContentEntry
  className?: string
  compact?: boolean
}

export function ContentCard({ entry, className, compact = false }: ContentCardProps) {
  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-[22px] border-2 transition-[transform,box-shadow] duration-200 lg:rounded-3xl',
        'hover:-translate-y-1 hover:shadow-xl',
        className,
      )}
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
        boxShadow: 'var(--card-shadow), 0 0 48px color-mix(in srgb, var(--accent-primary) 8%, transparent)',
      }}
    >
      <div
        className={cn('border-b', compact ? 'px-4 py-3 sm:px-5' : 'px-5 py-4 sm:px-6 sm:py-5')}
        style={{
          borderColor: 'var(--card-border)',
          background: 'linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 12%, transparent), transparent)',
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px]"
            style={{ color: 'var(--text-muted)' }}
          >
            {entry.category}
          </p>
          {entry.featured ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                color: 'var(--accent-primary)',
              }}
            >
              <Sparkles className="size-3" aria-hidden />
              Featured
            </span>
          ) : null}
        </div>
        <h2
          className={cn(
            'mt-2 font-bold leading-snug tracking-tight',
            compact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl',
          )}
        >
          {entry.title}
        </h2>
      </div>
      <div className={cn('flex flex-1 flex-col', compact ? 'px-4 py-4 sm:px-5' : 'px-5 py-5 sm:px-6 sm:py-6')}>
        <p
          className={cn('flex-1 leading-relaxed', compact ? 'text-sm' : 'text-sm sm:text-base')}
          style={{ color: 'var(--text-secondary)' }}
        >
          {entry.description}
        </p>
        <div
          className={cn(
            'mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 sm:mt-6 sm:pt-5',
            compact ? 'sm:mt-5' : 'sm:mt-8 sm:pt-6',
          )}
          style={{ borderColor: 'var(--card-border)' }}
        >
          {entry.readTime ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium sm:text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              <Clock className="size-3.5 shrink-0" aria-hidden />
              {entry.readTime}
            </span>
          ) : (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated {entry.lastModified}
            </span>
          )}
          <Link
            href={entry.path}
            className="landing-cta-lift inline-flex h-9 items-center justify-center gap-2 rounded-[12px] px-4 text-sm font-semibold text-white sm:h-10 sm:px-5"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
              boxShadow: '0 12px 36px color-mix(in srgb, var(--accent-primary) 28%, transparent)',
            }}
          >
            Read guide
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  )
}
