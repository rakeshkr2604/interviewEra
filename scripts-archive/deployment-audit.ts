/**
 * Pre-deployment integrity audit — run: npx tsx scripts/deployment-audit.ts
 */
import { existsSync } from 'node:fs'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  buildAllIndexableUrls,
  buildBlogSitemapEntries,
  buildPagesSitemapEntries,
  buildQuestionsSitemapEntries,
  BLOG_POST_ROUTES,
} from '../src/lib/seo/sitemap/registry'
import { getAllContentEntries, getBlogContentEntries } from '../src/lib/seo/content/registry'
import {
  FOOTER_INTERVIEW_QUESTIONS_LINKS,
  FOOTER_RESOURCES_LINKS,
  NAV_RESOURCE_ITEMS,
} from '../src/lib/seo/content/nav'
import { canonicalUrl, getCanonicalSiteOrigin } from '../src/lib/seo/site-url'
import { ROLES, COMPANIES, SKILLS, companyQuestionsPath, roleQuestionsPath, skillQuestionsPath } from '../src/lib/seo/programmatic'

const ROOT = join(import.meta.dirname ?? __dirname, '..')
const APP = join(ROOT, 'src', 'app')
const PUBLIC = join(ROOT, 'public')

const REQUIRED_ROUTES = [
  '/interview-questions/companies/amazon/software-engineer',
  '/interview-questions/companies/microsoft/software-engineer',
  '/interview-questions/companies/infosys/software-engineer',
  '/interview-questions/companies/infosys/java-developer',
  '/interview-questions/companies/freshworks/frontend-developer',
  '/interview-questions/android-developer',
  '/interview-questions/frontend-developer',
  '/interview-questions/java-developer',
  '/interview-questions/software-engineer',
  '/interview-questions/topics/react',
  '/blog/top-dsa-interview-questions',
  '/blog/how-to-prepare-for-placement-interviews',
  '/blog/what-is-star-method-with-examples',
  '/blog',
  '/resources',
] as const

const HERO_IMAGES = [
  '/blog/top-dsa-interview-questions-hero.png',
  '/blog/dsa-learning-roadmap-2026.png',
  '/blog/android-developer-hero.png',
  '/blog/android-developer-process-2026.png',
  '/blog/android-developer-roadmap-2026.png',
  '/blog/android-developer-mvvm-architecture-2026.png',
  '/blog/react-interview-hero.webp',
  '/blog/react-learning-roadmap-premium-2026.webp',
  '/blog/react-architecture-premium-2026.webp',
] as const

type AuditResult = {
  buildStatus: string
  routeCount: number
  sitemapCount: number
  brokenLinks: string[]
  warnings: string[]
  schemaFiles: number
  imageIssues: string[]
}

function findPageFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (entry === 'api' || entry.startsWith('_')) continue
      findPageFiles(full, acc)
    } else if (entry === 'page.tsx' || entry === 'page.ts') {
      acc.push(full)
    }
  }
  return acc
}

function routeFromPageFile(file: string): string | null {
  const rel = relative(join(APP), file).replace(/\\/g, '/')
  if (!rel.endsWith('/page.tsx') && !rel.endsWith('/page.ts')) return null
  const segments = rel.replace(/\/page\.tsx?$/, '').split('/')
  const filtered = segments.filter((s) => !(s.startsWith('(') && s.endsWith(')')))
  if (filtered.length === 0) return '/'
  return '/' + filtered.join('/').replace(/\[\.\.\.[^\]]+\]/g, '*')
}

function checkInternalLinks(): { broken: string[]; warnings: string[] } {
  const broken: string[] = []
  const warnings: string[] = []
  const pageFiles = findPageFiles(APP)
  const staticRoutes = new Set<string>()

  for (const file of pageFiles) {
    const route = routeFromPageFile(file)
    if (route && !route.includes('[')) staticRoutes.add(route)
  }

  const navLinks = [
    ...NAV_RESOURCE_ITEMS.map((i) => i.href),
    ...FOOTER_INTERVIEW_QUESTIONS_LINKS.map((i) => i.href),
    ...FOOTER_RESOURCES_LINKS.map((i) => i.href),
    '/campus',
    '/pricing',
    '/how-it-works',
    '/interview-questions',
  ]

  for (const href of navLinks) {
    if (href.startsWith('mailto:') || href.startsWith('http')) continue
    const pathOnly = href.split('?')[0].split('#')[0]
    if (staticRoutes.has(pathOnly)) continue
    const dynamicPattern = pathOnly.replace(/\/[^/]+/g, (m, i) => {
      if (i === 0) return m
      return '/[param]'
    })
    const hasDynamic = pageFiles.some((f) => {
      const r = routeFromPageFile(f)
      return r?.includes('[') && pathOnly.split('/').length === r.split('/').length
    })
    if (!hasDynamic && !staticRoutes.has(pathOnly)) {
      const pageCandidate = join(APP, '(marketing)', pathOnly.slice(1), 'page.tsx')
      const altCandidate = join(APP, pathOnly.slice(1), 'page.tsx')
      if (!existsSync(pageCandidate) && !existsSync(altCandidate)) {
        broken.push(`Nav/footer link missing page: ${pathOnly}`)
      }
    }
  }

  for (const route of REQUIRED_ROUTES) {
    const parts = route.slice(1).split('/')
    let check = join(APP, '(marketing)')
    for (const part of parts) {
      check = join(check, part)
    }
    const pagePath = join(check, 'page.tsx')
    if (!existsSync(pagePath)) {
      const rolePage = join(APP, '(marketing)', 'interview-questions', '[role]', 'page.tsx')
      const companyRolePage = join(
        APP,
        '(marketing)',
        'interview-questions',
        'companies',
        '[company]',
        '[role]',
        'page.tsx',
      )
      const blogSlug = route.startsWith('/blog/') && route !== '/blog'
      if (route.startsWith('/interview-questions/companies/') && existsSync(companyRolePage)) continue
      if (route.startsWith('/interview-questions/') && existsSync(rolePage)) continue
      if (blogSlug && existsSync(join(APP, '(marketing)', 'blog', parts[1], 'page.tsx'))) continue
      if (route === '/blog' && existsSync(join(APP, '(marketing)', 'blog', 'page.tsx'))) continue
      if (route === '/resources' && existsSync(join(APP, '(marketing)', 'resources', 'page.tsx'))) continue
      broken.push(`Required route page missing: ${route}`)
    }
  }

  return { broken, warnings }
}

function checkSitemap(): { count: number; duplicates: string[]; orphans: string[]; warnings: string[] } {
  const now = new Date()
  const urls = buildAllIndexableUrls(now)
  const seen = new Map<string, number>()
  const duplicates: string[] = []
  for (const url of urls) {
    seen.set(url, (seen.get(url) ?? 0) + 1)
  }
  for (const [url, count] of seen) {
    if (count > 1) duplicates.push(`${url} (${count}x)`)
  }

  const origin = getCanonicalSiteOrigin()
  const registryPaths = new Set(
    getAllContentEntries()
      .filter((e) => e.type !== 'resource-index' && e.type !== 'questions-hub')
      .map((e) => canonicalUrl(e.path)),
  )

  const sitemapPaths = new Set(urls)
  const orphans: string[] = []
  for (const path of registryPaths) {
    if (!sitemapPaths.has(path) && path.includes('/interview-questions/')) {
      orphans.push(`Registry path not in sitemap: ${path}`)
    }
  }

  const warnings: string[] = []
  const blogEntries = getBlogContentEntries()
  for (const entry of blogEntries) {
    const url = canonicalUrl(entry.path)
    if (!sitemapPaths.has(url)) {
      warnings.push(`Blog entry not in sitemap: ${entry.path}`)
    }
  }

  if (!sitemapPaths.has(canonicalUrl('/resources'))) {
    warnings.push('/resources missing from sitemap')
  }

  const blogSitemap = buildBlogSitemapEntries(now)
  for (const entry of BLOG_POST_ROUTES) {
    const url = canonicalUrl(entry.path)
    const inSitemap = blogSitemap.some((s) => s.url === url)
    if (!inSitemap && entry.path !== '/blog') {
      warnings.push(`BLOG_POST_ROUTES entry not in blog sitemap: ${entry.path}`)
    }
  }

  return { count: urls.length, duplicates, orphans, warnings }
}

function checkImages(): string[] {
  const issues: string[] = []
  for (const src of HERO_IMAGES) {
    const file = join(PUBLIC, src.replace(/^\//, ''))
    if (!existsSync(file)) issues.push(`Missing image: ${src}`)
  }
  return issues
}

function checkMetadataInPages(): string[] {
  const warnings: string[] = []
  const targets = [
    join(APP, '(marketing)', 'resources', 'page.tsx'),
    join(APP, '(marketing)', 'blog', 'page.tsx'),
    join(APP, '(marketing)', 'blog', 'top-dsa-interview-questions', 'page.tsx'),
    join(APP, '(marketing)', 'interview-questions', '[role]', 'page.tsx'),
    join(APP, '(marketing)', 'interview-questions', 'companies', '[company]', '[role]', 'page.tsx'),
  ]

  for (const file of targets) {
    if (!existsSync(file)) continue
    const content = readFileSync(file, 'utf8')
    const rel = relative(ROOT, file)
    if (!content.includes('generateMetadata') && !content.includes('export const metadata')) {
      warnings.push(`${rel}: no metadata export found`)
    }
    if (content.includes("robots: 'noindex'") || content.includes('noindex: true')) {
      warnings.push(`${rel}: contains noindex`)
    }
  }
  return warnings
}

function checkHubHrefSlugs(): string[] {
  const broken: string[] = []
  const validPaths = new Set<string>([
    '/interview-questions',
    '/interview-questions/tcs',
    '/interview-questions/solera',
    '/blog/top-dsa-interview-questions',
    ...ROLES.map((r) => roleQuestionsPath(r.slug)),
    ...COMPANIES.map((c) => companyQuestionsPath(c.slug)),
    ...SKILLS.map((s) => skillQuestionsPath(s.slug)),
  ])

  const scanDirs = [
    join(ROOT, 'src', 'lib', 'seo', 'programmatic'),
    join(ROOT, 'src', 'components', 'programmatic'),
  ]

  const hrefRe = /href:\s*['"](\/interview-questions\/[^'"]+)['"]/g

  for (const dir of scanDirs) {
    if (!existsSync(dir)) continue
    for (const file of readdirSync(dir, { recursive: true })) {
      const filePath = typeof file === 'string' ? join(dir, file) : join(dir, String(file))
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) continue
      const content = readFileSync(filePath, 'utf8')
      let m: RegExpExecArray | null
      while ((m = hrefRe.exec(content)) !== null) {
        const href = m[1].split('?')[0].split('#')[0]
        if (validPaths.has(href)) continue
        const isIntersection = /^\/interview-questions\/companies\/[^/]+\/[^/]+$/.test(href)
        if (isIntersection) continue
        broken.push(`${relative(ROOT, filePath)}: invalid hub href ${href}`)
      }
    }
  }

  return broken
}

function checkJsonLd(): { count: number; warnings: string[] } {
  const warnings: string[] = []
  let count = 0
  const marketing = join(APP, '(marketing)')
  const files = findPageFiles(marketing)
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    if (content.includes('JsonLdScript') || content.includes('application/ld+json')) {
      count++
      const ldBlocks = content.match(/JsonLdScript/g)?.length ?? 0
      if (ldBlocks > 6) warnings.push(`${relative(ROOT, file)}: ${ldBlocks} JsonLdScript blocks (review duplicates)`)
    }
  }
  return { count, warnings }
}

function main() {
  const pageFiles = findPageFiles(APP)
  const staticPages = pageFiles.filter((f) => !routeFromPageFile(f)?.includes('['))
  const { broken, warnings: linkWarnings } = checkInternalLinks()
  const hubHrefIssues = checkHubHrefSlugs()
  const sitemap = checkSitemap()
  const imageIssues = checkImages()
  const metaWarnings = checkMetadataInPages()
  const schema = checkJsonLd()

  const allContent = getAllContentEntries()
  const requiredInRegistry = REQUIRED_ROUTES.filter(
    (r) => r !== '/blog' && r !== '/resources',
  )
  const registryPaths = new Set(allContent.map((e) => e.path))
  for (const r of requiredInRegistry) {
    if (!registryPaths.has(r)) linkWarnings.push(`Registry missing: ${r}`)
  }

  console.log('=== DEPLOYMENT AUDIT ===\n')
  console.log('Typecheck/Lint: run separately via npm run typecheck && npm run lint')
  console.log(`Static page files: ${staticPages.length}`)
  console.log(`Total page files (incl. dynamic): ${pageFiles.length}`)
  console.log(`Registry discoverable entries: ${allContent.length}`)
  console.log(`Sitemap indexable URLs: ${sitemap.count}`)
  console.log(`Pages with JSON-LD: ${schema.count}`)
  console.log(`Broken internal links: ${broken.length}`)
  console.log(`Invalid hub hrefs: ${hubHrefIssues.length}`)
  console.log(`Image issues: ${imageIssues.length}`)
  console.log(`Sitemap duplicates: ${sitemap.duplicates.length}`)
  console.log(`Sitemap orphans (registry): ${sitemap.orphans.length}`)

  const allWarnings = [
    ...linkWarnings,
    ...sitemap.warnings,
    ...sitemap.orphans,
    ...metaWarnings,
    ...schema.warnings,
  ]

  if (broken.length) {
    console.log('\n--- BROKEN LINKS ---')
    broken.forEach((b) => console.log('  ✗', b))
  }
  if (hubHrefIssues.length) {
    console.log('\n--- INVALID HUB HREFS ---')
    hubHrefIssues.forEach((b) => console.log('  ✗', b))
  }
  if (imageIssues.length) {
    console.log('\n--- IMAGE ISSUES ---')
    imageIssues.forEach((i) => console.log('  ✗', i))
  }
  if (sitemap.duplicates.length) {
    console.log('\n--- SITEMAP DUPLICATES ---')
    sitemap.duplicates.forEach((d) => console.log('  ✗', d))
  }
  if (allWarnings.length) {
    console.log('\n--- WARNINGS ---')
    allWarnings.forEach((w) => console.log('  ⚠', w))
  }

  const pass =
    broken.length === 0 &&
    hubHrefIssues.length === 0 &&
    imageIssues.length === 0 &&
    sitemap.duplicates.length === 0

  console.log('\n=== RESULT ===')
  console.log(pass ? 'AUDIT_PASS' : 'AUDIT_FAIL')
  process.exit(pass ? 0 : 1)
}

main()
