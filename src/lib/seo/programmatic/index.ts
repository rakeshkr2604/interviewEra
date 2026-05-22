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
