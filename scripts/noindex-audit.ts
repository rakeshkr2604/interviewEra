/**
 * Noindex vs sitemap consistency audit — run: npx tsx scripts/noindex-audit.ts
 * Wired into `npm run build` — fails if any sitemap URL resolves to noindex metadata.
 */
import type { Metadata } from 'next'
import { buildAllIndexableUrls } from '../src/lib/seo/sitemap/registry'
import { generateMetadata as baseGenerateMetadata } from '../src/lib/seo/metadata'
import {
  getCompanyBySlug,
  getRoleBySlug,
  getSkillBySlug,
  HIGH_VALUE_INTERSECTIONS,
  intersectionQuestionsPath,
  roleQuestionsPath,
  skillQuestionsPath,
  companyQuestionsPath,
  questionsHubPath,
} from '../src/lib/seo/programmatic'
import {
  companyPageMetadata,
  intersectionPageMetadata,
  rolePageMetadata,
  skillPageMetadata,
  toolAtsRoleMetadata,
} from '../src/lib/seo/programmatic/metadata'
import {
  isCompanyIndexable,
  isIntersectionIndexable,
  isRoleIndexable,
  isSkillIndexable,
} from '../src/lib/seo/programmatic/indexing'
import { isReactHub, REACT_CANONICAL_PATH, REACT_DESCRIPTION, REACT_META_TITLE, REACT_HERO_PATH } from '../src/lib/seo/programmatic/react-hub'
import { isAndroidDeveloperHub } from '../src/lib/seo/programmatic/android-developer-hub'
import { isSoftwareEngineerHub } from '../src/lib/seo/programmatic/software-engineer-hub'
import { isFrontendDeveloperHub } from '../src/lib/seo/programmatic/frontend-developer-hub'
import { TCS_CANONICAL_PATH, TCS_DESCRIPTION, TCS_META_TITLE, TCS_HERO_PATH } from '../src/lib/seo/programmatic/tcs-hub'
import { getCanonicalSiteOrigin } from '../src/lib/seo/site-url'

const ORIGIN = getCanonicalSiteOrigin()

/** Routes that must stay noindex — never flag as contradictions. */
const INTENTIONAL_NOINDEX_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/interview/',
  '/report/',
  '/settings',
  '/history',
  '/analytics',
  '/upgrade',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/college/',
  '/admin/',
  '/platform/',
  '/join',
  '/open/badges',
  '/tools/question-generator/results',
  '/tools/ats-checker/results',
  '/tools/star-builder/results',
] as const

const VERIFICATION_PATHS = [
  '/interview-questions/topics/android',
  '/interview-questions/topics/react',
  '/interview-questions/software-engineer',
  '/interview-questions/java-developer',
  '/interview-questions/frontend-developer',
  '/interview-questions/companies/amazon/software-engineer',
  '/interview-questions/companies/microsoft/software-engineer',
  '/interview-questions/companies/infosys/java-developer',
  '/interview-questions/companies/wipro/data-analyst',
] as const

/**
 * Template duplicates held out of the index by `indexing.ts` — must resolve to
 * noindex and must not appear in the sitemap.
 */
const EXPECTED_NOINDEX_PATHS = [
  '/interview-questions/companies/tcs/java-developer',
  '/interview-questions/companies/cognizant/software-engineer',
  '/interview-questions/companies/cred/backend-developer',
  '/tools/ats-checker/software-engineer',
] as const

function pathFromUrl(url: string): string {
  return url.replace(ORIGIN, '').split('#')[0] || '/'
}

function metadataImpliesNoIndex(meta: Metadata | null | undefined): boolean {
  if (!meta) return false
  const robots = meta.robots
  if (!robots) return false
  if (typeof robots === 'string') return robots.toLowerCase().includes('noindex')
  if (typeof robots === 'object') {
    if ('index' in robots && robots.index === false) return true
    const gb = robots.googleBot
    if (gb && typeof gb === 'object' && 'index' in gb && gb.index === false) return true
  }
  return false
}

function resolveMetadata(path: string): Metadata | null {
  if (path === TCS_CANONICAL_PATH) {
    return baseGenerateMetadata({
      title: TCS_META_TITLE,
      description: TCS_DESCRIPTION,
      path: TCS_CANONICAL_PATH,
      ogImage: `${ORIGIN}${TCS_HERO_PATH}`,
      noIndex: false,
    })
  }

  const topicMatch = path.match(/^\/interview-questions\/topics\/([^/]+)$/)
  if (topicMatch) {
    const skill = getSkillBySlug(topicMatch[1])
    if (!skill) return null
    if (isReactHub(skill.slug)) {
      return baseGenerateMetadata({
        title: REACT_META_TITLE,
        description: REACT_DESCRIPTION,
        path: REACT_CANONICAL_PATH,
        ogImage: `${ORIGIN}${REACT_HERO_PATH}`,
        noIndex: false,
        openGraphType: 'article',
      })
    }
    return skillPageMetadata(skill)
  }

  const atsRoleMatch = path.match(/^\/tools\/ats-checker\/([^/]+)$/)
  if (atsRoleMatch) {
    const role = getRoleBySlug(atsRoleMatch[1])
    return role ? toolAtsRoleMetadata(role) : null
  }

  const intersectionMatch = path.match(/^\/interview-questions\/companies\/([^/]+)\/([^/]+)$/)
  if (intersectionMatch) {
    const company = getCompanyBySlug(intersectionMatch[1])
    const role = getRoleBySlug(intersectionMatch[2])
    if (!company || !role) return null
    if (company.slug === 'amazon' && role.slug === 'software-engineer') {
      return baseGenerateMetadata({ title: 'Amazon SE', description: 'Amazon', path, noIndex: false })
    }
    if (company.slug === 'microsoft' && role.slug === 'software-engineer') {
      return baseGenerateMetadata({ title: 'Microsoft SE', description: 'Microsoft', path, noIndex: false })
    }
    if (company.slug === 'infosys' && role.slug === 'java-developer') {
      return baseGenerateMetadata({ title: 'Infosys Java', description: 'Infosys', path, noIndex: false })
    }
    if (company.slug === 'infosys' && role.slug === 'software-engineer') {
      return baseGenerateMetadata({ title: 'Infosys SE', description: 'Infosys', path, noIndex: false })
    }
    if (company.slug === 'freshworks' && role.slug === 'frontend-developer') {
      return baseGenerateMetadata({ title: 'Freshworks FE', description: 'Freshworks', path, noIndex: false })
    }
    return intersectionPageMetadata(company, role)
  }

  const companyMatch = path.match(/^\/interview-questions\/companies\/([^/]+)$/)
  if (companyMatch) {
    const company = getCompanyBySlug(companyMatch[1])
    if (!company) return null
    return companyPageMetadata(company)
  }

  const roleMatch = path.match(/^\/interview-questions\/([^/]+)$/)
  if (roleMatch && path !== questionsHubPath()) {
    const role = getRoleBySlug(roleMatch[1])
    if (!role) return null
    if (isAndroidDeveloperHub(role.slug) || isSoftwareEngineerHub(role.slug) || isFrontendDeveloperHub(role.slug)) {
      return baseGenerateMetadata({
        title: role.label,
        description: role.description ?? role.label,
        path: roleQuestionsPath(role.slug),
        noIndex: false,
      })
    }
    return rolePageMetadata(role)
  }

  return null
}

function expectedIndexableFlag(path: string): boolean {
  const topicMatch = path.match(/^\/interview-questions\/topics\/([^/]+)$/)
  if (topicMatch) {
    const skill = getSkillBySlug(topicMatch[1])
    return skill ? isSkillIndexable(skill) || isReactHub(skill.slug) : false
  }
  const intersectionMatch = path.match(/^\/interview-questions\/companies\/([^/]+)\/([^/]+)$/)
  if (intersectionMatch) {
    const company = getCompanyBySlug(intersectionMatch[1])
    const role = getRoleBySlug(intersectionMatch[2])
    return company && role ? isIntersectionIndexable(company, role) : false
  }
  const companyMatch = path.match(/^\/interview-questions\/companies\/([^/]+)$/)
  if (companyMatch) {
    const company = getCompanyBySlug(companyMatch[1])
    return company ? isCompanyIndexable(company) : false
  }
  const roleMatch = path.match(/^\/interview-questions\/([^/]+)$/)
  if (roleMatch && path !== questionsHubPath()) {
    const role = getRoleBySlug(roleMatch[1])
    return role ? isRoleIndexable(role) : false
  }
  return true
}

type Row = {
  url: string
  inSitemap: boolean
  indexable: boolean
  noindex: boolean
  status: 'OK' | 'FAIL'
  note: string
}

function main() {
  const sitemapUrls = new Set(buildAllIndexableUrls())
  const failures: string[] = []
  const rows: Row[] = []

  for (const url of sitemapUrls) {
    const path = pathFromUrl(url)
    const meta = resolveMetadata(path)
    const noindex = metadataImpliesNoIndex(meta)
    const row: Row = {
      url: path,
      inSitemap: true,
      indexable: !noindex,
      noindex,
      status: noindex ? 'FAIL' : 'OK',
      note: noindex ? 'Sitemap URL emits noindex metadata' : 'index,follow',
    }
    rows.push(row)
    if (noindex) failures.push(path)
  }

  for (const pair of HIGH_VALUE_INTERSECTIONS) {
    const path = intersectionQuestionsPath(pair.company, pair.role)
    const url = `${ORIGIN}${path}`
    if (sitemapUrls.has(url)) continue
    const company = getCompanyBySlug(pair.company)
    const role = getRoleBySlug(pair.role)
    if (!company || !role) continue
    const shouldIndex = isIntersectionIndexable(company, role)
    const meta = resolveMetadata(path)
    const noindex = metadataImpliesNoIndex(meta)
    if (shouldIndex && noindex) {
      failures.push(`${path} (indexable gate=true but metadata noindex)`)
    }
    if (shouldIndex && !sitemapUrls.has(url)) {
      failures.push(`${path} (indexable but missing from sitemap)`)
    }
  }

  console.log('=== NOINDEX AUDIT ===\n')
  console.log(`Sitemap URLs: ${sitemapUrls.size}`)
  console.log(`Contradictions (in sitemap + noindex): ${failures.length}\n`)

  if (rows.length) {
    console.log('| URL | In Sitemap | Indexable | Status |')
    console.log('|-----|------------|-----------|--------|')
    for (const r of rows.filter((x) => x.url.includes('topics/') || x.url.includes('companies/')).slice(0, 40)) {
      console.log(`| ${r.url} | ${r.inSitemap} | ${r.indexable} | ${r.status} |`)
    }
    if (rows.length > 40) console.log(`| … +${rows.length - 40} more | | | |`)
  }

  console.log('\n--- Verification paths ---')
  for (const path of VERIFICATION_PATHS) {
    const meta = resolveMetadata(path)
    const noindex = metadataImpliesNoIndex(meta)
    const inSitemap = sitemapUrls.has(`${ORIGIN}${path}`)
    const flag = noindex ? 'noindex' : 'index,follow'
    const ok = !noindex
    console.log(`${ok ? '✓' : '✗'} ${path} → ${flag} (sitemap: ${inSitemap})`)
    if (noindex) failures.push(`${path} (verification path noindex)`)
  }

  console.log('\n--- Expected noindex paths ---')
  for (const path of EXPECTED_NOINDEX_PATHS) {
    const noindex = metadataImpliesNoIndex(resolveMetadata(path))
    const inSitemap = sitemapUrls.has(`${ORIGIN}${path}`)
    const ok = noindex && !inSitemap
    console.log(`${ok ? '✓' : '✗'} ${path} → ${noindex ? 'noindex' : 'index,follow'} (sitemap: ${inSitemap})`)
    if (!ok) failures.push(`${path} (expected noindex and absent from sitemap)`)
  }

  console.log('\n=== RESULT ===')
  if (failures.length === 0) {
    console.log('PASS')
    process.exit(0)
  } else {
    console.log('FAIL')
    console.log('\nAffected URLs:')
    for (const f of [...new Set(failures)]) console.log(`  - ${f}`)
    process.exit(1)
  }
}

main()
