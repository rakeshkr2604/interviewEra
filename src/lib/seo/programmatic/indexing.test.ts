import { describe, expect, it } from 'vitest'
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import {
  buildQuestionsSitemapEntries,
  buildToolsSitemapEntries,
} from '@/lib/seo/sitemap/registry'
import { getCompanyBySlug, getRoleBySlug, HIGH_VALUE_INTERSECTIONS, ROLES } from './index'
import {
  EDITORIAL_INTERSECTION_KEYS,
  isAtsRoleVariantIndexable,
  isIntersectionIndexable,
} from './indexing'
import { intersectionPageMetadata, toolAtsRoleMetadata } from './metadata'

const ORIGIN = getCanonicalSiteOrigin()
const NOW = new Date('2026-10-15T00:00:00Z')

function robotsIndex(meta: ReturnType<typeof intersectionPageMetadata>): boolean | undefined {
  const robots = meta.robots
  return robots && typeof robots === 'object' ? robots.index : undefined
}

describe('intersection indexing gate', () => {
  it('every editorial key is a published intersection that clears the gate', () => {
    for (const key of EDITORIAL_INTERSECTION_KEYS) {
      const [companySlug, roleSlug] = key.split(':')
      expect(
        HIGH_VALUE_INTERSECTIONS.some((p) => p.company === companySlug && p.role === roleSlug),
        key,
      ).toBe(true)
      const company = getCompanyBySlug(companySlug)!
      const role = getRoleBySlug(roleSlug)!
      expect(isIntersectionIndexable(company, role), key).toBe(true)
    }
  })

  it('template intersections are noindex and absent from the questions sitemap', () => {
    const sitemapUrls = new Set(buildQuestionsSitemapEntries(NOW).map((e) => e.url))
    const templated = HIGH_VALUE_INTERSECTIONS.filter(
      (p) => !EDITORIAL_INTERSECTION_KEYS.has(`${p.company}:${p.role}`),
    )
    expect(templated.length).toBeGreaterThan(0)
    for (const pair of templated) {
      const company = getCompanyBySlug(pair.company)!
      const role = getRoleBySlug(pair.role)!
      expect(isIntersectionIndexable(company, role)).toBe(false)
      expect(robotsIndex(intersectionPageMetadata(company, role))).toBe(false)
      expect(sitemapUrls.has(`${ORIGIN}/interview-questions/companies/${pair.company}/${pair.role}`)).toBe(false)
    }
  })

  it('the questions sitemap lists exactly the editorial intersections', () => {
    const intersectionUrls = buildQuestionsSitemapEntries(NOW)
      .map((e) => e.url.replace(`${ORIGIN}/interview-questions/companies/`, ''))
      .filter((p) => p.split('/').length === 2 && !p.startsWith('http'))
      .map((p) => p.replace('/', ':'))
      .sort()
    expect(intersectionUrls).toEqual([...EDITORIAL_INTERSECTION_KEYS].sort())
  })
})

describe('ATS role variant gate', () => {
  it('ATS role variants are noindex,follow and absent from the tools sitemap', () => {
    const toolUrls = buildToolsSitemapEntries(NOW).map((e) => e.url)
    for (const role of ROLES) {
      expect(isAtsRoleVariantIndexable(role)).toBe(false)
      const meta = toolAtsRoleMetadata(role)
      expect(meta.robots).toMatchObject({ index: false, follow: true })
      expect(toolUrls).not.toContain(`${ORIGIN}/tools/ats-checker/${role.slug}`)
    }
    expect(toolUrls).toContain(`${ORIGIN}/tools/ats-checker`)
  })
})
