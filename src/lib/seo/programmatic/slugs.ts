/**
 * URL path builders, type guards, lookup helpers, and intersection pair data
 * for programmatic SEO pages.
 *
 * This is the single source of truth for all programmatic URL shapes.
 * Page files, sitemap builders, and metadata generators all call these
 * helpers — no URL string is constructed inline anywhere else.
 *
 * URL architecture:
 *   /interview-questions                           ← hub index
 *   /interview-questions/[role]                    ← role pages
 *   /interview-questions/companies/[company]       ← company pages
 *   /interview-questions/[company]/[role]          ← intersection pages
 *   /interview-questions/topics/[skill]            ← skill/topic pages
 *   /tools/question-generator/[role]               ← tool-variant pages (role)
 *   /tools/question-generator/companies/[company]  ← tool-variant pages (company)
 *
 * Changing a URL prefix:
 *   Update the PATHS constant below — all helpers derive from it automatically.
 */

import { ROLES, type Role, type RoleSlug } from './roles'
import { COMPANIES, type Company, type CompanySlug } from './companies'
import { SKILLS, type Skill, type SkillSlug } from './skills'
import { STAR_TOPICS, type StarTopicSlug } from './star-topics'
import type { IntersectionPair } from './types'

// ─── URL prefix constants ─────────────────────────────────────────────────────

/**
 * All programmatic URL prefixes in one place.
 * Update here if any route segment is ever renamed.
 */
export const PATHS = {
  hub: '/interview-questions',
  roleBase: '/interview-questions',
  companyBase: '/interview-questions/companies',
  skillBase: '/interview-questions/topics',
  toolVariantRoleBase: '/tools/question-generator',
  toolVariantCompanyBase: '/tools/question-generator/companies',
  toolAtsRoleBase: '/tools/ats-checker',
  toolStarTopicBase: '/tools/star-builder',
} as const

// ─── URL path builders ────────────────────────────────────────────────────────
// All return relative paths (no origin). Pass to canonicalUrl() when needed.

/** /interview-questions */
export function questionsHubPath(): string {
  return PATHS.hub
}

/** /interview-questions/software-engineer */
export function roleQuestionsPath(slug: RoleSlug): string {
  return `${PATHS.roleBase}/${slug}`
}

/** /interview-questions/tcs (pillar hub) or /interview-questions/companies/{slug} */
export function companyQuestionsPath(slug: CompanySlug): string {
  if (slug === 'tcs') return '/interview-questions/tcs'
  return `${PATHS.companyBase}/${slug}`
}

/**
 * /interview-questions/companies/tcs/software-engineer
 *
 * Intersections live under /companies/ to avoid a Next.js App Router conflict:
 * having both `[role]/page.tsx` and a sibling `[company]/page.tsx` at the same
 * directory level creates an ambiguous dynamic segment. Placing intersections
 * under `companies/[company]/[role]` resolves this cleanly since `companies` is
 * a static segment that takes precedence over the `[role]` dynamic segment.
 */
export function intersectionQuestionsPath(company: CompanySlug, role: RoleSlug): string {
  return `${PATHS.companyBase}/${company}/${role}`
}

/** /interview-questions/topics/react */
export function skillQuestionsPath(slug: SkillSlug): string {
  return `${PATHS.skillBase}/${slug}`
}

/** /tools/question-generator/software-engineer */
export function toolVariantRolePath(slug: RoleSlug): string {
  return `${PATHS.toolVariantRoleBase}/${slug}`
}

/** /tools/question-generator/companies/tcs */
export function toolVariantCompanyPath(slug: CompanySlug): string {
  return `${PATHS.toolVariantCompanyBase}/${slug}`
}

/** /tools/ats-checker/software-engineer */
export function toolAtsRolePath(slug: RoleSlug): string {
  return `${PATHS.toolAtsRoleBase}/${slug}`
}

/** /tools/star-builder/team-conflict */
export function toolStarTopicPath(slug: StarTopicSlug): string {
  return `${PATHS.toolStarTopicBase}/${slug}`
}

// ─── Type guards ──────────────────────────────────────────────────────────────
// Use these at route boundaries (page.tsx, API routes) to safely narrow a
// string param before calling any typed helper.

const ROLE_SLUG_SET = new Set<string>(ROLES.map((r) => r.slug))
const COMPANY_SLUG_SET = new Set<string>(COMPANIES.map((c) => c.slug))
const SKILL_SLUG_SET = new Set<string>(SKILLS.map((s) => s.slug))

/** Returns true and narrows type when `slug` is a valid RoleSlug. */
export function isRoleSlug(slug: string): slug is RoleSlug {
  return ROLE_SLUG_SET.has(slug)
}

/** Returns true and narrows type when `slug` is a valid CompanySlug. */
export function isCompanySlug(slug: string): slug is CompanySlug {
  return COMPANY_SLUG_SET.has(slug)
}

/** Returns true and narrows type when `slug` is a valid SkillSlug. */
export function isSkillSlug(slug: string): slug is SkillSlug {
  return SKILL_SLUG_SET.has(slug)
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────
// These accept `string` (the raw page param) and return the narrowly-typed
// entry or undefined so callers can notFound() gracefully.

/**
 * Returns the Role entry for a slug, or undefined.
 * Use at the top of every role page.tsx: `const role = getRoleBySlug(params.role) ?? notFound()`
 */
export function getRoleBySlug(slug: string): Role | undefined {
  return ROLES.find((r) => r.slug === slug) as Role | undefined
}

/** Returns the Company entry for a slug, or undefined. */
export function getCompanyBySlug(slug: string): Company | undefined {
  return COMPANIES.find((c) => c.slug === slug) as Company | undefined
}

/** Returns the Skill entry for a slug, or undefined. */
export function getSkillBySlug(slug: string): Skill | undefined {
  return SKILLS.find((s) => s.slug === slug) as Skill | undefined
}

// ─── Static param generators (for generateStaticParams) ──────────────────────
// Named to match Next.js convention: return `Array<{ [param]: string }>`.

/** All role slugs — for /interview-questions/[role]/generateStaticParams */
export function allRoleParams(): Array<{ role: string }> {
  return ROLES.map((r) => ({ role: r.slug }))
}

/** All company slugs — for /interview-questions/companies/[company]/generateStaticParams */
export function allCompanyParams(): Array<{ company: string }> {
  return COMPANIES.map((c) => ({ company: c.slug }))
}

/** All skill slugs — for /interview-questions/topics/[skill]/generateStaticParams */
export function allSkillParams(): Array<{ skill: string }> {
  return SKILLS.map((s) => ({ skill: s.slug }))
}

/**
 * All role slugs for tool-variant pages — identical to allRoleParams() but
 * kept as a separate export so tool route and question route can evolve
 * independently (e.g. tool variants may be a subset of roles).
 */
export function allToolVariantRoleParams(): Array<{ role: string }> {
  return ROLES.map((r) => ({ role: r.slug }))
}

/** All company slugs — for /tools/question-generator/companies/[company]/generateStaticParams */
export function allToolVariantCompanyParams(): Array<{ company: string }> {
  return COMPANIES.map((c) => ({ company: c.slug }))
}

/** All role slugs — for /tools/ats-checker/[role]/generateStaticParams */
export function allAtsRoleParams(): Array<{ role: string }> {
  return ROLES.map((r) => ({ role: r.slug }))
}

/** All STAR topic slugs — for /tools/star-builder/[topic]/generateStaticParams */
export function allStarTopicParams(): Array<{ topic: string }> {
  return STAR_TOPICS.map((t) => ({ topic: t.slug }))
}

/**
 * High-value company × role intersection params.
 *
 * Only pairs with documented search demand are generated as static pages.
 * Generating all 20 × 29 = 580 combinations would create hundreds of thin pages
 * for combinations nobody searches — which Google penalises as low-quality.
 *
 * Criteria for inclusion:
 * - The company + role combination appears in Indian job listings regularly.
 * - Estimated monthly search volume ≥ 500 (India geo).
 * - The company tier makes the role plausible (service companies mostly hire
 *   SWE/DA/BA freshers; MNCs hire SE/MLE; startups hire SE/BE/DA).
 *
 * To add a pair: append to HIGH_VALUE_INTERSECTIONS below.
 * To remove a pair: delete the entry — the static page will 404 on next build
 *   and should be redirected if it was previously live.
 */
export const HIGH_VALUE_INTERSECTIONS: readonly IntersectionPair[] = [
  // TCS — highest search volume of any Indian company
  { company: 'tcs', role: 'software-engineer' },
  { company: 'tcs', role: 'data-analyst' },
  { company: 'tcs', role: 'java-developer' },
  { company: 'tcs', role: 'business-analyst' },
  { company: 'tcs', role: 'frontend-developer' },
  { company: 'tcs', role: 'python-developer' },

  // Infosys
  { company: 'infosys', role: 'software-engineer' },
  { company: 'infosys', role: 'data-analyst' },
  { company: 'infosys', role: 'java-developer' },
  { company: 'infosys', role: 'python-developer' },
  { company: 'infosys', role: 'business-analyst' },

  // Wipro
  { company: 'wipro', role: 'software-engineer' },
  { company: 'wipro', role: 'java-developer' },
  { company: 'wipro', role: 'data-analyst' },
  { company: 'wipro', role: 'qa-engineer' },

  // HCL
  { company: 'hcl', role: 'software-engineer' },
  { company: 'hcl', role: 'java-developer' },
  { company: 'hcl', role: 'data-analyst' },

  // Cognizant
  { company: 'cognizant', role: 'software-engineer' },
  { company: 'cognizant', role: 'data-analyst' },
  { company: 'cognizant', role: 'business-analyst' },

  // Accenture
  { company: 'accenture', role: 'software-engineer' },
  { company: 'accenture', role: 'data-analyst' },
  { company: 'accenture', role: 'business-analyst' },
  { company: 'accenture', role: 'frontend-developer' },

  // IBM
  { company: 'ibm', role: 'software-engineer' },
  { company: 'ibm', role: 'data-analyst' },
  { company: 'ibm', role: 'data-scientist' },

  // Capgemini
  { company: 'capgemini', role: 'software-engineer' },
  { company: 'capgemini', role: 'java-developer' },

  // Tech Mahindra
  { company: 'tech-mahindra', role: 'software-engineer' },
  { company: 'tech-mahindra', role: 'java-developer' },

  // Google — aspirational; very high search volume despite low placement volume
  { company: 'google', role: 'software-engineer' },
  { company: 'google', role: 'machine-learning-engineer' },
  { company: 'google', role: 'data-scientist' },

  // Microsoft
  { company: 'microsoft', role: 'software-engineer' },
  { company: 'microsoft', role: 'data-scientist' },
  { company: 'microsoft', role: 'product-manager' },

  // Amazon
  { company: 'amazon', role: 'software-engineer' },
  { company: 'amazon', role: 'data-analyst' },
  { company: 'amazon', role: 'machine-learning-engineer' },

  // Indian product companies
  { company: 'flipkart', role: 'software-engineer' },
  { company: 'flipkart', role: 'data-analyst' },
  { company: 'swiggy', role: 'software-engineer' },
  { company: 'swiggy', role: 'backend-developer' },
  { company: 'zomato', role: 'software-engineer' },
  { company: 'zomato', role: 'backend-developer' },
  { company: 'razorpay', role: 'software-engineer' },
  { company: 'razorpay', role: 'backend-developer' },
  { company: 'phonepe', role: 'software-engineer' },
  { company: 'phonepe', role: 'data-analyst' },
  { company: 'zoho', role: 'software-engineer' },
  { company: 'zoho', role: 'java-developer' },
  { company: 'zoho', role: 'frontend-developer' },
  { company: 'freshworks', role: 'software-engineer' },
  { company: 'freshworks', role: 'frontend-developer' },
  { company: 'cred', role: 'software-engineer' },
  { company: 'cred', role: 'backend-developer' },
  { company: 'groww', role: 'software-engineer' },
  { company: 'groww', role: 'data-analyst' },
  { company: 'meesho', role: 'software-engineer' },
  { company: 'meesho', role: 'backend-developer' },
  { company: 'zerodha', role: 'software-engineer' },
  { company: 'zerodha', role: 'data-analyst' },
] as const

/**
 * `generateStaticParams` shape for /interview-questions/[company]/[role].
 * Returns all high-value pairs as Next.js-compatible param objects.
 */
export function highValueIntersectionParams(): Array<{ company: string; role: string }> {
  return HIGH_VALUE_INTERSECTIONS.map((p) => ({ company: p.company, role: p.role }))
}

/**
 * Returns all intersection pairs for a given company.
 * Useful for building a "related roles" list on company pages.
 */
export function intersectionsForCompany(slug: CompanySlug): readonly IntersectionPair[] {
  return HIGH_VALUE_INTERSECTIONS.filter((p) => p.company === slug)
}

/**
 * Returns all intersection pairs for a given role.
 * Useful for building a "companies hiring for this role" list on role pages.
 */
export function intersectionsForRole(slug: RoleSlug): readonly IntersectionPair[] {
  return HIGH_VALUE_INTERSECTIONS.filter((p) => p.role === slug)
}

// ─── Slug text-formatting helpers ─────────────────────────────────────────────

/**
 * Converts a slug to Title Case display text.
 * Used as a last-resort fallback when no data entry is found.
 * Prefer using `.label` from the data entry wherever possible.
 *
 * "software-engineer" → "Software Engineer"
 * "node-js" → "Node Js" (imperfect — always prefer `.label` for branded names)
 */
export function slugToTitleCase(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Converts an arbitrary string to a URL-safe slug.
 * Used when constructing slugs from user-supplied strings (e.g. search queries).
 * NOT used for the static data arrays — those have manually curated slugs.
 *
 * "Software Engineer" → "software-engineer"
 * "Node.js Developer" → "nodejs-developer"
 */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove special chars (including dots in "Node.js")
    .trim()
    .replace(/\s+/g, '-')          // spaces to hyphens
    .replace(/-+/g, '-')           // collapse multiple hyphens
}
