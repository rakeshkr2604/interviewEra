import { describe, expect, it } from 'vitest'
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import {
  buildAllIndexableUrls,
  buildPagesSitemapEntries,
  buildToolsSitemapEntries,
  STATIC_MARKETING_ROUTES,
  TOOL_LANDING_ROUTES,
} from './registry'

const ORIGIN = getCanonicalSiteOrigin()

describe('sitemap lastmod policy', () => {
  it('gives every marketing and tool-landing route an explicit stable lastModified', () => {
    for (const entry of [...STATIC_MARKETING_ROUTES, ...TOOL_LANDING_ROUTES]) {
      expect(entry.lastModified, entry.path).toBeDefined()
      expect(String(entry.lastModified)).not.toMatch(/T\d{2}:\d{2}:\d{2}/)
    }
  })

  it('does not invent request-time lastmod for tool variants', () => {
    const stamped = buildToolsSitemapEntries(new Date('2099-01-01T00:00:00Z'))
    for (const entry of stamped) {
      expect(entry.lastModified).toBeDefined()
      const iso =
        entry.lastModified instanceof Date
          ? entry.lastModified.toISOString()
          : String(entry.lastModified)
      expect(iso.startsWith('2099')).toBe(false)
    }
  })
})

describe('campus/teams sitemap gate', () => {
  it('excludes Coming Soon landings by default (fail-closed)', () => {
    const urls = new Set(buildPagesSitemapEntries().map((e) => e.url))
    expect(urls.has(`${ORIGIN}/campus`)).toBe(false)
    expect(urls.has(`${ORIGIN}/teams`)).toBe(false)
    expect(urls.has(`${ORIGIN}/`)).toBe(true)
  })

  it('includes campus and teams only when landing mode is live', () => {
    const urls = new Set(
      buildPagesSitemapEntries(undefined, {
        campusMode: 'live',
        teamsMode: 'live',
      }).map((e) => e.url),
    )
    expect(urls.has(`${ORIGIN}/campus`)).toBe(true)
    expect(urls.has(`${ORIGIN}/teams`)).toBe(true)
  })

  it('keeps default IndexNow set free of Coming Soon shells', () => {
    const urls = buildAllIndexableUrls()
    expect(urls).not.toContain(`${ORIGIN}/campus`)
    expect(urls).not.toContain(`${ORIGIN}/teams`)
    expect(urls.length).toBe(202)
  })
})
