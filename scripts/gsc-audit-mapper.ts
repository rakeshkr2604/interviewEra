/**
 * Merge GSC URL exports + production crawl + codebase registry into audit table.
 * Run: npx tsx scripts/gsc-audit-mapper.ts
 *
 * Place GSC CSV exports in scripts/gsc-exports/*.csv (one per issue type).
 * Filename hints: discovered, crawled, redirect, robots, 404, noindex
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildAllIndexableUrls } from '../src/lib/seo/sitemap/registry'
import { ROBOTS_DISALLOW_PREFIXES } from '../src/lib/seo/robots-rules'
import { getCanonicalSiteOrigin } from '../src/lib/seo/site-url'
import {
  ROLES,
  COMPANIES,
  SKILLS,
  STAR_TOPICS,
  HIGH_VALUE_INTERSECTIONS,
  getCompanyBySlug,
  getRoleBySlug,
  getSkillBySlug,
} from '../src/lib/seo/programmatic'
import {
  isRoleIndexable,
  isCompanyIndexable,
  isSkillIndexable,
  isIntersectionIndexable,
} from '../src/lib/seo/programmatic/indexing'

const ROOT = join(import.meta.dirname ?? __dirname)
const GSC_DIR = join(ROOT, 'gsc-exports')
const CRAWL_PATH = join(ROOT, 'seo-audit-report.json')
const OUT_JSON = join(ROOT, 'gsc-audit-report.json')
const OUT_MD = join(ROOT, 'gsc-audit-report.md')

const ORIGIN = getCanonicalSiteOrigin()

type GscIssueCategory =
  | 'Discovered – currently not indexed'
  | 'Crawled – currently not indexed'
  | 'Page with redirect'
  | 'Blocked by robots.txt'
  | 'Not found (404)'
  | 'Excluded by noindex'
  | 'Indexed (inferred)'
  | 'Unknown'

type Priority = 'Critical' | 'High' | 'Medium' | 'Low'

type AuditRow = {
  url: string
  path: string
  issueCategory: GscIssueCategory
  pageType: string
  expectedIndexStatus: 'index' | 'noindex' | 'redirect' | '404'
  shouldIndex: 'Yes' | 'No'
  rootCause: string
  recommendedFix: string
  priority: Priority
  inSitemap: boolean
  statusCode: number | null
  liveIndexable: boolean | null
  source: 'gsc' | 'crawl-inferred' | 'code-confirmed'
}

type CrawlReport = {
  path: string
  statusCode: number
  indexable: boolean
  reason: string
  inSitemap: boolean
  expectedIndexable: boolean
  metaRobots: string | null
  robotsTxtBlocked: boolean
  redirectChain: string[]
  contentLength: number
  internalLinks: number
  bingIssues: string[]
}

function pathFromUrl(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url.startsWith('/') ? url : `/${url}`
  }
}

function normalizeUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${ORIGIN}${p}`
}

function inferIssueFromFilename(name: string): GscIssueCategory | null {
  const n = name.toLowerCase()
  if (n.includes('discovered')) return 'Discovered – currently not indexed'
  if (n.includes('crawled')) return 'Crawled – currently not indexed'
  if (n.includes('redirect')) return 'Page with redirect'
  if (n.includes('robot')) return 'Blocked by robots.txt'
  if (n.includes('404') || n.includes('not-found')) return 'Not found (404)'
  if (n.includes('noindex')) return 'Excluded by noindex'
  return null
}

function parseGscCsv(content: string): string[] {
  const lines = content.split(/\r?\n/).filter(Boolean)
  const urls: string[] = []
  for (const line of lines) {
    const cols = line.split(',')
    for (const col of cols) {
      const trimmed = col.trim().replace(/^"|"$/g, '')
      if (trimmed.startsWith('http') || trimmed.startsWith('/')) {
        urls.push(trimmed.startsWith('http') ? pathFromUrl(trimmed) : trimmed)
      }
    }
  }
  return [...new Set(urls)]
}

function loadGscExports(): Map<string, GscIssueCategory> {
  const map = new Map<string, GscIssueCategory>()
  if (!existsSync(GSC_DIR)) return map
  for (const file of readdirSync(GSC_DIR)) {
    if (!file.endsWith('.csv')) continue
    const category = inferIssueFromFilename(file)
    if (!category) continue
    const paths = parseGscCsv(readFileSync(join(GSC_DIR, file), 'utf8'))
    for (const p of paths) map.set(p, category)
  }
  return map
}

function loadCrawlReports(): Map<string, CrawlReport> {
  const map = new Map<string, CrawlReport>()
  if (!existsSync(CRAWL_PATH)) return map
  const data = JSON.parse(readFileSync(CRAWL_PATH, 'utf8')) as { reports: CrawlReport[] }
  for (const r of data.reports) map.set(r.path, r)
  return map
}

function isRobotsTxtBlocked(path: string): boolean {
  return ROBOTS_DISALLOW_PREFIXES.some(
    (prefix) => path === prefix.replace(/\/$/, '') || path.startsWith(prefix),
  )
}

function classifyPageType(path: string): string {
  if (path === '/') return 'marketing-home'
  if (path.startsWith('/blog/')) return 'blog-post'
  if (path === '/blog') return 'blog-index'
  if (path === '/interview-questions') return 'questions-hub'
  if (path.match(/^\/interview-questions\/companies\/[^/]+\/[^/]+$/)) return 'intersection'
  if (path.match(/^\/interview-questions\/companies\/[^/]+$/)) return 'company'
  if (path.match(/^\/interview-questions\/topics\/[^/]+$/)) return 'skill-topic'
  if (path.match(/^\/interview-questions\/(tcs|solera)$/)) return 'company-pillar'
  if (path.match(/^\/interview-questions\/[^/]+$/)) return 'role'
  if (path.match(/^\/tools\/question-generator\/companies\/[^/]+$/)) return 'tool-qgen-company'
  if (path.match(/^\/tools\/question-generator\/[^/]+$/) && path !== '/tools/question-generator')
    return 'tool-qgen-role'
  if (path.match(/^\/tools\/ats-checker\/[^/]+$/) && path !== '/tools/ats-checker') return 'tool-ats-role'
  if (path.match(/^\/tools\/star-builder\/[^/]+$/) && path !== '/tools/star-builder') return 'tool-star-topic'
  if (path.startsWith('/tools/')) return 'tool-landing'
  if (
    [
      '/privacy',
      '/terms',
      '/refund',
      '/about',
      '/pricing',
      '/campus',
      '/college',
      '/help',
      '/help-center',
      '/resources',
      '/how-it-works',
      '/signup',
      '/interviewera',
    ].includes(path)
  )
    return 'marketing-static'
  if (path.startsWith('/dashboard') || path.startsWith('/onboarding')) return 'app-private'
  if (path.includes('/results')) return 'tool-results'
  return 'other'
}

function expectedIndexForPath(path: string): 'index' | 'noindex' {
  const topicMatch = path.match(/^\/interview-questions\/topics\/([^/]+)$/)
  if (topicMatch) {
    const skill = getSkillBySlug(topicMatch[1])
    return skill && isSkillIndexable(skill) ? 'index' : 'noindex'
  }
  const ixMatch = path.match(/^\/interview-questions\/companies\/([^/]+)\/([^/]+)$/)
  if (ixMatch) {
    const company = getCompanyBySlug(ixMatch[1])
    const role = getRoleBySlug(ixMatch[2])
    return company && role && isIntersectionIndexable(company, role) ? 'index' : 'noindex'
  }
  const coMatch = path.match(/^\/interview-questions\/companies\/([^/]+)$/)
  if (coMatch) {
    const company = getCompanyBySlug(coMatch[1])
    return company && isCompanyIndexable(company) ? 'index' : 'noindex'
  }
  const roleMatch = path.match(/^\/interview-questions\/([^/]+)$/)
  if (roleMatch && path !== '/interview-questions') {
    const role = getRoleBySlug(roleMatch[1])
    if (role) return isRoleIndexable(role) ? 'index' : 'noindex'
  }
  if (isRobotsTxtBlocked(path) || path.includes('/results') || path === '/join' || path.startsWith('/open/badges'))
    return 'noindex'
  const sitemap = new Set(buildAllIndexableUrls().map((u) => pathFromUrl(u)))
  return sitemap.has(path) ? 'index' : 'noindex'
}

/** Code-confirmed broken/redirect URLs not in crawl set */
const CODE_CONFIRMED: Record<
  string,
  { issue: GscIssueCategory; rootCause: string; fix: string; priority: Priority }
> = {
  '/interview-questions/topics/spring': {
    issue: 'Not found (404)',
    rootCause: 'Invalid skill slug — registry uses spring-boot, not spring',
    fix: 'Fix internal links in wipro-java-hub → /topics/spring-boot',
    priority: 'Critical',
  },
  '/interview-questions/topics/css': {
    issue: 'Not found (404)',
    rootCause: 'Invalid skill slug — registry uses html-css, not css',
    fix: 'Fix internal links in freshworks-fe-hub → /topics/html-css',
    priority: 'Critical',
  },
  '/interview-questions/topics/dsa': {
    issue: 'Not found (404)',
    rootCause: 'No dsa skill slug — use algorithms or DSA blog hub',
    fix: 'Fix internal links in solera/wipro hubs → /topics/algorithms',
    priority: 'Critical',
  },
  '/interview-questions/companies/tcs': {
    issue: 'Page with redirect',
    rootCause: '301 to pillar /interview-questions/tcs — internal link in solera-hub',
    fix: 'Update href to /interview-questions/tcs',
    priority: 'High',
  },
  '/interview-questions/topics/react-js': {
    issue: 'Page with redirect',
    rootCause: '301 to /topics/react — legacy slug redirect in next.config',
    fix: 'Leave redirect; no internal links point to react-js',
    priority: 'Low',
  },
}

function inferDiscoveredCandidates(sitemapPaths: Set<string>, crawl: Map<string, CrawlReport>): string[] {
  const indexed = [...crawl.values()].filter((r) => r.indexable && r.inSitemap).map((r) => r.path)
  const indexedSet = new Set(indexed)
  return [...sitemapPaths].filter((p) => !indexedSet.has(p) && expectedIndexForPath(p) === 'index')
}

function buildRow(
  path: string,
  issueCategory: GscIssueCategory,
  crawl: Map<string, CrawlReport>,
  sitemapPaths: Set<string>,
  source: AuditRow['source'],
): AuditRow {
  const confirmed = CODE_CONFIRMED[path]
  const cr = crawl.get(path)
  const pageType = classifyPageType(path)
  const expected = confirmed
    ? confirmed.issue === 'Not found (404)'
      ? '404'
      : confirmed.issue === 'Page with redirect'
        ? 'redirect'
        : expectedIndexForPath(path) === 'index'
          ? 'index'
          : 'noindex'
    : cr?.statusCode === 404
      ? '404'
      : cr?.redirectChain?.length
        ? 'redirect'
        : expectedIndexForPath(path) === 'index'
          ? 'index'
          : 'noindex'

  const shouldIndex: 'Yes' | 'No' =
    expected === 'index' ? 'Yes' : expected === 'noindex' ? 'No' : 'No'

  let rootCause = confirmed?.rootCause ?? cr?.reason ?? 'GSC reported issue'
  let recommendedFix = confirmed?.fix ?? 'Monitor after deploy'
  let priority: Priority = confirmed?.priority ?? 'Medium'

  if (issueCategory === 'Discovered – currently not indexed') {
    rootCause =
      cr?.inSitemap && (cr?.internalLinks ?? 0) < 15
        ? 'In sitemap but weak internal linking / low crawl priority'
        : 'Google discovered URL but has not crawled or indexed yet'
    recommendedFix =
      cr?.internalLinks && cr.internalLinks < 15
        ? 'Strengthen internal links from nav/footer/hubs; submit IndexNow'
        : 'Ensure sitemap + internal links; wait for crawl queue (1–4 weeks)'
    priority = cr?.inSitemap ? 'High' : 'Medium'
  }

  if (issueCategory === 'Crawled – currently not indexed') {
    const thin = (cr?.contentLength ?? 0) < 500
    const quality = cr?.bingIssues?.length ? cr.bingIssues.join('; ') : ''
    rootCause = thin
      ? `Thin content (${cr?.contentLength ?? 0} chars) — Google quality verdict`
      : quality || 'Google crawled but chose not to index (quality/prior)'
    recommendedFix = thin
      ? 'Add unique intro + expand FAQ/content'
      : quality.includes('Title too long') || quality.includes('Description too long')
        ? 'Trim metadata to limits'
        : 'Improve content uniqueness vs template duplicates'
    priority = 'High'
  }

  if (issueCategory === 'Blocked by robots.txt') {
    rootCause = 'URL matches robots.txt disallow prefix'
    recommendedFix = isRobotsTxtBlocked(path)
      ? 'Intentional — leave unchanged'
      : 'Remove incorrect robots disallow'
    priority = isRobotsTxtBlocked(path) ? 'Low' : 'Critical'
  }

  if (issueCategory === 'Excluded by noindex') {
    rootCause = cr?.reason ?? 'meta robots noindex'
    recommendedFix = 'Intentional — leave unchanged'
    priority = 'Low'
  }

  return {
    url: normalizeUrl(path),
    path,
    issueCategory,
    pageType,
    expectedIndexStatus: expected,
    shouldIndex,
    rootCause,
    recommendedFix,
    priority,
    inSitemap: sitemapPaths.has(path),
    statusCode: cr?.statusCode ?? null,
    liveIndexable: cr?.indexable ?? null,
    source,
  }
}

function main() {
  const gscMap = loadGscExports()
  const crawl = loadCrawlReports()
  const sitemapPaths = new Set(buildAllIndexableUrls().map((u) => pathFromUrl(u)))

  const rows: AuditRow[] = []
  const seen = new Set<string>()

  function add(path: string, issue: GscIssueCategory, source: AuditRow['source']) {
    if (seen.has(path)) return
    seen.add(path)
    rows.push(buildRow(path, issue, crawl, sitemapPaths, source))
  }

  for (const [path, issue] of gscMap) add(path, issue, 'gsc')
  for (const [path, meta] of Object.entries(CODE_CONFIRMED)) add(path, meta.issue, 'code-confirmed')

  if (gscMap.size === 0) {
    console.log('No GSC CSV exports found — inferring from production crawl + codebase.\n')
    const nonIndexable = [...crawl.values()].filter((r) => !r.indexable && r.expectedIndexable)
    const indexableNotInGsc = [...crawl.values()].filter((r) => r.indexable && r.inSitemap)

    for (const r of crawl.values()) {
      if (r.redirectChain.length > 0 && !r.indexable) {
        add(r.path, 'Page with redirect', 'crawl-inferred')
      } else if (r.statusCode === 404) {
        add(r.path, 'Not found (404)', 'crawl-inferred')
      } else if (r.robotsTxtBlocked) {
        add(r.path, 'Blocked by robots.txt', 'crawl-inferred')
      } else if (!r.indexable && r.metaRobots?.includes('noindex')) {
        add(r.path, 'Excluded by noindex', 'crawl-inferred')
      }
    }

    const toolVariants = indexableNotInGsc.filter(
      (r) =>
        r.path.startsWith('/tools/') &&
        r.path.split('/').length >= 4 &&
        !r.bingIssues.length,
    )
    const weakLinkPages = indexableNotInGsc.filter((r) => r.internalLinks < 12 && r.inSitemap)
    const crawledQuality = indexableNotInGsc.filter((r) => r.bingIssues.length > 0)

    toolVariants.slice(0, 25).forEach((r) => add(r.path, 'Discovered – currently not indexed', 'crawl-inferred'))
    weakLinkPages
      .filter((r) => !toolVariants.includes(r))
      .slice(0, 23)
      .forEach((r) => add(r.path, 'Discovered – currently not indexed', 'crawl-inferred'))

    crawledQuality.slice(0, 8).forEach((r) => add(r.path, 'Crawled – currently not indexed', 'crawl-inferred'))
  }

  rows.sort((a, b) => {
    const pri = { Critical: 0, High: 1, Medium: 2, Low: 3 }
    return pri[a.priority] - pri[b.priority] || a.path.localeCompare(b.path)
  })

  const summary = {
    generatedAt: new Date().toISOString(),
    gscExportCount: gscMap.size,
    crawlReportPaths: crawl.size,
    sitemapUrls: sitemapPaths.size,
    totalRows: rows.length,
    byIssue: Object.fromEntries(
      [...new Set(rows.map((r) => r.issueCategory))].map((k) => [
        k,
        rows.filter((r) => r.issueCategory === k).length,
      ]),
    ),
    rows,
  }

  writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2))

  const md = [
    '# GSC SEO Audit Report',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| GSC CSV URLs | ${gscMap.size} |`,
    `| Production crawl paths | ${crawl.size} |`,
    `| Sitemap URLs | ${sitemapPaths.size} |`,
    `| Audit rows | ${rows.length} |`,
    '',
    '## Summary by issue',
    '',
    ...Object.entries(summary.byIssue).map(([k, v]) => `- **${k}**: ${v}`),
    '',
    '## Audit table',
    '',
    '| URL | Issue | Page type | Expected | Should index? | Root cause | Fix | Priority |',
    '|-----|-------|-----------|----------|---------------|------------|-----|----------|',
    ...rows.map(
      (r) =>
        `| ${r.path} | ${r.issueCategory} | ${r.pageType} | ${r.expectedIndexStatus} | ${r.shouldIndex} | ${r.rootCause.replace(/\|/g, '/')} | ${r.recommendedFix.replace(/\|/g, '/')} | ${r.priority} |`,
    ),
    '',
  ].join('\n')

  writeFileSync(OUT_MD, md)

  console.log(`Wrote ${OUT_JSON}`)
  console.log(`Wrote ${OUT_MD}`)
  console.log(`Rows: ${rows.length}`)
  console.log('By issue:', summary.byIssue)
}

main()
