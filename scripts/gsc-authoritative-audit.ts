/**
 * Authoritative GSC indexing audit — merges drill-down URL exports + live crawl.
 *
 * GSC Coverage top-level export (Critical issues.csv) = issue COUNTS only.
 * Per-URL data requires drill-down Table.csv from each issue bucket in GSC:
 *   Indexing → Pages → click issue row → Export → Download CSV (Table.csv)
 *
 * Place drill-down files under:
 *   docs/interviewera.com-Coverage-2026-06-23/<issue-folder>/Table.csv
 *   OR scripts/gsc-exports/<issue-name>.csv
 *
 * Run: npx tsx scripts/gsc-authoritative-audit.ts
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { buildAllIndexableUrls } from '../src/lib/seo/sitemap/registry'
import { ROBOTS_DISALLOW_PREFIXES } from '../src/lib/seo/robots-rules'
import { getCanonicalSiteOrigin } from '../src/lib/seo/site-url'
import {
  ROLES,
  COMPANIES,
  SKILLS,
  getCompanyBySlug,
  getRoleBySlug,
  getSkillBySlug,
  roleQuestionsPath,
  companyQuestionsPath,
  intersectionQuestionsPath,
  skillQuestionsPath,
} from '../src/lib/seo/programmatic'
import {
  isRoleIndexable,
  isCompanyIndexable,
  isSkillIndexable,
  isIntersectionIndexable,
} from '../src/lib/seo/programmatic/indexing'
import {
  FOOTER_INTERVIEW_QUESTIONS_LINKS,
  FOOTER_RESOURCES_LINKS,
  NAV_RESOURCE_ITEMS,
  NAV_TOOLS_LINKS,
} from '../src/lib/seo/content/nav'
import {
  buildRolePageLinks,
  buildCompanyPageLinks,
  buildSkillPageLinks,
  buildIntersectionPageLinks,
  buildToolQGenRoleLinks,
  buildToolQGenCompanyLinks,
  buildToolAtsRoleLinks,
  buildToolStarTopicLinks,
} from '../src/lib/seo/internal-linking'
import { getRoleBySlug as getRole, getCompanyBySlug as getCo } from '../src/lib/seo/programmatic'

const ROOT = join(import.meta.dirname ?? __dirname, '..')
const COVERAGE_DIR = join(ROOT, 'docs', 'interviewera.com-Coverage-2026-06-23')
const GSC_EXPORTS_DIR = join(ROOT, 'scripts', 'gsc-exports')
const OUT_JSON = join(ROOT, 'scripts', 'gsc-authoritative-audit.json')
const OUT_MD = join(ROOT, 'scripts', 'gsc-authoritative-audit.md')

const ORIGIN = getCanonicalSiteOrigin()
const CRAWL_CACHE_PATH = join(ROOT, 'scripts', 'seo-audit-report.json')
const CONCURRENCY = 4
const FETCH_TIMEOUT_MS = 30_000
const FETCH_RETRIES = 3
const TITLE_MAX = 60
const DESC_MAX = 160

type CrawlCacheRow = {
  path: string
  statusCode: number
  canonical: string | null
  metaRobots: string | null
  contentLength: number
  internalLinks: number
  structuredDataCount: number
  redirectChain: string[]
  title: string | null
  metaDescription: string | null
}

type GscIssue =
  | 'Discovered – currently not indexed'
  | 'Crawled – currently not indexed'
  | 'Page with redirect'
  | 'Blocked by robots.txt'
  | 'Not found (404)'
  | 'Excluded by noindex'

type ActionClass =
  | 'Keep and request indexing'
  | 'Improve content before requesting indexing'
  | 'Merge with another page'
  | 'Redirect'
  | 'Intentionally noindex'
  | 'Remove from sitemap'

type GscSummaryRow = { issue: GscIssue; source: string; validation: string; pages: number }

type AuditRow = {
  url: string
  path: string
  issue: GscIssue
  pageType: string
  shouldIndex: 'Yes' | 'No'
  canonical: string | null
  inSitemap: boolean
  internalLinkCount: number
  crawlDepth: number | null
  incomingLinkCount: number
  duplicateSimilarity: string
  contentUniqueness: string
  structuredDataCount: number
  metaQuality: string
  wordCount: number
  lastModified: string | null
  rootCause: string
  action: ActionClass
  exactFix: string
  expectedImpact: string
  statusCode: number
  metaRobots: string | null
  redirectChain: string[]
}

function pathFromUrl(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url.startsWith('/') ? url.split('?')[0] : `/${url.split('?')[0]}`
  }
}

function normalizeIssue(reason: string): GscIssue | null {
  const r = reason.toLowerCase()
  if (r.includes('discovered') && r.includes('not indexed')) return 'Discovered – currently not indexed'
  if (r.includes('crawled') && r.includes('not indexed')) return 'Crawled – currently not indexed'
  if (r.includes('redirect')) return 'Page with redirect'
  if (r.includes('robots')) return 'Blocked by robots.txt'
  if (r.includes('404') || r.includes('not found')) return 'Not found (404)'
  if (r.includes('noindex')) return 'Excluded by noindex'
  return null
}

function inferIssueFromPath(filePath: string): GscIssue | null {
  const p = filePath.toLowerCase().replace(/\\/g, '/')
  if (p.includes('discovered')) return 'Discovered – currently not indexed'
  if (p.includes('crawled')) return 'Crawled – currently not indexed'
  if (p.includes('redirect')) return 'Page with redirect'
  if (p.includes('robot')) return 'Blocked by robots.txt'
  if (p.includes('404') || p.includes('not-found') || p.includes('not_found')) return 'Not found (404)'
  if (p.includes('noindex')) return 'Excluded by noindex'
  return null
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQ = !inQ
      continue
    }
    if (c === ',' && !inQ) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += c
  }
  out.push(cur.trim())
  return out
}

function parseGscTableCsv(content: string): { urls: string[]; lastCrawled: Map<string, string> } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { urls: [], lastCrawled: new Map() }
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const urlIdx = header.findIndex((h) => h === 'url' || h === 'address' || h.includes('url'))
  const crawlIdx = header.findIndex((h) => h.includes('last crawl') || h.includes('crawled'))
  const urls: string[] = []
  const lastCrawled = new Map<string, string>()
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const raw = urlIdx >= 0 ? cols[urlIdx] : cols[0]
    if (!raw) continue
    const path = raw.startsWith('http') ? pathFromUrl(raw) : raw.startsWith('/') ? raw : `/${raw}`
    if (!path.includes('interviewera.com') && !path.startsWith('/')) continue
    const p = path.includes('interviewera.com') ? pathFromUrl(path.startsWith('http') ? path : `${ORIGIN}${path}`) : path
    urls.push(p)
    if (crawlIdx >= 0 && cols[crawlIdx]) lastCrawled.set(p, cols[crawlIdx])
  }
  return { urls: [...new Set(urls)], lastCrawled }
}

function loadGscSummary(): GscSummaryRow[] {
  const file = join(COVERAGE_DIR, 'Critical issues.csv')
  if (!existsSync(file)) return []
  const lines = readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)
  const rows: GscSummaryRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const issue = normalizeIssue(cols[0] ?? '')
    if (!issue) continue
    rows.push({
      issue,
      source: cols[1] ?? '',
      validation: cols[2] ?? '',
      pages: parseInt(cols[3] ?? '0', 10) || 0,
    })
  }
  return rows
}

function collectUrlCsvFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) collectUrlCsvFiles(full, acc)
    else if (entry.endsWith('.csv') && entry.toLowerCase() !== 'chart.csv' && entry.toLowerCase() !== 'metadata.csv')
      acc.push(full)
  }
  return acc
}

function loadGscUrlExports(): Map<string, { issue: GscIssue; lastCrawled: string | null; sourceFile: string }> {
  const map = new Map<string, { issue: GscIssue; lastCrawled: string | null; sourceFile: string }>()
  const dirs = [COVERAGE_DIR, GSC_EXPORTS_DIR]
  const summaryOnly = new Set(['critical issues.csv', 'non-critical issues.csv', 'chart.csv'])

  for (const dir of dirs) {
    for (const file of collectUrlCsvFiles(dir)) {
      const base = file.split(/[/\\]/).pop()?.toLowerCase() ?? ''
      if (summaryOnly.has(base)) continue
      const content = readFileSync(file, 'utf8')
      if (!content.toLowerCase().includes('interviewera') && !content.toLowerCase().includes('url'))
        continue
      let issueFromPath = inferIssueFromPath(file)
      if (!issueFromPath && base === 'table.csv') {
        issueFromPath = 'Discovered – currently not indexed'
      }
      const { urls, lastCrawled } = parseGscTableCsv(content)
      if (!urls.length) {
        const loose = parseGscTableCsv(content.replace(/https:\/\/interviewera\.com/g, `${ORIGIN}`))
        for (const p of loose.urls) {
          const issue = issueFromPath ?? 'Discovered – currently not indexed'
          map.set(p, { issue, lastCrawled: lastCrawled.get(p) ?? null, sourceFile: relative(ROOT, file) })
        }
        continue
      }
      for (const p of urls) {
        const issue = issueFromPath ?? 'Discovered – currently not indexed'
        map.set(p, { issue, lastCrawled: lastCrawled.get(p) ?? null, sourceFile: relative(ROOT, file) })
      }
    }
  }
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
  if (/^\/interview-questions\/companies\/[^/]+\/[^/]+$/.test(path)) return 'intersection'
  if (/^\/interview-questions\/companies\/[^/]+$/.test(path)) return 'company'
  if (/^\/interview-questions\/topics\/[^/]+$/.test(path)) return 'skill-topic'
  if (/^\/interview-questions\/(tcs|solera)$/.test(path)) return 'company-pillar'
  if (/^\/interview-questions\/[^/]+$/.test(path)) return 'role'
  if (/^\/tools\/question-generator\/companies\/[^/]+$/.test(path)) return 'tool-qgen-company'
  if (/^\/tools\/question-generator\/[^/]+$/.test(path) && path !== '/tools/question-generator')
    return 'tool-qgen-role'
  if (/^\/tools\/ats-checker\/[^/]+$/.test(path) && path !== '/tools/ats-checker') return 'tool-ats-role'
  if (/^\/tools\/star-builder\/[^/]+$/.test(path) && path !== '/tools/star-builder') return 'tool-star-topic'
  if (path.startsWith('/tools/')) return 'tool-landing'
  if (path.includes('/results')) return 'tool-results'
  if (path.startsWith('/dashboard') || path.startsWith('/onboarding')) return 'app-private'
  return 'marketing-static'
}

function shouldIndexPath(path: string): boolean {
  if (isRobotsTxtBlocked(path) || path.includes('/results') || path === '/join') return false
  const topic = path.match(/^\/interview-questions\/topics\/([^/]+)$/)
  if (topic) {
    const s = getSkillBySlug(topic[1])
    return s ? isSkillIndexable(s) : false
  }
  const ix = path.match(/^\/interview-questions\/companies\/([^/]+)\/([^/]+)$/)
  if (ix) {
    const c = getCompanyBySlug(ix[1])
    const r = getRoleBySlug(ix[2])
    return c && r ? isIntersectionIndexable(c, r) : false
  }
  const co = path.match(/^\/interview-questions\/companies\/([^/]+)$/)
  if (co) {
    const c = getCompanyBySlug(co[1])
    return c ? isCompanyIndexable(c) : false
  }
  const role = path.match(/^\/interview-questions\/([^/]+)$/)
  if (role && path !== '/interview-questions') {
    const r = getRoleBySlug(role[1])
    return r ? isRoleIndexable(r) : false
  }
  return new Set(buildAllIndexableUrls().map((u) => pathFromUrl(u))).has(path)
}

function buildGlobalLinkGraph(): { edges: Map<string, Set<string>>; depths: Map<string, number> } {
  const edges = new Map<string, Set<string>>()
  const add = (from: string, to: string) => {
    if (!edges.has(from)) edges.set(from, new Set())
    edges.get(from)!.add(to)
  }

  const chrome = [
    '/',
    '/interview-questions',
    '/tools/question-generator',
    '/tools/ats-checker',
    '/tools/star-builder',
    '/blog',
    '/resources',
    ...NAV_TOOLS_LINKS.map((l) => l.href),
    ...NAV_RESOURCE_ITEMS.map((l) => l.href),
    ...FOOTER_INTERVIEW_QUESTIONS_LINKS.map((l) => l.href),
    ...FOOTER_RESOURCES_LINKS.map((l) => l.href),
    '/interview-questions/tcs',
    '/interview-questions/topics/react',
  ]
  for (const c of chrome) add('/', c)

  for (const role of ROLES) {
    const p = roleQuestionsPath(role.slug)
    for (const s of buildRolePageLinks(role)) for (const l of s.links) add(p, l.href)
    for (const s of buildToolQGenRoleLinks(role)) for (const l of s.links) add(p, l.href)
    for (const s of buildToolAtsRoleLinks(role)) for (const l of s.links) add(p, l.href)
  }
  for (const company of COMPANIES) {
    const p = companyQuestionsPath(company.slug)
    for (const s of buildCompanyPageLinks(company)) for (const l of s.links) add(p, l.href)
    for (const s of buildToolQGenCompanyLinks(company)) for (const l of s.links) add(p, l.href)
  }
  for (const skill of SKILLS) {
    const p = skillQuestionsPath(skill.slug)
    for (const s of buildSkillPageLinks(skill)) for (const l of s.links) add(p, l.href)
  }

  const depths = new Map<string, number>()
  const q: { path: string; d: number }[] = [{ path: '/', d: 0 }]
  depths.set('/', 0)
  while (q.length) {
    const { path, d } = q.shift()!
    for (const t of edges.get(path) ?? []) {
      if (depths.has(t)) continue
      depths.set(t, d + 1)
      q.push({ path: t, d: d + 1 })
    }
  }
  return { edges, depths }
}

function incomingCount(path: string, edges: Map<string, Set<string>>): number {
  let n = 0
  for (const [from, tos] of edges) if (tos.has(path)) n++
  return n
}

function duplicateNote(path: string, wordCount: number): { similarity: string; uniqueness: string } {
  const ix = path.match(/^\/interview-questions\/companies\/([^/]+)\/([^/]+)$/)
  if (ix) {
    const rolePath = roleQuestionsPath(ix[2] as never)
    return {
      similarity: `Reuses role bank from ${rolePath} with company framing`,
      uniqueness: wordCount > 800 ? 'Moderate — editorial or expanded hub' : 'Low — template + shared Q bank',
    }
  }
  if (/^\/tools\//.test(path) && path.split('/').length >= 4) {
    return {
      similarity: 'Tool variant template shared across entities',
      uniqueness: wordCount > 600 ? 'Moderate — variant FAQs present' : 'Low — form + template shell',
    }
  }
  return { similarity: 'No known duplicate pair in codebase', uniqueness: wordCount > 500 ? 'Adequate visible text' : 'Thin visible text' }
}

function loadCrawlCache(): Map<string, CrawlCacheRow> {
  const map = new Map<string, CrawlCacheRow>()
  if (!existsSync(CRAWL_CACHE_PATH)) return map
  const data = JSON.parse(readFileSync(CRAWL_CACHE_PATH, 'utf8')) as { reports: CrawlCacheRow[] }
  for (const r of data.reports) map.set(r.path, r)
  return map
}

async function fetchOnce(url: string): Promise<Response> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    try {
      return await fetch(url, {
        redirect: 'manual',
        headers: { 'User-Agent': 'InterviewEra-GSC-Audit/2.0' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
    } catch (e) {
      lastErr = e
      if (attempt < FETCH_RETRIES) await new Promise((r) => setTimeout(r, 1500 * attempt))
    }
  }
  throw lastErr
}

async function fetchPage(url: string) {
  const redirectChain: string[] = []
  let current = url
  for (let i = 0; i < 5; i++) {
    const res = await fetchOnce(current)
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) break
      redirectChain.push(`${res.status} → ${loc}`)
      current = loc.startsWith('http') ? loc : new URL(loc, ORIGIN).href
      continue
    }
    const html = await res.text()
    return { statusCode: res.status, html, redirectChain, finalUrl: current }
  }
  return { statusCode: 0, html: '', redirectChain, finalUrl: current }
}

function extractMeta(html: string, name: string): string | null {
  const re = new RegExp(
    `<meta\\s+(?:[^>]*\\s)?(?:name|property)=["']${name}["']\\s+content=["']([^"']*)["']|<meta\\s+content=["']([^"']*)["']\\s+(?:[^>]*\\s)?(?:name|property)=["']${name}["']`,
    'i',
  )
  const m = html.match(re)
  return m ? (m[1] ?? m[2] ?? null) : null
}

function extractCanonical(html: string): string | null {
  const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)
  return m ? m[1] : null
}

function countJsonLd(html: string): number {
  return (html.match(/type=["']application\/ld\+json["']/gi) ?? []).length
}

function visibleText(html: string): { words: number; text: string } {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { words: text ? text.split(/\s+/).length : 0, text }
}

function countInternalLinks(html: string): number {
  let n = 0
  const re = /href=["']([^"'#]+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const h = m[1]
    if (h.startsWith('/') || h.startsWith(ORIGIN)) n++
  }
  return n
}

function metaQualityIssues(title: string | null, desc: string | null): string[] {
  const issues: string[] = []
  if (!title) issues.push('missing title')
  else if (title.length > TITLE_MAX) issues.push(`title ${title.length}>${TITLE_MAX}`)
  if (!desc) issues.push('missing description')
  else if (desc.length > DESC_MAX) issues.push(`description ${desc.length}>${DESC_MAX}`)
  return issues
}

function classifyAction(
  path: string,
  issue: GscIssue,
  statusCode: number,
  shouldIndex: boolean,
  metaIssues: string[],
  wordCount: number,
  redirectChain: string[],
): { action: ActionClass; rootCause: string; exactFix: string; expectedImpact: string } {
  if (issue === 'Excluded by noindex' || (!shouldIndex && issue !== 'Page with redirect')) {
    return {
      action: 'Intentionally noindex',
      rootCause: 'meta robots noindex or content gate — GSC confirms exclusion',
      exactFix: 'No change — intentional',
      expectedImpact: '0 — correct state',
    }
  }
  if (issue === 'Blocked by robots.txt') {
    return {
      action: 'Intentionally noindex',
      rootCause: 'URL matches robots.txt disallow prefix',
      exactFix: isRobotsTxtBlocked(path) ? 'No change — intentional disallow' : 'Remove incorrect robots disallow',
      expectedImpact: isRobotsTxtBlocked(path) ? '0' : 'Clears robots-blocked issue',
    }
  }
  if (issue === 'Page with redirect' || redirectChain.length > 0) {
    const dest = redirectChain.at(-1) ?? 'destination'
    return {
      action: 'Redirect',
      rootCause: `HTTP redirect chain: ${redirectChain.join('; ') || 'redirect response'}`,
      exactFix: 'Keep 301 if destination is canonical; fix internal links pointing to source URL',
      expectedImpact: 'Resolves redirect issue after recrawl + GSC validation',
    }
  }
  if (issue === 'Not found (404)' || statusCode === 404) {
    return {
      action: 'Redirect',
      rootCause: 'URL returns 404 — broken internal link or removed page',
      exactFix: 'Fix source href to valid slug OR add 301 to canonical if external backlinks exist',
      expectedImpact: '-1 from 404 bucket after deploy + validation',
    }
  }
  if (issue === 'Crawled – currently not indexed') {
    if (metaIssues.length) {
      return {
        action: 'Improve content before requesting indexing',
        rootCause: `Google crawled but rejected — metadata quality: ${metaIssues.join(', ')}`,
        exactFix: `Trim metadata: ${metaIssues.join('; ')}`,
        expectedImpact: 'May move to indexed after quality fix + recrawl',
      }
    }
    if (wordCount < 500) {
      return {
        action: 'Improve content before requesting indexing',
        rootCause: `Thin visible content (${wordCount} words) — Google quality verdict`,
        exactFix: 'Add unique intro, expand FAQ, differentiate from template parent',
        expectedImpact: 'May index after content depth increase',
      }
    }
    const ix = path.match(/^\/interview-questions\/companies\/([^/]+)\/([^/]+)$/)
    if (ix) {
      return {
        action: 'Improve content before requesting indexing',
        rootCause: 'Intersection page reuses role question bank — near-duplicate signal',
        exactFix: 'Add company-specific FAQ/insights OR noindex until 40%+ unique content',
        expectedImpact: 'Reduces crawled-not-indexed if differentiated',
      }
    }
    return {
      action: 'Improve content before requesting indexing',
      rootCause: 'Google crawled but chose not to index — quality/prior verdict (GSC)',
      exactFix: 'Strengthen internal links + unique content; request indexing after deploy',
      expectedImpact: 'Uncertain — depends on Google re-evaluation',
    }
  }
  if (issue === 'Discovered – currently not indexed') {
    return {
      action: 'Keep and request indexing',
      rootCause: 'Google discovered URL (sitemap/links) but has not crawled or indexed yet',
      exactFix: 'Strengthen internal links from nav/hubs; submit IndexNow; request indexing in GSC',
      expectedImpact: 'Increases crawl priority — may take 1–4 weeks',
    }
  }
  return {
    action: 'Keep and request indexing',
    rootCause: 'Indexable page with unresolved GSC state',
    exactFix: 'Request indexing after verifying live signals',
    expectedImpact: 'Monitor',
  }
}

async function auditUrl(
  path: string,
  issue: GscIssue,
  gscLastCrawled: string | null,
  graph: { edges: Map<string, Set<string>>; depths: Map<string, number> },
  sitemapPaths: Set<string>,
  crawlCache: Map<string, CrawlCacheRow>,
): Promise<AuditRow> {
  const url = `${ORIGIN}${path}`
  let statusCode = 0
  let html = ''
  let redirectChain: string[] = []
  let dataSource: 'live' | 'cache' | 'failed' = 'failed'
  const cached = crawlCache.get(path)

  try {
    const live = await fetchPage(url)
    statusCode = live.statusCode
    html = live.html
    redirectChain = live.redirectChain
    dataSource = 'live'
  } catch {
    if (cached) {
      statusCode = cached.statusCode
      redirectChain = cached.redirectChain
      dataSource = 'cache'
    }
  }

  const canonical =
    statusCode === 200 && html
      ? extractCanonical(html)
      : cached && dataSource === 'cache'
        ? cached.canonical
        : null
  const title =
    statusCode === 200 && html
      ? (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null)
      : cached?.title ?? null
  const desc =
    statusCode === 200 && html
      ? extractMeta(html, 'description')
      : cached?.metaDescription ?? null
  const metaRobots =
    statusCode === 200 && html
      ? extractMeta(html, 'robots')
      : cached?.metaRobots ?? null
  const { words } =
    statusCode === 200 && html ? visibleText(html) : { words: cached ? Math.round(cached.contentLength / 5) : 0 }
  const internalLinks =
    statusCode === 200 && html ? countInternalLinks(html) : (cached?.internalLinks ?? 0)
  const jsonLd = statusCode === 200 && html ? countJsonLd(html) : (cached?.structuredDataCount ?? 0)
  const metaIssues = metaQualityIssues(title, desc)
  const shouldIndex = shouldIndexPath(path)
  const { similarity, uniqueness } = duplicateNote(path, words)
  let { action, rootCause, exactFix, expectedImpact } = classifyAction(
    path,
    issue,
    statusCode,
    shouldIndex,
    metaIssues,
    words,
    redirectChain,
  )

  if (dataSource === 'failed') {
    rootCause = `Live crawl failed (timeout) — ${rootCause}`
    exactFix = `Re-run audit when network available; ${exactFix}`
  } else if (dataSource === 'cache') {
    rootCause = `Live crawl failed — using cached crawl from seo-audit-report.json; ${rootCause}`
  }

  let sitemapAction = action
  let sitemapFix = exactFix
  if (action === 'Intentionally noindex' && sitemapPaths.has(path)) {
    sitemapAction = 'Remove from sitemap'
    sitemapFix = 'Remove from sitemap registry — contradicts noindex'
  }

  return {
    url,
    path,
    issue,
    pageType: classifyPageType(path),
    shouldIndex: shouldIndex ? 'Yes' : 'No',
    canonical,
    inSitemap: sitemapPaths.has(path),
    internalLinkCount: internalLinks,
    crawlDepth: graph.depths.get(path) ?? null,
    incomingLinkCount: incomingCount(path, graph.edges),
    duplicateSimilarity: similarity,
    contentUniqueness: uniqueness,
    structuredDataCount: jsonLd,
    metaQuality: metaIssues.length ? metaIssues.join('; ') : 'OK',
    wordCount: words,
    lastModified: gscLastCrawled,
    rootCause,
    action: sitemapAction,
    exactFix: sitemapFix,
    expectedImpact,
    statusCode,
    metaRobots,
    redirectChain,
  }
}

async function runPool<T, R>(items: T[], fn: (item: T) => Promise<R>, n: number): Promise<R[]> {
  const out: R[] = []
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: n }, worker))
  return out
}

async function main() {
  const summary = loadGscSummary()
  const urlExports = loadGscUrlExports()
  const sitemapPaths = new Set(buildAllIndexableUrls().map((u) => pathFromUrl(u)))
  const graph = buildGlobalLinkGraph()
  const crawlCache = loadCrawlCache()

  console.log('=== GSC AUTHORITATIVE INDEXING AUDIT ===\n')
  console.log('Coverage summary (authoritative counts):')
  for (const s of summary) console.log(`  ${s.issue}: ${s.pages} (${s.validation})`)
  console.log(`\nURL-level exports loaded: ${urlExports.size}`)

  const expectedTotal = summary.reduce((a, s) => a + s.pages, 0)
  if (urlExports.size === 0) {
    console.error('\nERROR: No per-URL Table.csv exports found.')
    console.error('The Coverage folder only contains summary CSVs (counts), not URL lists.')
    console.error('Export drill-down URLs from GSC for each issue:')
    console.error('  Indexing → Pages → click issue row → Export → Table.csv')
    console.error(`  Save to: docs/interviewera.com-Coverage-2026-06-23/<issue-name>/Table.csv`)
    console.error(`  Expected total URLs across issues: ${expectedTotal}`)
    process.exit(1)
  }

  const byIssue = new Map<GscIssue, number>()
  for (const s of summary) byIssue.set(s.issue, s.pages)
  const loadedByIssue = new Map<GscIssue, number>()
  for (const { issue } of urlExports.values()) {
    loadedByIssue.set(issue, (loadedByIssue.get(issue) ?? 0) + 1)
  }
  console.log('\nURL count validation (loaded vs GSC summary):')
  for (const [issue, expected] of byIssue) {
    const loaded = loadedByIssue.get(issue) ?? 0
    const flag = loaded === expected ? 'OK' : loaded < expected ? 'PARTIAL' : 'EXTRA'
    console.log(`  ${issue}: loaded=${loaded} expected=${expected} [${flag}]`)
  }

  const entries = [...urlExports.entries()].map(([path, meta]) => ({ path, ...meta }))
  console.log(`\nLive crawling ${entries.length} GSC URLs (cache: ${crawlCache.size} paths)...`)
  const rows = await runPool(
    entries,
    (e) => auditUrl(e.path, e.issue, e.lastCrawled, graph, sitemapPaths, crawlCache),
    CONCURRENCY,
  )

  rows.sort((a, b) => a.issue.localeCompare(b.issue) || a.path.localeCompare(b.path))

  const payload = {
    generatedAt: new Date().toISOString(),
    coverageDir: COVERAGE_DIR,
    gscSummary: summary,
    urlCount: rows.length,
    expectedTotal,
    byAction: Object.fromEntries(
      [...new Set(rows.map((r) => r.action))].map((k) => [k, rows.filter((r) => r.action === k).length]),
    ),
    rows,
  }

  writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2))

  const md = [
    '# GSC Authoritative Indexing Audit',
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    '## GSC summary (from Critical issues.csv)',
    '',
    '| Issue | Count | Validation |',
    '|-------|-------|------------|',
    ...summary.map((s) => `| ${s.issue} | ${s.pages} | ${s.validation} |`),
    '',
    `**URLs audited:** ${rows.length} / ${expectedTotal} expected`,
    '',
    '## Audit table',
    '',
    '| URL | Issue | Root cause | Exact fix | Expected impact | Action |',
    '|-----|-------|------------|-----------|-----------------|--------|',
    ...rows.map(
      (r) =>
        `| ${r.path} | ${r.issue} | ${r.rootCause.replace(/\|/g, '/')} | ${r.exactFix.replace(/\|/g, '/')} | ${r.expectedImpact} | ${r.action} |`,
    ),
    '',
    '## Detail columns',
    '',
    '| URL | Page type | Should index | Canonical | Sitemap | Internal links | Depth | Incoming | Words | Meta | JSON-LD |',
    '|-----|-----------|--------------|-----------|---------|----------------|-------|----------|-------|------|---------|',
    ...rows.map(
      (r) =>
        `| ${r.path} | ${r.pageType} | ${r.shouldIndex} | ${r.canonical ?? '—'} | ${r.inSitemap} | ${r.internalLinkCount} | ${r.crawlDepth ?? '—'} | ${r.incomingLinkCount} | ${r.wordCount} | ${r.metaQuality} | ${r.structuredDataCount} |`,
    ),
  ].join('\n')

  writeFileSync(OUT_MD, md)
  console.log(`\nWrote ${OUT_JSON}`)
  console.log(`Wrote ${OUT_MD}`)
  console.log('By action:', payload.byAction)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
