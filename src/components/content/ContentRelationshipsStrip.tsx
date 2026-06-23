'use client'

import { usePathname } from 'next/navigation'
import { ContentRelationshipsSection } from '@/components/content/ContentRelationshipsSection'

/** Path-aware relationships strip for blog layout — SSR includes links from registry metadata. */
export function ContentRelationshipsStrip() {
  const pathname = usePathname()
  if (!pathname) return null
  return <ContentRelationshipsSection path={pathname} />
}
