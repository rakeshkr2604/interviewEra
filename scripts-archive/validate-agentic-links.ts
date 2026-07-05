/**
 * Validates internal hrefs for Agentic AI cluster and content relationship metadata.
 * Run: npx tsx scripts/validate-agentic-links.ts
 */
import { AGENTIC_CLUSTER_MVP_PAGES } from '../src/lib/seo/blog/agentic-cluster-mvp'
import { getAllContentEntries } from '../src/lib/seo/content/registry'
import { CONTENT_RELATIONSHIPS_BY_PATH } from '../src/lib/seo/content/relationships'
import { RELATED_CONTENT_BY_PATH } from '../src/lib/seo/content/related'
import { BLOG_POST_ROUTES } from '../src/lib/seo/sitemap/registry'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.join(__dirname, '..')
const APP = path.join(ROOT, 'src', 'app', '(marketing)')

function routeExists(href: string): boolean {
  if (!href.startsWith('/')) return true
  if (href === '/signup' || href.startsWith('/tools/') || href.startsWith('/interview-questions')) {
    return true
  }
  const segments = href.replace(/^\//, '').split('/')
  let dir = APP
  for (const seg of segments) {
    dir = path.join(dir, seg)
  }
  return fs.existsSync(path.join(dir, 'page.tsx')) || fs.existsSync(path.join(dir, 'page.ts'))
}

const hrefs = new Set<string>()

for (const page of AGENTIC_CLUSTER_MVP_PAGES) {
  hrefs.add(page.path)
}

for (const entry of getAllContentEntries()) {
  for (const c of entry.relatedConcepts ?? []) hrefs.add(c.href)
  for (const s of entry.learnNext ?? []) hrefs.add(s.href)
  for (const t of entry.recommendedTools ?? []) hrefs.add(t.href)
}

for (const rel of Object.values(CONTENT_RELATIONSHIPS_BY_PATH)) {
  for (const c of rel.relatedConcepts) hrefs.add(c.href)
  for (const s of rel.learnNext) hrefs.add(s.href)
  for (const t of rel.recommendedTools) hrefs.add(t.href)
}

for (const related of Object.values(RELATED_CONTENT_BY_PATH)) {
  for (const e of related) hrefs.add(e.path)
}

for (const route of BLOG_POST_ROUTES) {
  if (route.path.includes('agentic') || route.path.includes('what-is-agentic')) {
    hrefs.add(route.path)
  }
}

const broken: string[] = []
for (const href of hrefs) {
  if (!href || typeof href !== 'string') continue
  if (!routeExists(href)) broken.push(href)
}

if (broken.length) {
  console.error('BROKEN LINKS:')
  broken.forEach((h) => console.error(`  ${h}`))
  process.exit(1)
}

console.log(`PASS — ${hrefs.size} Agentic/SEO internal hrefs validated`)
