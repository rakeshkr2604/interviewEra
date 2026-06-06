'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { ContentCard } from '@/components/content/ContentCard'
import type { ContentCategory, ContentEntry } from '@/lib/seo/content/types'
import { CONTENT_CATEGORIES } from '@/lib/seo/content/types'
import { cn } from '@/lib/utils'

interface BlogIndexExplorerProps {
  allPosts: ContentEntry[]
  featured: ContentEntry[]
  latest: ContentEntry[]
  popular: ContentEntry[]
  recentlyUpdated: ContentEntry[]
}

export function BlogIndexExplorer({
  allPosts,
  featured,
  latest,
  popular,
  recentlyUpdated,
}: BlogIndexExplorerProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ContentCategory | 'All'>('All')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allPosts.filter((post) => {
      const matchesCategory = category === 'All' || post.category === category
      if (!matchesCategory) return false
      if (!q) return true
      return (
        post.title.toLowerCase().includes(q) ||
        post.description.toLowerCase().includes(q) ||
        post.tags.some((t) => t.includes(q))
      )
    })
  }, [allPosts, query, category])

  return (
    <div className="space-y-12 sm:space-y-16 lg:space-y-20">
      <div className="mx-auto max-w-2xl space-y-4">
        <label className="relative block">
          <span className="sr-only">Search articles</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guides, topics, companies…"
            className="h-12 w-full rounded-2xl border-2 pl-11 pr-4 text-sm outline-none transition-colors focus:border-(--accent-primary) sm:h-14 sm:text-base"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 90%, transparent)',
              color: 'var(--text-primary)',
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          <FilterChip active={category === 'All'} onClick={() => setCategory('All')}>
            All
          </FilterChip>
          {CONTENT_CATEGORIES.map((cat) => (
            <FilterChip key={cat} active={category === cat} onClick={() => setCategory(cat)}>
              {cat}
            </FilterChip>
          ))}
        </div>
      </div>

      {featured.length > 0 ? (
        <Section title="Featured Guides" subtitle="Start here — our most complete prep hubs and playbooks.">
          <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 xl:grid-cols-3 xl:gap-7">
            {featured.map((entry) => (
              <li key={entry.id} className="p-0">
                <ContentCard entry={entry} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
        <SidebarList title="Latest Articles" items={latest} />
        <SidebarList title="Popular Articles" items={popular} />
        <SidebarList title="Recently Updated" items={recentlyUpdated} />
      </div>

      <Section
        title={query || category !== 'All' ? 'Matching Articles' : 'All Articles'}
        subtitle={
          filtered.length === allPosts.length
            ? `${allPosts.length} guides and articles`
            : `${filtered.length} of ${allPosts.length} guides match your filters`
        }
      >
        {filtered.length === 0 ? (
          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No articles match your search. Try a different keyword or category.
          </p>
        ) : (
          <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 xl:grid-cols-3 xl:gap-7">
            {filtered.map((entry) => (
              <li key={entry.id} className="p-0">
                <ContentCard entry={entry} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <header className="mb-6 sm:mb-8">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        {subtitle ? (
          <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  )
}

function SidebarList({ title, items }: { title: string; items: ContentEntry[] }) {
  return (
    <aside
      className="rounded-2xl border p-5 sm:p-6"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 85%, transparent)',
      }}
    >
      <h3 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
        {title}
      </h3>
      <ul className="mt-4 space-y-3 p-0 list-none" role="list">
        {items.map((entry) => (
          <li key={entry.id} className="p-0">
            <a
              href={entry.path}
              className="block text-sm font-medium leading-snug transition-colors hover:text-(--accent-primary)"
              style={{ color: 'var(--text-primary)' }}
            >
              {entry.title.replace(/ \(2026\)$/, '')}
            </a>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {entry.category}
              {entry.readTime ? ` · ${entry.readTime}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </aside>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm',
        active ? 'border-(--accent-primary) text-(--accent-primary)' : '',
      )}
      style={{
        borderColor: active ? undefined : 'var(--card-border)',
        background: active
          ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)'
          : 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
        color: active ? undefined : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  )
}
