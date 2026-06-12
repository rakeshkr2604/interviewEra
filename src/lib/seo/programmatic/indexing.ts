/**
 * Content-sufficiency indexing gate — the single source of truth for whether a
 * programmatic page is substantive enough to compete in Google's index.
 *
 * ── Why this exists ───────────────────────────────────────────────────────────
 *
 * A 20-day-old domain has a fragile site-quality prior. Submitting empty topic
 * pages ("questions being curated…") and near-duplicate intersection pages
 * (same role questions under a different company H1) trains Google that the site
 * produces low-value pages — which suppresses the *good* pages too. Google's
 * observed behaviour ("Crawled - currently not indexed" / "Discovered - not
 * indexed") is a quality verdict, not a crawl-budget limit.
 *
 * The fix: only let a page be indexable once it clears a real content bar.
 * Pages below the bar are `noindex, follow` (still crawlable, still pass internal
 * PageRank to their parents) and are excluded from the sitemap + IndexNow.
 * When content is added, a page auto-promotes to indexable — no template edits.
 *
 * ── Consumed by ───────────────────────────────────────────────────────────────
 *   - `programmatic/metadata.ts`  → sets robots `noindex` on thin/duplicate pages
 *   - `sitemap/registry.ts`       → emits only indexable URLs (also feeds IndexNow)
 *
 * Keep this the ONLY place that encodes "is this page good enough to index?".
 */

import {
  getRoleQuestionsFlat,
  getCompanyQuestionsFlat,
  getSkillQuestionsFlat,
} from './questions'
import type { Role, RoleSlug } from './roles'
import type { Company, CompanySlug } from './companies'
import type { Skill, SkillSlug } from './skills'
import { HIGH_VALUE_INTERSECTIONS } from './slugs'

/**
 * Minimum curated questions a page must carry to be worth indexing.
 * 6 keeps the page clearly above "thin" while matching FAQ-schema depth
 * (Google surfaces up to ~10 FAQ items). Tune in one place.
 */
export const MIN_INDEXABLE_QUESTIONS = 6 as const

/** Role question banks (10+ each today) clear the bar. */
export function isRoleIndexable(role: Role): boolean {
  return getRoleQuestionsFlat(role.slug as RoleSlug).length >= MIN_INDEXABLE_QUESTIONS
}

/** Company pages carry company-specific question sets (10–12 each today). */
export function isCompanyIndexable(company: Company): boolean {
  return getCompanyQuestionsFlat(company.slug as CompanySlug).length >= MIN_INDEXABLE_QUESTIONS
}

/** Skill/topic pages are indexable only once their question set is populated. */
export function isSkillIndexable(skill: Skill): boolean {
  return getSkillQuestionsFlat(skill.slug as SkillSlug).length >= MIN_INDEXABLE_QUESTIONS
}

/**
 * Company × role intersection pages ship as static routes from
 * `HIGH_VALUE_INTERSECTIONS`. They reuse the role question bank with
 * company-specific framing — index when both parents clear the content bar
 * so metadata, sitemap, and internal links stay aligned (no sitemap/noindex split).
 *
 * Editorial pillar hubs (Amazon/Microsoft/Infosys/Freshworks) still override
 * metadata in their page files but also satisfy this gate.
 */
export function isIntersectionIndexable(company: Company, role: Role): boolean {
  const isPublishedIntersection = HIGH_VALUE_INTERSECTIONS.some(
    (pair) => pair.company === company.slug && pair.role === role.slug,
  )
  if (!isPublishedIntersection) return false
  return isCompanyIndexable(company) && isRoleIndexable(role)
}
