import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getContentByPath } from '@/lib/seo/content/registry'
import { canonicalUrl } from '@/lib/seo/site-url'
import { buildPagesSitemapEntries } from '@/lib/seo/sitemap/registry'
import { PDF_RESOURCES } from '@/lib/prep/pdf-resources'
import { PREP_GUIDES } from '@/lib/prep/guides'

describe('preparation guides are discoverable', () => {
  it('registers each guide in the content index and the pages sitemap', () => {
    const urls = new Set(buildPagesSitemapEntries(new Date()).map((entry) => entry.url))
    for (const guide of Object.values(PREP_GUIDES)) {
      expect(getContentByPath(guide.path)?.type).toBe('prep-guide')
      expect(urls.has(canonicalUrl(guide.path))).toBe(true)
    }
    expect(urls.has(canonicalUrl('/resources'))).toBe(true)
  })
})

describe('PDF manifest', () => {
  it('only links files that exist in public/', () => {
    expect(PDF_RESOURCES).toHaveLength(7)
    const hrefs = new Set<string>()
    for (const file of PDF_RESOURCES) {
      expect(file.href.startsWith('/resources/guides/')).toBe(true)
      expect(file.href).toBe(`/resources/guides/${file.filename}`)
      expect(hrefs.has(file.href)).toBe(false)
      hrefs.add(file.href)
      expect(existsSync(`public${file.href}`)).toBe(true)
    }
  })
})
