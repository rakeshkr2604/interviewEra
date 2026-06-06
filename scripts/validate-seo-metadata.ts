/** Validate SEO title/description lengths from codebase metadata — no HTTP. */
import {
  ROLES,
  COMPANIES,
  SKILLS,
  STAR_TOPICS,
  HIGH_VALUE_INTERSECTIONS,
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
  rolePageMetadata,
  companyPageMetadata,
  intersectionPageMetadata,
  skillPageMetadata,
  questionsHubMetadata,
  toolVariantRoleMetadata,
  toolQGenCompanyMetadata,
  toolAtsRoleMetadata,
  toolStarTopicMetadata,
} from '../src/lib/seo/programmatic/metadata'
import { brandPageTitle, SEO_MAX_DESCRIPTION, SEO_MAX_DOCUMENT_TITLE } from '../src/lib/seo/metadata'

function fullTitle(meta: { title?: unknown }): string {
  const t = meta.title
  if (typeof t === 'string') return brandPageTitle(t)
  if (t && typeof t === 'object' && 'absolute' in t) return String((t as { absolute: string }).absolute)
  return String(t)
}

function desc(meta: { description?: string | null }) {
  return meta.description ?? ''
}

const issues: string[] = []

function check(label: string, meta: { title?: unknown; description?: string | null }) {
  const title = fullTitle(meta)
  const d = desc(meta)
  if (title.length > SEO_MAX_DOCUMENT_TITLE) issues.push(`${label}: title ${title.length} "${title}"`)
  if (d.length > SEO_MAX_DESCRIPTION) issues.push(`${label}: desc ${d.length}`)
}

check('hub', questionsHubMetadata())
for (const role of ROLES) {
  if (isRoleIndexable(role)) check(`role/${role.slug}`, rolePageMetadata(role))
  check(`tool/qgen/${role.slug}`, toolVariantRoleMetadata(role))
  check(`tool/ats/${role.slug}`, toolAtsRoleMetadata(role))
}
for (const company of COMPANIES) {
  if (isCompanyIndexable(company)) check(`company/${company.slug}`, companyPageMetadata(company))
  check(`tool/qgen-co/${company.slug}`, toolQGenCompanyMetadata(company))
}
for (const pair of HIGH_VALUE_INTERSECTIONS) {
  const c = getCompanyBySlug(pair.company)!
  const r = getRoleBySlug(pair.role)!
  check(`ix/${pair.company}/${pair.role}`, intersectionPageMetadata(c, r))
}
for (const skill of SKILLS) {
  if (isSkillIndexable(skill)) check(`skill/${skill.slug}`, skillPageMetadata(skill))
}
for (const topic of STAR_TOPICS) {
  check(`star/${topic.slug}`, toolStarTopicMetadata(topic))
}

console.log(`Metadata length issues: ${issues.length}`)
issues.slice(0, 30).forEach((i) => console.log(' ', i))
if (issues.length > 30) console.log(` ... +${issues.length - 30} more`)
process.exit(issues.length > 0 ? 1 : 0)
