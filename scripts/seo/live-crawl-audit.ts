/**
 * Read-only live SEO crawl audit.
 *
 * Fetches every URL in the sitemap index (plus internal links discovered on those
 * pages) and records status, redirects, canonical, robots meta / X-Robots-Tag,
 * title, description, H1s, JSON-LD @types, and visible word count.
 *
 * Usage: npx tsx scripts/seo/live-crawl-audit.ts [origin] [outFile]
 *   origin  defaults to https://interviewera.com
 *   outFile defaults to .seo-audit/crawl-<timestamp>.json (gitignored dir)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const origin = (process.argv[2] ?? 'https://interviewera.com').replace(/\/$/, '')
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const outFile = process.argv[3] ?? `.seo-audit/crawl-${stamp}.json`
const CONCURRENCY = 6
const CANONICAL_ORIGIN = 'https://interviewera.com'

type PageRecord = {
  url: string
  inSitemap: string | null
  status: number
  location: string | null
  xRobotsTag: string | null
  canonical: string | null
  robotsMeta: string | null
  title: string | null
  description: string | null
  h1: string[]
  jsonLdTypes: string[]
  jsonLdErrors: number
  wordCount: number
  internalLinks: number
  error?: string
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'))
  return m ? decode(m[1]) : null
}

function metaContent(html: string, key: 'name' | 'property', value: string): string | null {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (attr(m[0], key)?.toLowerCase() === value) return attr(m[0], 'content')
  }
  return null
}

function collectTypes(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((n) => collectTypes(n, out))
    return
  }
  if (node && typeof node === 'object') {
    const rec = node as Record<string, unknown>
    const t = rec['@type']
    if (typeof t === 'string') out.push(t)
    else if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && out.push(x))
    if (rec['@graph']) collectTypes(rec['@graph'], out)
    for (const [k, v] of Object.entries(rec)) {
      if (k !== '@graph' && v && typeof v === 'object') collectTypes(v, out)
    }
  }
}

async function fetchSitemapLocs(url: string): Promise<string[]> {
  const res = await fetch(url, { redirect: 'manual' })
  const xml = await res.text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1].trim()))
}

async function audit(url: string, inSitemap: string | null, discovered: Set<string>): Promise<PageRecord> {
  const rec: PageRecord = {
    url,
    inSitemap,
    status: 0,
    location: null,
    xRobotsTag: null,
    canonical: null,
    robotsMeta: null,
    title: null,
    description: null,
    h1: [],
    jsonLdTypes: [],
    jsonLdErrors: 0,
    wordCount: 0,
    internalLinks: 0,
  }
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; InterviewEraSeoAudit/1.0)' },
    })
    rec.status = res.status
    rec.location = res.headers.get('location')
    rec.xRobotsTag = res.headers.get('x-robots-tag')
    if (res.status !== 200 || !(res.headers.get('content-type') ?? '').includes('text/html')) {
      return rec
    }
    const html = await res.text()
    const head = html.slice(0, html.indexOf('</head>') > 0 ? html.indexOf('</head>') : html.length)
    for (const m of head.matchAll(/<link\b[^>]*>/gi)) {
      if (attr(m[0], 'rel')?.toLowerCase() === 'canonical') rec.canonical = attr(m[0], 'href')
    }
    rec.robotsMeta = metaContent(head, 'name', 'robots')
    const t = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    rec.title = t ? decode(t[1].trim()) : null
    rec.description = metaContent(head, 'name', 'description')
    rec.h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
      decode(m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()),
    )
    for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        collectTypes(JSON.parse(m[1]), rec.jsonLdTypes)
      } catch {
        rec.jsonLdErrors++
      }
    }
    rec.jsonLdTypes = [...new Set(rec.jsonLdTypes)].sort()
    const body = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<(nav|footer|header)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
    rec.wordCount = decode(body).split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length
    for (const m of html.matchAll(/<a\b[^>]*href="([^"#?]*)[^"]*"/gi)) {
      const href = decode(m[1])
      if (href.startsWith('/') && !href.startsWith('//')) {
        rec.internalLinks++
        discovered.add(`${origin}${href === '/' ? '/' : href.replace(/\/$/, '')}`)
      }
    }
  } catch (e) {
    rec.error = e instanceof Error ? e.message : String(e)
  }
  return rec
}

async function pool<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx])
      }
    }),
  )
  return out
}

async function main() {
  const index = await fetchSitemapLocs(`${origin}/sitemap.xml`)
  const sitemapOf = new Map<string, string>()
  for (const child of index) {
    const name = child.split('/').pop() ?? child
    for (const loc of await fetchSitemapLocs(child.replace(CANONICAL_ORIGIN, origin))) {
      sitemapOf.set(loc.replace(CANONICAL_ORIGIN, origin), name)
    }
  }
  const discovered = new Set<string>()
  const sitemapUrls = [...sitemapOf.keys()]
  const records = await pool(sitemapUrls, (u) => audit(u, sitemapOf.get(u) ?? null, discovered))
  const extra = [...discovered].filter((u) => !sitemapOf.has(u))
  const extraRecords = await pool(extra, (u) => audit(u, null, new Set()))
  const all = [...records, ...extraRecords]

  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, JSON.stringify({ origin, fetchedAt: new Date().toISOString(), pages: all }, null, 2))

  const issues: string[] = []
  const titles = new Map<string, string[]>()
  for (const r of all) {
    const expected = r.url.replace(origin, CANONICAL_ORIGIN).replace(/^(https:\/\/[^/]+)\/$/, '$1')
    if (r.inSitemap && r.status !== 200) issues.push(`SITEMAP_NON200 ${r.status} ${r.url} -> ${r.location ?? ''}`)
    if (r.inSitemap && /noindex/i.test(`${r.robotsMeta ?? ''} ${r.xRobotsTag ?? ''}`))
      issues.push(`SITEMAP_NOINDEX ${r.url}`)
    if (r.inSitemap && r.status === 200 && r.canonical !== expected)
      issues.push(`SITEMAP_CANONICAL_MISMATCH ${r.url} canonical=${r.canonical}`)
    if (
      !r.inSitemap &&
      r.status === 200 &&
      r.canonical !== null &&
      !/noindex/i.test(`${r.robotsMeta ?? ''} ${r.xRobotsTag ?? ''}`)
    )
      issues.push(`INDEXABLE_NOT_IN_SITEMAP ${r.url} canonical=${r.canonical}`)
    if (r.status >= 400) issues.push(`BROKEN_INTERNAL ${r.status} ${r.url}`)
    if (r.status >= 300 && r.status < 400 && !r.inSitemap) issues.push(`INTERNAL_REDIRECT ${r.status} ${r.url} -> ${r.location}`)
    if (r.status === 200 && r.h1.length !== 1) issues.push(`H1_COUNT_${r.h1.length} ${r.url}`)
    if (r.jsonLdErrors) issues.push(`JSONLD_PARSE_ERROR ${r.url}`)
    if (r.status === 200 && r.title) titles.set(r.title, [...(titles.get(r.title) ?? []), r.url])
  }
  for (const [t, urls] of titles) if (urls.length > 1) issues.push(`DUP_TITLE x${urls.length} "${t}" ${urls.slice(0, 4).join(' ')}`)

  console.log(`origin=${origin} sitemapUrls=${sitemapUrls.length} discoveredExtra=${extra.length} out=${outFile}`)
  console.log(issues.join('\n') || 'no issues')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
