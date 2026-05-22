/**
 * Programmatic internal linking engine.
 *
 * ── Linking strategy overview ─────────────────────────────────────────────────
 *
 * The site has five entity types: Role, Company, Skill, StarTopic, and tool
 * variants of each. Each entity page has three linking jobs:
 *
 *   1. Upward links   → Hub pages (interview-questions, /tools/*) receive
 *                       PageRank from every leaf. This concentrates authority
 *                       at hubs and keeps every page ≤3 hops from the homepage.
 *
 *   2. Peer links     → Same-category/tier entities link to each other.
 *                       Co-citation (linking to the same set of pages) is a
 *                       topical-authority signal Google uses to infer that
 *                       entities belong to the same cluster. Roles in the
 *                       "engineering" category link to each other; "service"
 *                       companies link to each other; STAR topics link within
 *                       behavioral themes.
 *
 *   3. Cross-entity   → Role → companies (via HIGH_VALUE_INTERSECTIONS).
 *                       Skill → roles (via relatedRoles). Company → roles.
 *                       These edges form the semantic graph Google uses to
 *                       understand entity co-occurrence — e.g. that "React"
 *                       co-occurs with "Frontend Developer" and with specific
 *                       product-tier companies.
 *
 * ── Content → Tool funnel ─────────────────────────────────────────────────────
 *
 *   Every content (question) page links to its matching tool variant page.
 *   Every tool page links to /signup (money page).
 *   This creates a 2-hop path from SEO-traffic to conversion, and channels
 *   PageRank from high-volume content pages toward conversion pages.
 *
 * ── Topic clustering (topical authority) ──────────────────────────────────────
 *
 *   Google's Helpful Content update rewards sites that have clear topical
 *   depth on a subject. The linking graph must form visible clusters:
 *
 *   - Engineering cluster: SWE ↔ FE Dev ↔ BE Dev ↔ Java Dev, all link to
 *     DSA/System Design skill pages, all link to MNC company pages.
 *   - Service tier cluster: TCS ↔ Infosys ↔ Wipro, all link to
 *     Java/SQL/aptitude skill pages, all link to fresher-friendly roles.
 *   - Behavioral cluster: STAR topics link within thematic groups
 *     (conflict→communication, technical-challenge→new-technology, etc.)
 *
 * ── Crawl budget optimisation ─────────────────────────────────────────────────
 *
 *   The sitemap has ~200 programmatic pages. Google's crawl budget for a
 *   new site is limited. Every page must be reachable within 3 hops:
 *
 *   Homepage (depth 0)
 *     → Hub pages (depth 1)          — linked from nav and sitemap
 *         → Entity pages (depth 2)   — linked from hub + cross-entity peers
 *             → Intersection pages   — linked from role + company pages (depth 3)
 *
 *   The engine guarantees every entity page links back to its hub, and
 *   cross-entity links create a dense graph at depth 2 so Google can reach
 *   all pages from any entry point in 2 hops.
 *
 * ── Anti-spam constraints ──────────────────────────────────────────────────────
 *
 *   - MAX_SECTION_LINKS: caps per section (prevents link-farm appearance).
 *   - dedupeLinks: same URL cannot appear twice on one page.
 *   - Self-links are always filtered (entity never links to itself).
 *   - Sections are semantically labelled (heading describes the relationship).
 *   - Tool funnel links appear once per page in a dedicated section.
 *
 * ── PageRank flow optimisation ────────────────────────────────────────────────
 *
 *   High sitemapPriority entities (TCS: 0.88, Software Engineer: 0.88) have
 *   more inbound internal links because they rank higher in peer link lists
 *   (peers are sorted descending by sitemapPriority before capping).
 *   This matches the real-world authority those pages should accumulate —
 *   Google rewards pages that receive consistent internal signals.
 */

import {
  ROLES,
  COMPANIES,
  SKILLS,
  roleQuestionsPath,
  companyQuestionsPath,
  skillQuestionsPath,
  questionsHubPath,
  toolVariantRolePath,
  toolVariantCompanyPath,
  toolAtsRolePath,
  toolStarTopicPath,
  intersectionsForRole,
  intersectionsForCompany,
  getRoleBySlug,
  getCompanyBySlug,
  getSkillBySlug,
  getStarTopicBySlug,
} from '@/lib/seo/programmatic'
import type {
  Role,
  Company,
  Skill,
  StarTopic,
  RoleSlug,
  CompanySlug,
  SkillSlug,
  StarTopicSlug,
  RoleCategory,
  CompanyTier,
} from '@/lib/seo/programmatic'
import type { SeoTextLink } from '@/lib/seo/internal-links'

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * A labelled group of internal links for one relationship type.
 * Rendered by SeoCrossLinksSection on each page.
 */
export interface LinkSection {
  readonly heading: string
  readonly links: readonly SeoTextLink[]
}

// ─── Tuning constants ─────────────────────────────────────────────────────────
// Adjust these to change density without touching any page template.

const MAX_SKILL_LINKS = 8   // topic cluster links (role → skills)
const MAX_COMPANY_LINKS = 6 // cross-entity (role → hiring companies)
const MAX_ROLE_LINKS = 5    // peer role links
const MAX_PEER_COMPANY = 5  // peer company links (same tier)
const MAX_INTERSECTION = 6  // company→roles or role→companies
const MAX_STAR_RELATED = 4  // related STAR topics
const MAX_BLOG_LINKS = 3    // editorial links per page

// ─── Blog post targeting table ────────────────────────────────────────────────
// Maps each blog post to the entity contexts where it is relevant.
// Only matching posts appear in a page's "Guides" section — no generic lists.

interface BlogEntry extends SeoTextLink {
  roleCategories?: readonly RoleCategory[]
  companyTiers?: readonly CompanyTier[]
  fresherOnly?: boolean
}

const TARGETED_BLOG_POSTS: readonly BlogEntry[] = [
  {
    href: '/blog/what-is-star-method-with-examples',
    label: 'STAR method with examples',
    // Universal — behavioral rounds happen everywhere.
  },
  {
    href: '/blog/hr-interview-answer-tips-and-tricks',
    label: 'HR interview answer tips',
    // Universal — every company has an HR round.
  },
  {
    href: '/blog/how-to-prepare-for-placement-interviews',
    label: 'Placement interview prep guide',
    fresherOnly: true,
    companyTiers: ['service', 'product'],
  },
  {
    href: '/blog/top-10-interview-questions-freshers-india-2026',
    label: 'Top fresher interview questions',
    fresherOnly: true,
  },
  {
    href: '/blog/top-interview-questions-for-software-engineers',
    label: 'Software engineer interview guide',
    roleCategories: ['engineering'],
  },
  {
    href: '/blog/top-dsa-interview-questions',
    label: 'Top DSA interview questions',
    roleCategories: ['engineering'],
    companyTiers: ['mnc', 'product'],
  },
]

// ─── STAR behavioral theme clusters ──────────────────────────────────────────
// Groups STAR topics so pages within the same theme link to each other first.
// These clusters supplement the per-topic `relatedTopics` array in star-topics.ts.

const STAR_THEME_CLUSTERS: readonly (readonly string[])[] = [
  ['team-conflict', 'disagreement-with-manager', 'collaboration', 'stakeholder-management'],
  ['leadership', 'initiative', 'mentoring', 'goal-achievement'],
  ['technical-challenge', 'new-technology', 'innovation', 'process-improvement'],
  ['failure-learning', 'ambiguity', 'crisis-management', 'resilience'],
  ['tight-deadline', 'difficult-decision', 'prioritization', 'customer-focus'],
]

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Removes duplicate hrefs and any link whose href matches the current page.
 * Protects against the same URL appearing twice on one page.
 */
function dedupeLinks(links: SeoTextLink[], currentHref?: string): SeoTextLink[] {
  const seen = new Set<string>(currentHref ? [currentHref] : [])
  return links.filter((l) => {
    if (seen.has(l.href)) return false
    seen.add(l.href)
    return true
  })
}

/**
 * Sorts a list of links by the sitemapPriority of their target entity.
 * High-priority targets (TCS, SWE) appear first — this concentrates
 * internal PageRank on the pages that should rank for competitive queries.
 */
function byPriority<T extends { sitemapPriority: number }>(
  entities: readonly T[],
): readonly T[] {
  return [...entities].sort((a, b) => b.sitemapPriority - a.sitemapPriority)
}

/**
 * Filters blog posts that match the given role context.
 * Avoids showing a "placement guide" to an experienced-only MNC role page.
 */
function blogLinksForRole(role: Role): SeoTextLink[] {
  return TARGETED_BLOG_POSTS
    .filter((post) => {
      if (post.fresherOnly && !role.fresherFriendly) return false
      if (post.roleCategories && !post.roleCategories.includes(role.category)) return false
      return true
    })
    .map(({ href, label }) => ({ href, label }))
    .slice(0, MAX_BLOG_LINKS)
}

/**
 * Filters blog posts that match the given company context.
 */
function blogLinksForCompany(company: Company): SeoTextLink[] {
  return TARGETED_BLOG_POSTS
    .filter((post) => {
      if (post.fresherOnly && !company.fresherHiring) return false
      if (post.companyTiers && !post.companyTiers.includes(company.tier)) return false
      return true
    })
    .map(({ href, label }) => ({ href, label }))
    .slice(0, MAX_BLOG_LINKS)
}

/**
 * Finds all skill entities whose relatedRoles includes the given role slug.
 * Used to build "key topics" sections on role pages — skills relevant to a
 * role appear on both the role page (via primarySkills) and the skill page
 * (via relatedRoles), forming bidirectional links that reinforce co-citation.
 */
function skillsForRole(role: Role): readonly Skill[] {
  const fromPrimary = role.primarySkills
    .map((s) => getSkillBySlug(s))
    .filter((s): s is Skill => s !== undefined)

  return byPriority(fromPrimary).slice(0, MAX_SKILL_LINKS) as Skill[]
}

/**
 * Returns roles that reference this skill in their primarySkills array.
 * Derived at call time so it auto-updates when new roles are added.
 */
function rolesForSkill(skill: Skill): readonly Role[] {
  const explicit = skill.relatedRoles
    .map((s) => getRoleBySlug(s))
    .filter((r): r is Role => r !== undefined)

  // Also pick up roles that have this skill in primarySkills but are not
  // listed in skill.relatedRoles (defensive coverage).
  // Cast to string[] — `as const satisfies` narrows includes() param to 'never' on literal tuples.
  const implicit = ROLES.filter(
    (r) =>
      (r.primarySkills as readonly string[]).includes(skill.slug) &&
      !(skill.relatedRoles as readonly string[]).includes(r.slug),
  )

  return byPriority([...explicit, ...implicit]).slice(0, MAX_ROLE_LINKS) as Role[]
}

/**
 * Returns the thematic cluster a STAR topic belongs to (for peer linking).
 * Returns [] if the topic is not in any cluster (falls back to relatedTopics).
 */
function starClusterPeers(topicSlug: string): readonly StarTopic[] {
  const cluster = STAR_THEME_CLUSTERS.find((c) => c.includes(topicSlug)) ?? []
  return cluster
    .filter((s) => s !== topicSlug)
    .map((s) => getStarTopicBySlug(s))
    .filter((t): t is StarTopic => t !== undefined)
}

// ─── Section builders ─────────────────────────────────────────────────────────

// ── Role page (/interview-questions/[role]) ───────────────────────────────────

/**
 * Returns skill topic links for the role page's pill-badge section.
 *
 * Kept separate from buildRolePageLinks because the role page renders skill
 * links as pill badges (special design), not as a SeoCrossLinksSection grid.
 * All other cross-link sections go through buildRolePageLinks.
 */
export function buildRoleSkillLinks(role: Role): readonly SeoTextLink[] {
  return skillsForRole(role).map((skill) => ({
    href: skillQuestionsPath(skill.slug as SkillSlug),
    label: skill.shortLabel,
  }))
}

/**
 * Link sections for role question pages (rendered via SeoCrossLinksSection).
 * Skill topics are excluded — they're rendered as pill badges via buildRoleSkillLinks.
 *
 * Section order (deliberate — mirrors user's reading flow):
 *   1. Companies hiring      → cross-entity (role → company); high click-through
 *   2. Practice tools        → content → tool funnel; passes PageRank to tools
 *   3. Related roles         → peer linking; expands topical cluster
 *   4. Guides & resources    → upward editorial links; increases hub PageRank
 */
export function buildRolePageLinks(role: Role): LinkSection[] {
  const self = roleQuestionsPath(role.slug as RoleSlug)
  const sections: LinkSection[] = []

  // 1. Companies hiring this role (sorted by sitemapPriority = search volume proxy)
  const hiringCompanyLinks: SeoTextLink[] = byPriority(
    intersectionsForRole(role.slug as RoleSlug)
      .map((p) => getCompanyBySlug(p.company))
      .filter((c): c is Company => c !== undefined),
  )
    .slice(0, MAX_COMPANY_LINKS)
    .map((c) => ({
      href: companyQuestionsPath(c.slug as CompanySlug),
      label: `${c.label} ${role.shortLabel} questions`,
    }))
  if (hiringCompanyLinks.length > 0) {
    sections.push({
      heading: `Companies hiring ${role.pluralLabel}`,
      links: dedupeLinks(hiringCompanyLinks, self),
    })
  }

  // 3. Practice tools — role-specific variants first, then general
  const toolLinks: SeoTextLink[] = dedupeLinks([
    { href: toolVariantRolePath(role.slug as RoleSlug), label: `${role.shortLabel} question generator` },
    { href: toolAtsRolePath(role.slug as RoleSlug), label: `${role.shortLabel} ATS checker` },
    { href: '/tools/star-builder', label: 'STAR answer builder' },
  ], self)
  sections.push({ heading: 'Practice tools', links: toolLinks })

  // 4. Related roles (same category, sorted by search volume, capped)
  const peerRoleLinks: SeoTextLink[] = byPriority(
    ROLES.filter((r) => r.category === role.category && r.slug !== role.slug),
  )
    .slice(0, MAX_ROLE_LINKS)
    .map((r) => ({ href: roleQuestionsPath(r.slug as RoleSlug), label: `${r.label} questions` }))
  if (peerRoleLinks.length > 0) {
    sections.push({
      heading: `Other ${role.category} roles`,
      links: dedupeLinks(peerRoleLinks, self),
    })
  }

  // 5. Targeted blog + hub upward link
  const guideLinks: SeoTextLink[] = dedupeLinks([
    { href: questionsHubPath(), label: 'All interview questions' },
    ...blogLinksForRole(role),
  ], self)
  sections.push({ heading: 'Guides and resources', links: guideLinks })

  return sections
}

// ── Company page (/interview-questions/companies/[company]) ───────────────────

/**
 * Link sections for company question pages.
 *
 *   1. Roles at this company → cross-entity (intersection → role); shows depth
 *   2. Practice tools        → content → tool funnel
 *   3. Similar companies     → peer linking (same tier); topical cluster
 *   4. Guides & resources    → upward editorial + hub
 */
export function buildCompanyPageLinks(company: Company): LinkSection[] {
  const self = companyQuestionsPath(company.slug as CompanySlug)
  const sections: LinkSection[] = []

  // 1. Roles at this company
  const roleLinks: SeoTextLink[] = byPriority(
    intersectionsForCompany(company.slug as CompanySlug)
      .map((p) => getRoleBySlug(p.role))
      .filter((r): r is Role => r !== undefined),
  )
    .slice(0, MAX_INTERSECTION)
    .map((r) => ({
      href: roleQuestionsPath(r.slug as RoleSlug),
      label: `${company.label} ${r.shortLabel} questions`,
    }))
  if (roleLinks.length > 0) {
    sections.push({
      heading: `Roles you can target at ${company.label}`,
      links: dedupeLinks(roleLinks, self),
    })
  }

  // 2. Practice tools
  const toolLinks: SeoTextLink[] = dedupeLinks([
    { href: toolVariantCompanyPath(company.slug as CompanySlug), label: `${company.label} question generator` },
    { href: '/tools/ats-checker', label: 'ATS resume checker' },
    { href: '/tools/star-builder', label: 'STAR answer builder' },
  ], self)
  sections.push({ heading: 'Practice tools', links: toolLinks })

  // 3. Same-tier companies (peer cluster), sorted by priority
  const peerLinks: SeoTextLink[] = byPriority(
    COMPANIES.filter((c) => c.tier === company.tier && c.slug !== company.slug),
  )
    .slice(0, MAX_PEER_COMPANY)
    .map((c) => ({ href: companyQuestionsPath(c.slug as CompanySlug), label: `${c.label} questions` }))
  if (peerLinks.length > 0) {
    sections.push({
      heading: 'Similar companies to consider',
      links: dedupeLinks(peerLinks, self),
    })
  }

  // 4. Guides + hub upward
  const guideLinks: SeoTextLink[] = dedupeLinks([
    { href: questionsHubPath(), label: 'All interview questions' },
    ...blogLinksForCompany(company),
  ], self)
  sections.push({ heading: 'Guides and resources', links: guideLinks })

  return sections
}

// ── Skill/topic page (/interview-questions/topics/[skill]) ────────────────────

/**
 * Link sections for skill question pages.
 * (Future page — not yet created. Engine is ready for when skill pages ship.)
 *
 *   1. Roles that need this skill → cross-entity (skill → role); semantic relevance
 *   2. Related skills             → peer cluster (same category)
 *   3. Practice tools             → funnel
 *   4. Guides + hub               → upward
 */
export function buildSkillPageLinks(skill: Skill): LinkSection[] {
  const self = skillQuestionsPath(skill.slug as SkillSlug)
  const sections: LinkSection[] = []

  // 1. Roles requiring this skill
  const roleLinks: SeoTextLink[] = rolesForSkill(skill)
    .map((r) => ({
      href: roleQuestionsPath(r.slug as RoleSlug),
      label: `${r.label} questions`,
    }))
  if (roleLinks.length > 0) {
    sections.push({
      heading: `Roles that need ${skill.shortLabel}`,
      links: dedupeLinks(roleLinks, self),
    })
  }

  // 2. Related skills (same category, sorted by priority)
  const peerSkillLinks: SeoTextLink[] = byPriority(
    SKILLS.filter((s) => s.category === skill.category && s.slug !== skill.slug),
  )
    .slice(0, MAX_ROLE_LINKS)
    .map((s) => ({ href: skillQuestionsPath(s.slug as SkillSlug), label: `${s.label} questions` }))
  if (peerSkillLinks.length > 0) {
    sections.push({
      heading: `Related ${skill.category} topics`,
      links: dedupeLinks(peerSkillLinks, self),
    })
  }

  // 3. Practice tools
  sections.push({
    heading: 'Practice tools',
    links: dedupeLinks([
      { href: '/tools/question-generator', label: 'Interview question generator' },
      { href: '/tools/ats-checker', label: 'ATS resume checker' },
      { href: '/tools/star-builder', label: 'STAR answer builder' },
    ], self),
  })

  // 4. Guides + hub
  sections.push({
    heading: 'Guides and resources',
    links: dedupeLinks([
      { href: questionsHubPath(), label: 'All interview questions' },
      { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR interview answer tips' },
      { href: '/blog/what-is-star-method-with-examples', label: 'STAR method with examples' },
    ], self),
  })

  return sections
}

// ── Intersection page (/interview-questions/companies/[company]/[role]) ───────

/**
 * Link sections for company × role intersection pages.
 * (Future page — not yet created. Engine is ready for when intersections ship.)
 *
 *   1. Same company, other roles → sibling intersections (horizontal crawl)
 *   2. Same role, other companies → cross-entity diversity
 *   3. Parent pages              → upward (company + role + hub)
 *   4. Tools                     → funnel
 */
export function buildIntersectionPageLinks(company: Company, role: Role): LinkSection[] {
  const sections: LinkSection[] = []

  // 1. Other roles at the same company
  const sameCompanyRoleLinks: SeoTextLink[] = byPriority(
    intersectionsForCompany(company.slug as CompanySlug)
      .filter((p) => p.role !== role.slug)
      .map((p) => getRoleBySlug(p.role))
      .filter((r): r is Role => r !== undefined),
  )
    .slice(0, MAX_ROLE_LINKS)
    .map((r) => ({
      href: roleQuestionsPath(r.slug as RoleSlug),
      label: `${company.label} ${r.shortLabel} questions`,
    }))
  if (sameCompanyRoleLinks.length > 0) {
    sections.push({ heading: `More ${company.label} roles`, links: sameCompanyRoleLinks })
  }

  // 2. Same role at other companies
  const sameRoleCompanyLinks: SeoTextLink[] = byPriority(
    intersectionsForRole(role.slug as RoleSlug)
      .filter((p) => p.company !== company.slug)
      .map((p) => getCompanyBySlug(p.company))
      .filter((c): c is Company => c !== undefined),
  )
    .slice(0, MAX_COMPANY_LINKS)
    .map((c) => ({
      href: companyQuestionsPath(c.slug as CompanySlug),
      label: `${c.label} ${role.shortLabel} questions`,
    }))
  if (sameRoleCompanyLinks.length > 0) {
    sections.push({ heading: `${role.label} interviews at other companies`, links: sameRoleCompanyLinks })
  }

  // 3. Parent pages (hub-upward links)
  sections.push({
    heading: 'Browse related content',
    links: [
      { href: companyQuestionsPath(company.slug as CompanySlug), label: `All ${company.label} questions` },
      { href: roleQuestionsPath(role.slug as RoleSlug), label: `All ${role.label} questions` },
      { href: questionsHubPath(), label: 'Interview questions hub' },
    ],
  })

  // 4. Tools
  sections.push({
    heading: 'Practice tools',
    links: [
      { href: toolVariantRolePath(role.slug as RoleSlug), label: `${role.shortLabel} question generator` },
      { href: toolAtsRolePath(role.slug as RoleSlug), label: `${role.shortLabel} ATS checker` },
      { href: '/tools/star-builder', label: 'STAR answer builder' },
    ],
  })

  return sections
}

// ── Tool: QGen role variant (/tools/question-generator/[role]) ────────────────

/**
 *   1. Related tool variants   → peer tool pages (same function, different role)
 *   2. Question bank           → content page for same role (downward knowledge link)
 *   3. Related tools           → cross-tool (ATS + STAR)
 *   4. Companies hiring        → transactional intent reinforcement
 */
export function buildToolQGenRoleLinks(role: Role): LinkSection[] {
  const self = toolVariantRolePath(role.slug as RoleSlug)
  const sections: LinkSection[] = []

  // 1. Peer tool variants (same tool, related roles — not the identical role)
  const peerToolLinks: SeoTextLink[] = byPriority(
    ROLES.filter((r) => r.category === role.category && r.slug !== role.slug),
  )
    .slice(0, MAX_ROLE_LINKS)
    .map((r) => ({
      href: toolVariantRolePath(r.slug as RoleSlug),
      label: `${r.label} questions`,
    }))
  if (peerToolLinks.length > 0) {
    sections.push({
      heading: `Question generators for related roles`,
      links: dedupeLinks(peerToolLinks, self),
    })
  }

  // 2. Content page for same role (question bank)
  // 3. Cross-tool + hub
  sections.push({
    heading: 'Interview prep resources',
    links: dedupeLinks([
      { href: roleQuestionsPath(role.slug as RoleSlug), label: `${role.label} interview questions` },
      { href: toolAtsRolePath(role.slug as RoleSlug), label: `${role.shortLabel} ATS checker` },
      { href: '/tools/star-builder', label: 'STAR answer builder' },
      { href: questionsHubPath(), label: 'All interview questions' },
    ], self),
  })

  // 4. Companies hiring this role
  const companyLinks: SeoTextLink[] = byPriority(
    intersectionsForRole(role.slug as RoleSlug)
      .map((p) => getCompanyBySlug(p.company))
      .filter((c): c is Company => c !== undefined),
  )
    .slice(0, MAX_COMPANY_LINKS)
    .map((c) => ({
      href: companyQuestionsPath(c.slug as CompanySlug),
      label: `${c.label} ${role.shortLabel} questions`,
    }))
  if (companyLinks.length > 0) {
    sections.push({
      heading: `${role.label} hiring companies`,
      links: dedupeLinks(companyLinks, self),
    })
  }

  return sections
}

// ── Tool: QGen company variant (/tools/question-generator/companies/[company]) ──

/**
 *   1. Peer company tool variants → same-tier companies (cluster)
 *   2. Roles at this company      → cross-entity (company → role pages)
 *   3. Interview prep resources   → question bank + cross-tool + hub
 */
export function buildToolQGenCompanyLinks(company: Company): LinkSection[] {
  const self = toolVariantCompanyPath(company.slug as CompanySlug)
  const sections: LinkSection[] = []

  // 1. Same-tier peers
  const peerLinks: SeoTextLink[] = byPriority(
    COMPANIES.filter((c) => c.tier === company.tier && c.slug !== company.slug),
  )
    .slice(0, MAX_PEER_COMPANY)
    .map((c) => ({
      href: toolVariantCompanyPath(c.slug as CompanySlug),
      label: `${c.label} question generator`,
    }))
  if (peerLinks.length > 0) {
    sections.push({
      heading: 'Similar company generators',
      links: dedupeLinks(peerLinks, self),
    })
  }

  // 2. Roles available at this company
  const roleLinks: SeoTextLink[] = byPriority(
    intersectionsForCompany(company.slug as CompanySlug)
      .map((p) => getRoleBySlug(p.role))
      .filter((r): r is Role => r !== undefined),
  )
    .slice(0, MAX_INTERSECTION)
    .map((r) => ({
      href: roleQuestionsPath(r.slug as RoleSlug),
      label: `${company.label} ${r.shortLabel} questions`,
    }))
  if (roleLinks.length > 0) {
    sections.push({
      heading: `Roles at ${company.label}`,
      links: dedupeLinks(roleLinks, self),
    })
  }

  // 3. Resources
  sections.push({
    heading: 'Interview prep resources',
    links: dedupeLinks([
      { href: companyQuestionsPath(company.slug as CompanySlug), label: `${company.label} interview questions` },
      { href: '/tools/ats-checker', label: 'ATS resume checker' },
      { href: '/tools/star-builder', label: 'STAR answer builder' },
      { href: questionsHubPath(), label: 'All interview questions' },
    ], self),
  })

  return sections
}

// ── Tool: ATS role variant (/tools/ats-checker/[role]) ───────────────────────

/**
 *   1. Related ATS pages       → peer tool variants (topical cluster within tool)
 *   2. Interview prep          → QGen + question bank + STAR builder
 *   3. Blog                    → editorial links relevant to this role
 */
export function buildToolAtsRoleLinks(role: Role): LinkSection[] {
  const self = toolAtsRolePath(role.slug as RoleSlug)
  const sections: LinkSection[] = []

  // 1. ATS pages for related roles
  const peerAtsLinks: SeoTextLink[] = byPriority(
    ROLES.filter((r) => r.category === role.category && r.slug !== role.slug),
  )
    .slice(0, MAX_ROLE_LINKS)
    .map((r) => ({
      href: toolAtsRolePath(r.slug as RoleSlug),
      label: `${r.label} ATS check`,
    }))
  if (peerAtsLinks.length > 0) {
    sections.push({
      heading: `ATS checks for related roles`,
      links: dedupeLinks(peerAtsLinks, self),
    })
  }

  // 2. Interview prep cross-links
  sections.push({
    heading: 'More interview prep',
    links: dedupeLinks([
      { href: roleQuestionsPath(role.slug as RoleSlug), label: `${role.label} interview questions` },
      { href: toolVariantRolePath(role.slug as RoleSlug), label: `${role.shortLabel} question generator` },
      { href: '/tools/star-builder', label: 'STAR answer builder' },
      { href: questionsHubPath(), label: 'All interview questions' },
    ], self),
  })

  // 3. Targeted blog
  const blogLinks = blogLinksForRole(role)
  if (blogLinks.length > 0) {
    sections.push({ heading: 'Guides and resources', links: dedupeLinks(blogLinks, self) })
  }

  return sections
}

// ── Tool: STAR topic page (/tools/star-builder/[topic]) ──────────────────────

/**
 *   1. Thematic cluster peers  → same behavioral theme (topic cluster)
 *   2. More STAR topics        → explicit relatedTopics from data
 *   3. Interview prep          → question banks + other tools
 */
export function buildToolStarTopicLinks(topic: StarTopic): LinkSection[] {
  const self = toolStarTopicPath(topic.slug as StarTopicSlug)
  const sections: LinkSection[] = []

  // 1. Cluster peers (within same behavioral theme)
  const clusterPeers: SeoTextLink[] = starClusterPeers(topic.slug)
    .map((t) => ({
      href: toolStarTopicPath(t.slug as StarTopicSlug),
      label: t.label,
    }))

  // 2. Also include explicit relatedTopics not already in cluster
  const relatedLinks: SeoTextLink[] = [
    ...clusterPeers,
    ...topic.relatedTopics
      .map((s) => getStarTopicBySlug(s))
      .filter((t): t is StarTopic => t !== undefined)
      .map((t) => ({
        href: toolStarTopicPath(t.slug as StarTopicSlug),
        label: t.label,
      })),
  ]

  const deduped = dedupeLinks(relatedLinks, self).slice(0, MAX_STAR_RELATED)
  if (deduped.length > 0) {
    sections.push({ heading: 'Related behavioral topics', links: deduped })
  }

  // 3. Interview prep cross-links
  sections.push({
    heading: 'More interview prep',
    links: dedupeLinks([
      { href: '/tools/star-builder', label: 'All STAR topics' },
      { href: '/tools/question-generator', label: 'Interview question generator' },
      { href: '/tools/ats-checker', label: 'ATS resume checker' },
      { href: questionsHubPath(), label: 'Interview question banks' },
      { href: '/blog/what-is-star-method-with-examples', label: 'STAR method guide' },
      { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR interview tips' },
    ], self),
  })

  return sections
}
