import { getAllContentEntries, getContentByPath } from '@/lib/seo/content/registry'
import type { ContentEntry } from '@/lib/seo/content/types'
import type { SeoTextLink } from '@/lib/seo/internal-links'

/** Path → related tag weights for automatic related-guide matching. */
const RELATED_TAG_MAP: Record<string, readonly string[]> = {
  '/interview-questions/android-developer': ['android-developer', 'kotlin', 'java-developer', 'software-engineer', 'dsa'],
  '/interview-questions/companies/amazon/software-engineer': ['amazon', 'software-engineer', 'dsa', 'star', 'leadership-principles'],
  '/interview-questions/companies/microsoft/software-engineer': ['microsoft', 'software-engineer', 'dsa', 'system-design'],
  '/interview-questions/companies/freshworks/frontend-developer': ['freshworks', 'frontend-developer', 'react', 'javascript'],
  '/interview-questions/companies/infosys/java-developer': ['infosys', 'java-developer', 'spring'],
  '/interview-questions/companies/infosys/software-engineer': ['infosys', 'software-engineer', 'dsa'],
  '/interview-questions/companies/wipro/data-analyst': ['wipro', 'data-analyst', 'sql', 'python', 'nlth', 'analytics'],
  '/interview-questions/companies/wipro/qa-engineer': ['wipro', 'qa-engineer', 'selenium', 'manual-testing', 'nlth', 'automation'],
  '/interview-questions/companies/wipro/software-engineer': ['wipro', 'software-engineer', 'dsa', 'oop', 'nlth', 'coding'],
  '/interview-questions/companies/wipro/java-developer': ['wipro', 'java-developer', 'spring', 'oop', 'nlth', 'core-java'],
  '/interview-questions/software-engineer': ['software-engineer', 'dsa', 'system-design'],
  '/interview-questions/frontend-developer': ['frontend-developer', 'react', 'javascript'],
  '/interview-questions/java-developer': ['java-developer', 'spring', 'oop'],
  '/interview-questions/business-analyst': ['business-analyst', 'sql', 'hr'],
  '/blog/top-dsa-interview-questions': ['dsa', 'software-engineer', 'coding', 'leetcode'],
  '/blog/how-to-prepare-for-placement-interviews': ['placement', 'campus', 'fresher', 'dsa'],
  '/blog/what-is-star-method-with-examples': ['star', 'behavioral', 'hr', 'amazon'],
  '/blog/hr-interview-answer-tips-and-tricks': ['hr', 'behavioral', 'star'],
  '/blog/top-interview-questions-for-software-engineers': ['software-engineer', 'dsa'],
  '/blog/overcome-interview-anxiety-mock-interviews': ['anxiety', 'mock-interview', 'behavioral'],
}

function scoreRelated(entry: ContentEntry, tags: readonly string[], currentPath: string): number {
  if (entry.path === currentPath) return -1
  let score = 0
  for (const tag of tags) {
    if (entry.tags.includes(tag)) score += 2
    if (entry.featured && entry.tags.some((t) => tags.includes(t))) score += 1
  }
  if (entry.popular) score += 0.5
  return score
}

export function getRelatedContent(path: string, limit = 6): ContentEntry[] {
  const current = getContentByPath(path)
  const tags = RELATED_TAG_MAP[path] ?? current?.tags ?? []

  return getAllContentEntries()
    .map((entry) => ({ entry, score: scoreRelated(entry, tags, path) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.entry.lastModified.localeCompare(a.entry.lastModified))
    .slice(0, limit)
    .map(({ entry }) => entry)
}

export function getRelatedLinks(path: string, limit = 6): readonly SeoTextLink[] {
  return getRelatedContent(path, limit).map((entry) => ({
    href: entry.path,
    label: entry.title.replace(/ \(2026\)$/, '').replace(/ Interview Questions$/, ' Questions'),
  }))
}

/** Precomputed map for client-side blog related strip (hydrates from same logic at build). */
export function buildRelatedLinksMap(): Record<string, readonly SeoTextLink[]> {
  const paths = getAllContentEntries().map((e) => e.path)
  const unique = [...new Set([...Object.keys(RELATED_TAG_MAP), ...paths])]
  return Object.fromEntries(unique.map((path) => [path, getRelatedLinks(path, 6)]))
}

export function buildRelatedContentMap(): Record<string, readonly ContentEntry[]> {
  const paths = getAllContentEntries().map((e) => e.path)
  const unique = [...new Set([...Object.keys(RELATED_TAG_MAP), ...paths])]
  return Object.fromEntries(unique.map((path) => [path, getRelatedContent(path, 6)]))
}

export const RELATED_LINKS_BY_PATH = buildRelatedLinksMap()
export const RELATED_CONTENT_BY_PATH = buildRelatedContentMap()
