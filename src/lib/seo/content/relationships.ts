import { getAllContentEntries } from '@/lib/seo/content/registry'
import type { ContentConceptLink, ContentLearnNextLink, ContentToolLink } from '@/lib/seo/content/types'

export type ContentRelationships = {
  relatedConcepts: readonly ContentConceptLink[]
  learnNext: readonly ContentLearnNextLink[]
  recommendedTools: readonly ContentToolLink[]
}

function buildRelationshipsMap(): Record<string, ContentRelationships> {
  const map: Record<string, ContentRelationships> = {}
  for (const entry of getAllContentEntries()) {
    const hasData =
      (entry.relatedConcepts?.length ?? 0) > 0 ||
      (entry.learnNext?.length ?? 0) > 0 ||
      (entry.recommendedTools?.length ?? 0) > 0
    if (!hasData) continue
    map[entry.path] = {
      relatedConcepts: entry.relatedConcepts ?? [],
      learnNext: entry.learnNext ?? [],
      recommendedTools: entry.recommendedTools ?? [],
    }
  }
  return map
}

export const CONTENT_RELATIONSHIPS_BY_PATH = buildRelationshipsMap()

export function getContentRelationships(path: string): ContentRelationships | null {
  return CONTENT_RELATIONSHIPS_BY_PATH[path] ?? null
}
