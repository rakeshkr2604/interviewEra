/**
 * Full-site SEO indexing audit — run: npx tsx scripts/full-seo-audit.ts
 * Outputs: scripts/seo-audit-report.json + console summary
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ROLES,
  COMPANIES,
  SKILLS,
  STAR_TOPICS,
  HIGH_VALUE_INTERSECTIONS,
  roleQuestionsPath,
  companyQuestionsPath,
  intersectionQuestionsPath,
  skillQuestionsPath,
  questionsHubPath,
  toolVariantRolePath,
  toolVariantCompanyPath,
  toolAtsRolePath,
  toolStarTopicPath,
  getCompanyBySlug,
  getRoleBySlug,
} from '../src/lib/seo/programmatic'
import {
  isRoleIndexable,
  isCompanyIndexable,
  isSkillIndexable,
  isIntersectionIndexable,
} from '../src/lib/seo/programmatic/indexing'
import {
  buildAllIndexableUrls,
  STATIC_MARKETING_ROUTES,
  BLOG_POST_ROUTES,
  TOOL_LANDING_ROUTES,
} from '../src/lib/seo/sitemap/registry'
import { ROBOTS_DISALLOW_PREFIXES } from '../src/lib/seo/robots-rules'
import { getCanonicalSiteOrigin } from '../src/lib/seo/site-url'

const ORIGIN = getCanonicalSiteOrigin()
const CONCURRENCY = 8
const TITLE_MAX = 60
const DESC_MAX = 160

type PageReport = {
  url: string
  path: string
  statusCode: number
  canonical: string | null
  indexable: boolean
  reason: string
  metaRobots: string | null
  xRobotsTag: string | null
  robotsTxtBlocked: boolean
  title: string | null
  titleLength: number
  metaDescription: string | null
  descLength: number
  ogTitle: string | null
  ogDescription: string | null
  structuredDataCount: number
  hreflangCount: number
  internalLinks: number
  externalLinks: number
  redirectChain: string[]
  bingFriendly: boolean
  bingIssues: string[]
  inSitemap: boolean
  expectedIndexable: boolean
  contentLength: number
  hasH1: boolean
}

function pathFromUrl(url: string): string {
  return new URL(url).pathname
}

function isRobotsTxtBlocked(path: string): boolean {
  return ROBOTS_DISALLOW_PREFIXES.some(
    (prefix) => path === prefix.replace(/\/$/, '') || path.startsWith(prefix),
  )
}

function discoverAllPaths(): { path: string; expectedIndexable: boolean; category: string }[] {
  const seen = new Set<string>()
  const entries: { path: string; expectedIndexable: boolean; category: string }[] = []

  function add(path: string, expectedIndexable: boolean, category: string) {
    if (seen.has(path)) return
    seen.add(path)
    entries.push({ path, expectedIndexable, category })
  }

  for (const r of STATIC_MARKETING_ROUTES) add(r.path, true, 'marketing')
  for (const r of BLOG_POST_ROUTES) add(r.path, true, 'blog')
  for (const r of TOOL_LANDING_ROUTES) add(r.path, true, 'tools')

  add(questionsHubPath(), true, 'questions-hub')

  for (const role of ROLES) {
    add(roleQuestionsPath(role.slug), isRoleIndexable(role), 'role')
    add(toolVariantRolePath(role.slug), true, 'tool-qgen-role')
    add(toolAtsRolePath(role.slug), true, 'tool-ats-role')
  }

  for (const company of COMPANIES) {
    add(companyQuestionsPath(company.slug), isCompanyIndexable(company), 'company')
    add(toolVariantCompanyPath(company.slug), true, 'tool-qgen-company')
  }

  for (const pair of HIGH_VALUE_INTERSECTIONS) {
    const company = getCompanyBySlug(pair.company)
    const role = getRoleBySlug(pair.role)
    if (!company || !role) continue
    add(
      intersectionQuestionsPath(pair.company, pair.role),
      isIntersectionIndexable(company, role),
      'intersection',
    )
  }

  for (const skill of SKILLS) {
    add(skillQuestionsPath(skill.slug), isSkillIndexable(skill), 'skill')
  }

  for (const topic of STAR_TOPICS) {
    add(toolStarTopicPath(topic.slug), true, 'tool-star')
  }

  // Auth / private — should NOT be indexable
  const privatePaths = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/college/signup',
    '/dashboard',
    '/onboarding',
    '/history',
    '/analytics',
    '/settings',
    '/upgrade',
    '/feedback',
    '/interview/new',
    '/admin/dashboard',
    '/college/dashboard',
    '/tools/question-generator/results',
    '/tools/ats-checker/results',
    '/tools/star-builder/results',
    '/join',
    '/college',
    '/open/badges',
  ]
  for (const p of privatePaths) {
    const expected =
      p === '/signup' ? true : p === '/college' ? true : false
    add(p, expected, 'auth-private')
  }

  return entries
}

function extractMeta(html: string, name: string): string | null {
  const re = new RegExp(
    `<meta\\s+(?:[^>]*\\s)?(?:name|property)=["']${name}["']\\s+content=["']([^"']*)["']|<meta\\s+content=["']([^"']*)["']\\s+(?:[^>]*\\s)?(?:name|property)=["']${name}["']`,
    'i',
  )
  const m = html.match(re)
  return m ? (m[1] ?? m[2] ?? null) : null
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return m ? m[1].trim() : null
}

function extractCanonical(html: string): string | null {
  const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)
  return m ? m[1] : null
}

function countLinks(html: string, origin: string): { internal: number; external: number } {
  const hrefRe = /href=["']([^"'#]+)["']/gi
  let internal = 0
  let external = 0
  let m: RegExpExecArray | null
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1]
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue
    if (href.startsWith('/') || href.startsWith(origin)) internal++
    else if (href.startsWith('http')) external++
  }
  return { internal, external }
}

function countJsonLd(html: string): number {
  return (html.match(/type=["']application\/ld\+json["']/gi) ?? []).length
}

function countHreflang(html: string): number {
  return (html.match(/rel=["']alternate["'][^>]*hreflang/gi) ?? []).length
}

function hasH1(html: string): boolean {
  return /<h1[\s>]/i.test(html)
}

function assessBingFriendly(r: Omit<PageReport, 'bingFriendly' | 'bingIssues'>): {
  bingFriendly: boolean
  bingIssues: string[]
} {
  const issues: string[] = []
  if (r.statusCode !== 200) issues.push(`HTTP ${r.statusCode}`)
  if (r.robotsTxtBlocked && r.expectedIndexable) issues.push('Blocked by robots.txt but expected indexable')
  if (r.metaRobots?.includes('noindex') && r.expectedIndexable) issues.push('noindex but expected indexable')
  if (!r.metaRobots?.includes('noindex') && !r.expectedIndexable && r.statusCode === 200)
    issues.push('Missing noindex on intentionally non-indexable page')
  if (r.expectedIndexable && !r.canonical) issues.push('Missing canonical')
  if (r.expectedIndexable && r.canonical && pathFromUrl(r.canonical) !== r.path)
    issues.push(`Canonical mismatch: ${r.canonical}`)
  if (r.expectedIndexable && r.titleLength > TITLE_MAX) issues.push(`Title too long (${r.titleLength} > ${TITLE_MAX})`)
  if (r.expectedIndexable && r.descLength > DESC_MAX)
    issues.push(`Description too long (${r.descLength} > ${DESC_MAX})`)
  if (r.expectedIndexable && !r.title) issues.push('Missing title')
  if (r.expectedIndexable && !r.metaDescription) issues.push('Missing meta description')
  if (r.expectedIndexable && r.structuredDataCount === 0) issues.push('No JSON-LD structured data')
  if (r.expectedIndexable && !r.hasH1) issues.push('Missing H1')
  if (r.expectedIndexable && r.contentLength < 500) issues.push('Thin content (<500 chars visible text)')
  if (r.expectedIndexable && !r.ogTitle) issues.push('Missing og:title')
  if (r.expectedIndexable && r.inSitemap === false) issues.push('Indexable but missing from sitemap')
  if (!r.expectedIndexable && r.inSitemap) issues.push('In sitemap but should be noindex')
  return { bingFriendly: issues.length === 0, bingIssues: issues }
}

async function fetchPage(url: string): Promise<{
  statusCode: number
  html: string
  xRobotsTag: string | null
  redirectChain: string[]
}> {
  const redirectChain: string[] = []
  let current = url
  for (let i = 0; i < 5; i++) {
    const res = await fetch(current, {
      redirect: 'manual',
      headers: { 'User-Agent': 'InterviewEra-SEO-Audit/1.0 (Bing-compatible)' },
    })
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) break
      redirectChain.push(`${res.status} → ${loc}`)
      current = loc.startsWith('http') ? loc : new URL(loc, ORIGIN).href
      continue
    }
    const html = await res.text()
    return {
      statusCode: res.status,
      html,
      xRobotsTag: res.headers.get('x-robots-tag'),
      redirectChain,
    }
  }
  return { statusCode: 0, html: '', xRobotsTag: null, redirectChain }
}

async function auditPage(
  path: string,
  expectedIndexable: boolean,
  sitemapUrls: Set<string>,
): Promise<PageReport> {
  const url = `${ORIGIN}${path}`
  const { statusCode, html, xRobotsTag, redirectChain } = await fetchPage(url)
  const title = statusCode === 200 ? extractTitle(html) : null
  const metaDescription = statusCode === 200 ? extractMeta(html, 'description') : null
  const metaRobots = statusCode === 200 ? extractMeta(html, 'robots') : null
  const canonical = statusCode === 200 ? extractCanonical(html) : null
  const ogTitle = statusCode === 200 ? extractMeta(html, 'og:title') : null
  const ogDescription = statusCode === 200 ? extractMeta(html, 'og:description') : null
  const { internal, external } = statusCode === 200 ? countLinks(html, ORIGIN) : { internal: 0, external: 0 }
  const textContent =
    statusCode === 200 ? html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''

  const robotsTxtBlocked = isRobotsTxtBlocked(path)
  const inSitemap = sitemapUrls.has(url)

  let indexable = false
  let reason = ''

  if (robotsTxtBlocked) {
    indexable = false
    reason = 'Blocked by robots.txt'
  } else if (metaRobots?.includes('noindex') || xRobotsTag?.includes('noindex')) {
    indexable = false
    reason = metaRobots?.includes('noindex') ? 'meta robots noindex' : 'X-Robots-Tag noindex'
  } else if (statusCode !== 200) {
    indexable = false
    reason = `HTTP ${statusCode}`
  } else if (canonical && pathFromUrl(canonical) !== path) {
    indexable = false
    reason = `Canonical points elsewhere: ${canonical}`
  } else if (redirectChain.length > 0) {
    indexable = false
    reason = `Redirect: ${redirectChain.join('; ')}`
  } else {
    indexable = true
    reason = 'index, follow (no blockers)'
  }

  const base: Omit<PageReport, 'bingFriendly' | 'bingIssues'> = {
    url,
    path,
    statusCode,
    canonical,
    indexable,
    reason,
    metaRobots,
    xRobotsTag,
    robotsTxtBlocked,
    title,
    titleLength: title?.length ?? 0,
    metaDescription,
    descLength: metaDescription?.length ?? 0,
    ogTitle,
    ogDescription,
    structuredDataCount: statusCode === 200 ? countJsonLd(html) : 0,
    hreflangCount: statusCode === 200 ? countHreflang(html) : 0,
    internalLinks: internal,
    externalLinks: external,
    redirectChain,
    inSitemap,
    expectedIndexable,
    contentLength: textContent.length,
    hasH1: statusCode === 200 ? hasH1(html) : false,
  }

  const { bingFriendly, bingIssues } = assessBingFriendly(base)
  return { ...base, bingFriendly, bingIssues }
}

async function runPool<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = []
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

async function main() {
  console.log('Discovering URLs from codebase...')
  const discovered = discoverAllPaths()
  const sitemapUrls = new Set(
    [...buildAllIndexableUrls()].flatMap((u) => {
      const p = pathFromUrl(u)
      return [u, p === '/' ? `${ORIGIN}/` : u]
    }),
  )

  console.log(`Crawling ${discovered.length} URLs from ${ORIGIN} (concurrency ${CONCURRENCY})...`)
  const reports = await runPool(
    discovered,
    (e) => auditPage(e.path, e.expectedIndexable, sitemapUrls),
    CONCURRENCY,
  )

  const indexable = reports.filter((r) => r.indexable)
  const nonIndexable = reports.filter((r) => !r.indexable)
  const bingIssues = reports.filter((r) => !r.bingFriendly)
  const mismatches = reports.filter(
    (r) => r.expectedIndexable !== r.indexable || r.bingIssues.some((i) => i.includes('expected')),
  )
  const fixRequired = reports.filter((r) => r.bingIssues.length > 0 && r.expectedIndexable)

  const outPath = join(import.meta.dirname ?? __dirname, 'seo-audit-report.json')
  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2))

  console.log('\n=== FULL SITE SEO AUDIT ===\n')
  console.log(`A. Total pages discovered: ${reports.length}`)
  console.log(`B. Total indexable (live): ${indexable.length}`)
  console.log(`C. Total non-indexable (live): ${nonIndexable.length}`)
  console.log(`D. Bing issues (actionable on indexable pages): ${fixRequired.length}`)
  console.log(`E. Expected vs live mismatches: ${mismatches.length}`)
  console.log(`F. Sitemap URLs: ${sitemapUrls.size}`)

  // Sitemap validation
  const sitemapBroken: string[] = []
  for (const u of sitemapUrls) {
    const path = pathFromUrl(u)
    const r = reports.find((x) => x.path === path)
    if (!r) {
      sitemapBroken.push(`${u} — not in crawl set`)
      continue
    }
    if (r.statusCode !== 200) sitemapBroken.push(`${u} — HTTP ${r.statusCode}`)
    if (r.metaRobots?.includes('noindex')) sitemapBroken.push(`${u} — noindex in sitemap`)
    if (r.redirectChain.length) sitemapBroken.push(`${u} — redirect`)
  }

  console.log(`\nSitemap issues: ${sitemapBroken.length}`)
  sitemapBroken.slice(0, 20).forEach((s) => console.log(`  - ${s}`))

  console.log('\n=== FIX REQUIRED (indexable pages with Bing issues) ===\n')
  for (const r of fixRequired.slice(0, 40)) {
    console.log(`| ${r.path} | ${r.indexable ? 'YES' : 'NO'} | ${r.bingIssues.join('; ')} |`)
  }
  if (fixRequired.length > 40) console.log(`... and ${fixRequired.length - 40} more`)

  console.log('\n=== INTENTIONALLY NON-INDEXABLE (sample) ===\n')
  const intentional = reports.filter((r) => !r.expectedIndexable && r.statusCode === 200).slice(0, 15)
  for (const r of intentional) {
    console.log(`${r.path}: ${r.reason} (expected)`)
  }

  console.log(`\nFull report: ${outPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
