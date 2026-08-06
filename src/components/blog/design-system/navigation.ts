import { getBlogContentEntries } from '@/lib/seo/content/registry'
import type { BlogNavLink, BlogRelatedCard } from '@/components/blog/design-system/types'
import { getRelatedContent } from '@/lib/seo/content/related'

/** Adjacent posts by lastModified among blog entries (reusable for any article path). */
export function getAdjacentBlogPosts(path: string): {
  previous: BlogNavLink | null
  next: BlogNavLink | null
} {
  const blogs = [...getBlogContentEntries()].sort((a, b) =>
    b.lastModified.localeCompare(a.lastModified),
  )
  const index = blogs.findIndex((entry) => entry.path === path)
  if (index < 0) return { previous: null, next: null }

  const newer = blogs[index - 1]
  const older = blogs[index + 1]

  return {
    previous: older
      ? { href: older.path, title: older.title, label: 'Previous' }
      : null,
    next: newer ? { href: newer.path, title: newer.title, label: 'Next' } : null,
  }
}

/** Map related registry entries into BlogRelatedCard props. */
export function getBlogRelatedCards(path: string, limit = 3): BlogRelatedCard[] {
  return getRelatedContent(path, limit).map((entry) => ({
    href: entry.path,
    title: entry.title,
    description: entry.description,
    category: entry.category,
    readTime: entry.readTime,
  }))
}
