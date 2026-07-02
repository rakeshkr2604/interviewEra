/**
 * Metadata generators for programmatic SEO pages.
 *
 * Design:
 * - Each function is a thin, opinionated wrapper over `generateMetadata()` from
 *   the root `src/lib/seo/metadata.ts`. It knows the copy conventions for its
 *   page type and handles title/description/keyword construction.
 * - No direct `Metadata` object construction — all calls go through
 *   `generateMetadata()` so canonical, OG, Twitter card, and robots are
 *   always consistent with the rest of the site.
 * - Title lengths are held under 50 characters (before the brand prefix) so
 *   the full "InterviewEra | <title>" stays within ~65 characters.
 *
 * Year handling:
 * - `PLACEMENT_YEAR` is the single constant to bump each January.
 *   It intentionally goes in titles/descriptions to capture time-qualified
 *   searches ("TCS interview questions 2026") which have high Indian search volume.
 *
 * Breadcrumb helpers:
 * - `programmaticBreadcrumbs()` converts the programmatic layer's
 *   `ProgrammaticBreadcrumb[]` shape to the `BreadcrumbItemInput[]` shape
 *   expected by `breadcrumbListJsonLd()` in schema/jsonld.ts.
 *   This is the only coupling between the two — kept explicit rather than
 *   importing a shared type to avoid a cross-layer dependency.
 */

import type { Metadata } from 'next'
import { generateMetadata } from '@/lib/seo/metadata'
import {
  roleQuestionsPath,
  companyQuestionsPath,
  intersectionQuestionsPath,
  skillQuestionsPath,
  questionsHubPath,
  toolVariantRolePath,
  toolVariantCompanyPath,
  toolAtsRolePath,
  toolStarTopicPath,
} from './slugs'
import type { Role } from './roles'
import type { Company } from './companies'
import type { Skill } from './skills'
import type { StarTopic } from './star-topics'
import type { ProgrammaticBreadcrumb } from './types'
import type { BreadcrumbItemInput } from '@/lib/seo/schema/jsonld'
import {
  isRoleIndexable,
  isCompanyIndexable,
  isSkillIndexable,
  isIntersectionIndexable,
} from './indexing'

/** Bump this each January 1. Used in all programmatic page titles. */
const PLACEMENT_YEAR = 2026

// ─── Hub page ─────────────────────────────────────────────────────────────────

/**
 * /interview-questions
 * The root index page for all question content — links out to role, company, and skill pages.
 */
export function questionsHubMetadata(): Metadata {
  return generateMetadata({
    title: `Interview Questions India ${PLACEMENT_YEAR}`,
    description: `Browse 300+ curated interview questions for 20 roles, 29 companies, and 35 skills. Campus and tech hiring prep for India in ${PLACEMENT_YEAR}.`,
    path: questionsHubPath(),
    keywords: [
      'interview questions India',
      `placement interview questions ${PLACEMENT_YEAR}`,
      'technical interview questions freshers',
      'company wise interview questions',
      'role wise interview questions India',
    ],
  })
}

// ─── Role pages ───────────────────────────────────────────────────────────────

/**
 * /interview-questions/[role]
 * Targets: "[Role] interview questions India 2026", "[Role] interview questions for freshers"
 */
export function rolePageMetadata(role: Role): Metadata {
  const path = roleQuestionsPath(role.slug)

  return generateMetadata({
    title: `${role.label} Interview Qs ${PLACEMENT_YEAR}`,
    description: buildRoleDescription(role),
    path,
    keywords: buildRoleKeywords(role),
    // Gate indexing on content depth (see indexing.ts). `follow` keeps equity
    // flowing to linked pages even when a page is held out of the index.
    noIndex: !isRoleIndexable(role),
    noIndexFollow: true,
  })
}

function buildRoleDescription(role: Role): string {
  const fresherClause = role.fresherFriendly
    ? 'for campus placements and fresher hiring'
    : 'asked at top Indian tech companies'
  return `${role.label} interview questions ${fresherClause} in ${PLACEMENT_YEAR}. Model answers and prep tips for technical, behavioral, and HR rounds.`
}

function buildRoleKeywords(role: Role): string[] {
  const base = [
    `${role.label} interview questions`,
    `${role.label} interview questions India ${PLACEMENT_YEAR}`,
    `${role.label} interview preparation`,
  ]
  if (role.fresherFriendly) {
    base.push(
      `${role.label} interview questions for freshers`,
      `${role.label} campus placement questions`,
    )
  }
  return base
}

// ─── Company pages ────────────────────────────────────────────────────────────

/**
 * /interview-questions/companies/[company]
 * Targets: "[Company] interview questions 2026", "[Company] placement process"
 */
export function companyPageMetadata(company: Company): Metadata {
  const path = companyQuestionsPath(company.slug)

  return generateMetadata({
    title: `${company.label} Interview Questions ${PLACEMENT_YEAR}`,
    description: buildCompanyDescription(company),
    path,
    keywords: buildCompanyKeywords(company),
    noIndex: !isCompanyIndexable(company),
    noIndexFollow: true,
  })
}

function buildCompanyDescription(company: Company): string {
  return `${company.label} interview questions and placement process for ${PLACEMENT_YEAR}. ${company.interviewStyle}. Package range ${company.avgPackageRange}.`
}

function buildCompanyKeywords(company: Company): string[] {
  const base = [
    `${company.label} interview questions`,
    `${company.label} interview questions ${PLACEMENT_YEAR}`,
    `${company.label} placement process`,
    `${company.label} interview preparation`,
  ]
  if (company.fresherHiring) {
    base.push(
      `${company.label} fresher interview`,
      `${company.label} campus placement`,
    )
  }
  // Include full name as a keyword variant if it differs from the label
  if (company.fullName !== company.label) {
    base.push(`${company.fullName} interview questions`)
  }
  return base
}

// ─── Intersection pages ───────────────────────────────────────────────────────

/**
 * /interview-questions/[company]/[role]
 * Targets: "[Company] [Role] interview questions 2026"
 * These are the highest-intent pages in the programmatic layer.
 */
export function intersectionPageMetadata(company: Company, role: Role): Metadata {
  const path = intersectionQuestionsPath(company.slug, role.slug)

  return generateMetadata({
    title: `${company.label} ${role.shortLabel} Qs ${PLACEMENT_YEAR}`,
    description: buildIntersectionDescription(company, role),
    path,
    keywords: buildIntersectionKeywords(company, role),
    // Held out of the index until bespoke per-intersection content exists
    // (they currently reuse the role question bank — soft duplicate).
    noIndex: !isIntersectionIndexable(company, role),
    noIndexFollow: true,
  })
}

function buildIntersectionDescription(company: Company, role: Role): string {
  const fresherNote = company.fresherHiring && role.fresherFriendly
    ? ' Covers fresher placement drives.'
    : ''
  return `${company.label} ${role.label} interview questions for ${PLACEMENT_YEAR}. Process: ${company.interviewStyle}.${fresherNote} Prep tips and sample answers.`
}

function buildIntersectionKeywords(company: Company, role: Role): string[] {
  return [
    `${company.label} ${role.label} interview questions`,
    `${company.label} ${role.label} interview ${PLACEMENT_YEAR}`,
    `${company.label} ${role.shortLabel} interview`,
    `${role.label} interview questions ${company.label}`,
  ]
}

// ─── Skill pages ──────────────────────────────────────────────────────────────

/**
 * /interview-questions/topics/[skill]
 * Targets: "[Skill] interview questions", "[Skill] interview questions for freshers India"
 */
export function skillPageMetadata(skill: Skill): Metadata {
  const path = skillQuestionsPath(skill.slug)
  const fresherSuffix = skill.fresherRelevant ? ' for Freshers' : ''

  return generateMetadata({
    title: `${skill.shortLabel} Interview Qs${fresherSuffix} ${PLACEMENT_YEAR}`,
    description: buildSkillDescription(skill),
    path,
    keywords: buildSkillKeywords(skill),
    // Topic pages index only once their question set is populated (indexing.ts).
    noIndex: !isSkillIndexable(skill),
    noIndexFollow: true,
  })
}

function buildSkillDescription(skill: Skill): string {
  const fresherClause = skill.fresherRelevant
    ? 'for freshers at Indian tech companies'
    : 'asked at top Indian tech companies'
  return `Top ${skill.label} interview questions ${fresherClause} in ${PLACEMENT_YEAR}. ${skill.description}`
}

function buildSkillKeywords(skill: Skill): string[] {
  const base = [
    `${skill.label} interview questions`,
    `${skill.label} interview questions India ${PLACEMENT_YEAR}`,
    `${skill.shortLabel} interview questions`,
  ]
  if (skill.fresherRelevant) {
    base.push(`${skill.label} interview questions for freshers`)
  }
  return base
}

// ─── Tool-variant pages ───────────────────────────────────────────────────────

/**
 * /tools/question-generator/[role]
 * Targets: "free [role] interview question generator", "[role] question generator online"
 * These are transactional intent pages — CTA to the main tool is the primary goal.
 */
export function toolVariantRoleMetadata(role: Role): Metadata {
  const path = toolVariantRolePath(role.slug)

  return generateMetadata({
    title: `${role.shortLabel} Interview Question Generator`,
    description: `Generate AI ${role.label} interview questions for Indian campus placements in ${PLACEMENT_YEAR}. Free — no signup required.`,
    path,
    keywords: [
      `${role.label} interview question generator`,
      `free ${role.label} interview questions`,
      `${role.label} interview preparation tool`,
      `AI ${role.label} interview questions India`,
    ],
  })
}

/**
 * /tools/question-generator/companies/[company]
 * Targets: "free [company] interview question generator", "[company] question generator online"
 */
export function toolQGenCompanyMetadata(company: Company): Metadata {
  const path = toolVariantCompanyPath(company.slug)

  return generateMetadata({
    title: `${company.label} Interview Question Generator`,
    description: `Generate ${company.label} interview questions for ${PLACEMENT_YEAR} placements. Covers ${company.typicalRounds} rounds — free, no sign-up.`,
    path,
    keywords: [
      `${company.label} interview question generator`,
      `free ${company.label} interview questions`,
      `${company.label} interview preparation tool`,
      `AI ${company.label} interview questions`,
      `${company.label} mock interview`,
    ],
  })
}

/**
 * /tools/ats-checker/[role]
 * Targets: "ATS resume checker for [role]", "is my [role] resume ATS-friendly"
 */
export function toolAtsRoleMetadata(role: Role): Metadata {
  const path = toolAtsRolePath(role.slug)

  return generateMetadata({
    title: `ATS Resume Check: ${role.shortLabel}`,
    description: `Check if your ${role.label} resume passes ATS screening. Instant score, keyword gaps, and formatting fixes — free, no sign-up.`,
    path,
    keywords: [
      `${role.label} ATS resume checker`,
      `ATS resume check ${role.label}`,
      `${role.label} resume keywords`,
      `is my ${role.label} resume ATS friendly`,
      `${role.label} resume scanner`,
    ],
  })
}

/**
 * /tools/star-builder/[topic]
 * Targets: "STAR method [topic] example", "how to answer [topic] interview question"
 */
export function toolStarTopicMetadata(topic: StarTopic): Metadata {
  const path = toolStarTopicPath(topic.slug)
  const titleLabel = 'shortLabel' in topic && topic.shortLabel ? topic.shortLabel : topic.label

  return generateMetadata({
    title: `STAR: ${titleLabel} Example`,
    description: `${topic.description} Free STAR builder with a worked example, scoring rubric, and prep tips.`,
    path,
    keywords: [
      `STAR method ${topic.label.toLowerCase()} example`,
      `how to answer ${topic.label.toLowerCase()} interview question`,
      `${topic.label.toLowerCase()} behavioral interview answer`,
      `STAR answer ${topic.label.toLowerCase()}`,
    ],
  })
}

// ─── Breadcrumb format adapter ────────────────────────────────────────────────

/**
 * Converts programmatic breadcrumb items to the shape expected by
 * `breadcrumbListJsonLd()` in schema/jsonld.ts.
 *
 * Exists because the programmatic layer uses `ProgrammaticBreadcrumb`
 * (relative `path`) while jsonld.ts uses `BreadcrumbItemInput` (also
 * relative `path`). They happen to be structurally identical today but
 * are kept separate so either type can evolve independently.
 */
export function programmaticBreadcrumbs(
  items: readonly ProgrammaticBreadcrumb[],
): BreadcrumbItemInput[] {
  return items.map((item) => ({ name: item.label, path: item.path }))
}

// ─── Breadcrumb trail builders ────────────────────────────────────────────────
// Return the full breadcrumb trail for each page type, ready for jsonld.ts.

export function roleBreadcrumbs(role: Role): BreadcrumbItemInput[] {
  return programmaticBreadcrumbs([
    { label: 'Home', path: '/' },
    { label: 'Interview Questions', path: questionsHubPath() },
    { label: role.label, path: roleQuestionsPath(role.slug) },
  ])
}

export function companyBreadcrumbs(company: Company): BreadcrumbItemInput[] {
  return programmaticBreadcrumbs([
    { label: 'Home', path: '/' },
    { label: 'Interview Questions', path: questionsHubPath() },
    { label: `${company.label} Questions`, path: companyQuestionsPath(company.slug) },
  ])
}

export function intersectionBreadcrumbs(company: Company, role: Role): BreadcrumbItemInput[] {
  return programmaticBreadcrumbs([
    { label: 'Home', path: '/' },
    { label: 'Interview Questions', path: questionsHubPath() },
    { label: company.label, path: companyQuestionsPath(company.slug) },
    {
      label: `${company.label} ${role.shortLabel}`,
      path: intersectionQuestionsPath(company.slug, role.slug),
    },
  ])
}

export function skillBreadcrumbs(skill: Skill): BreadcrumbItemInput[] {
  return programmaticBreadcrumbs([
    { label: 'Home', path: '/' },
    { label: 'Interview Questions', path: questionsHubPath() },
    { label: skill.label, path: skillQuestionsPath(skill.slug) },
  ])
}

export function toolQGenRoleBreadcrumbs(role: Role): BreadcrumbItemInput[] {
  return programmaticBreadcrumbs([
    { label: 'Home', path: '/' },
    { label: 'Interview Question Generator', path: '/tools/question-generator' },
    { label: role.label, path: toolVariantRolePath(role.slug) },
  ])
}

export function toolQGenCompanyBreadcrumbs(company: Company): BreadcrumbItemInput[] {
  return programmaticBreadcrumbs([
    { label: 'Home', path: '/' },
    { label: 'Interview Question Generator', path: '/tools/question-generator' },
    { label: company.label, path: toolVariantCompanyPath(company.slug) },
  ])
}

export function toolAtsRoleBreadcrumbs(role: Role): BreadcrumbItemInput[] {
  return programmaticBreadcrumbs([
    { label: 'Home', path: '/' },
    { label: 'ATS Checker', path: '/tools/ats-checker' },
    { label: role.label, path: toolAtsRolePath(role.slug) },
  ])
}

export function toolStarTopicBreadcrumbs(topic: StarTopic): BreadcrumbItemInput[] {
  return programmaticBreadcrumbs([
    { label: 'Home', path: '/' },
    { label: 'STAR Builder', path: '/tools/star-builder' },
    { label: topic.label, path: toolStarTopicPath(topic.slug) },
  ])
}
