/**
 * Public barrel for the programmatic SEO layer.
 *
 * Import surface for page files and sitemap builders:
 *   import { ROLES, getRoleBySlug, rolePageMetadata, roleBreadcrumbs } from '@/lib/seo/programmatic'
 *
 * Export policy:
 * - Everything a page template, sitemap builder, or schema helper needs is re-exported here.
 * - Internal implementation details (raw `satisfies` arrays, intermediate builders) are
 *   accessible via direct sub-module imports if ever needed.
 * - This file must not contain any logic — re-exports only.
 */

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  SearchIntent,
  Difficulty,
  QuestionCategory,
  RoleCategory,
  CompanyTier,
  SkillCategory,
  RoleDefinition,
  CompanyDefinition,
  SkillDefinition,
  SeoQuestion,
  QuestionSet,
  ProgrammaticBreadcrumb,
  ProgrammaticPageType,
  ProgrammaticPageContext,
  IntersectionPair,
} from './types'

// ── Roles ─────────────────────────────────────────────────────────────────────
export { ROLES, ROLE_COUNT } from './roles'
export type { RoleSlug, Role } from './roles'

// ── Companies ─────────────────────────────────────────────────────────────────
export { COMPANIES, COMPANY_COUNT } from './companies'
export type { CompanySlug, Company } from './companies'

// ── Company hub blueprint (TCS reference) ─────────────────────────────────────
export {
  COMPANY_HUB_REFERENCE_SLUG,
  COMPANY_HUB_PILLAR_SLUGS,
  COMPANY_HUB_PROSE_CLASS,
  COMPANY_HUB_CONTENT_CLASS,
  COMPANY_HUB_CARD_STYLE,
  COMPANY_HUB_SECTION_H2_CLASS,
  COMPANY_HUB_SECTION_H3_CLASS,
  COMPANY_HUB_TOUCH_TARGET_CLASS,
  COMPANY_HUB_SECTION_FLOW,
  COMPANY_HUB_QUESTION_CARD_STANDARD,
  COMPANY_HUB_COMPONENTS,
  COMPANY_HUB_TABLE_ACCENTS_2COL,
  COMPANY_HUB_TABLE_ACCENTS_3COL,
  COMPANY_HUB_TABLE_ACCENTS_4COL,
  COMPANY_HUB_PAGE_SCHEMA_SHELL,
  COMPANY_HUB_PEER_LINKS,
  companyHubCanonicalPath,
  TCS_HUB_SECTION_ANCHORS,
} from './company-hub-blueprint'
export type { CompanyHubPillarSlug } from './company-hub-blueprint'

// ── Skills ────────────────────────────────────────────────────────────────────
export { SKILLS, SKILL_COUNT } from './skills'
export type { SkillSlug, Skill } from './skills'

// ── STAR topics ───────────────────────────────────────────────────────────────
export { STAR_TOPICS, STAR_TOPIC_COUNT, getStarTopicBySlug } from './star-topics'
export type { StarTopicSlug, StarTopic, StarTopicDefinition, StarSampleAnswer } from './star-topics'

// ── Questions ─────────────────────────────────────────────────────────────────
export {
  ROLE_QUESTION_REGISTRY,
  COMPANY_QUESTION_REGISTRY,
  SKILL_QUESTION_REGISTRY,
  getRoleQuestions,
  getCompanyQuestions,
  getSkillQuestions,
  getRoleQuestionsFlat,
  getCompanyQuestionsFlat,
  getSkillQuestionsFlat,
  buildFaqPairs,
  getRoleQuestionsLastUpdated,
  getCompanyQuestionsLastUpdated,
  getSkillQuestionsLastUpdated,
  populatedRoleSlugs,
  populatedCompanySlugs,
  populatedSkillSlugs,
} from './questions'

// ── Slugs / URL builders ──────────────────────────────────────────────────────
export {
  PATHS,
  questionsHubPath,
  roleQuestionsPath,
  companyQuestionsPath,
  intersectionQuestionsPath,
  skillQuestionsPath,
  toolVariantRolePath,
  toolVariantCompanyPath,
  toolAtsRolePath,
  toolStarTopicPath,
  qgDeepLinkPath,
  isRoleSlug,
  isCompanySlug,
  isSkillSlug,
  getRoleBySlug,
  getCompanyBySlug,
  getSkillBySlug,
  allRoleParams,
  allCompanyParams,
  allSkillParams,
  allToolVariantRoleParams,
  allToolVariantCompanyParams,
  allAtsRoleParams,
  allStarTopicParams,
  HIGH_VALUE_INTERSECTIONS,
  highValueIntersectionParams,
  intersectionsForCompany,
  intersectionsForRole,
  slugToTitleCase,
  toSlug,
} from './slugs'
export type { QgDeepLinkMode, QgDeepLinkFields } from './slugs'

// ── Indexing gate (content-sufficiency) ────────────────────────────────────────
export {
  MIN_INDEXABLE_QUESTIONS,
  isRoleIndexable,
  isCompanyIndexable,
  isSkillIndexable,
  isIntersectionIndexable,
} from './indexing'

// ── Metadata generators ───────────────────────────────────────────────────────
export {
  questionsHubMetadata,
  rolePageMetadata,
  companyPageMetadata,
  intersectionPageMetadata,
  skillPageMetadata,
  toolVariantRoleMetadata,
  toolQGenCompanyMetadata,
  toolAtsRoleMetadata,
  toolStarTopicMetadata,
  programmaticBreadcrumbs,
  roleBreadcrumbs,
  companyBreadcrumbs,
  intersectionBreadcrumbs,
  skillBreadcrumbs,
  toolQGenRoleBreadcrumbs,
  toolQGenCompanyBreadcrumbs,
  toolAtsRoleBreadcrumbs,
  toolStarTopicBreadcrumbs,
} from './metadata'
