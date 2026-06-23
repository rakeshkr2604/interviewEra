/**
 * Company Interview Hub Blueprint — reference implementation: TCS
 * @see /interview-questions/tcs
 * @see src/components/programmatic/TcsHubArticle.tsx
 * @see src/app/(marketing)/interview-questions/tcs/page.tsx
 *
 * Reuse this structure for service-tier company pillar hubs:
 * TCS, Infosys, Wipro, Accenture, Cognizant, HCL, Capgemini, Tech Mahindra
 */

import type { CSSProperties } from 'react'

// ── Reference slug (first shipped pillar hub) ───────────────────────────────

export const COMPANY_HUB_REFERENCE_SLUG = 'tcs' as const

export const COMPANY_HUB_PILLAR_SLUGS = [
  'tcs',
  'solera',
  'infosys',
  'wipro',
  'accenture',
  'cognizant',
  'hcl',
  'capgemini',
  'tech-mahindra',
] as const

export type CompanyHubPillarSlug = (typeof COMPANY_HUB_PILLAR_SLUGS)[number]

// ── Layout tokens (freeze — do not vary per hub) ─────────────────────────────

export const COMPANY_HUB_PROSE_CLASS =
  'ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series ie-role-ba-shell ie-company-hub mx-auto w-full px-4 sm:px-5 pb-8 md:pb-12'

export const COMPANY_HUB_CONTENT_CLASS = 'ie-blog-interview-anxiety-content ie-company-hub-article-body'

export const COMPANY_HUB_CARD_STYLE: CSSProperties = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
}

export const COMPANY_HUB_SECTION_H2_CLASS = 'text-xl font-bold tracking-tight sm:text-2xl'

export const COMPANY_HUB_SECTION_H3_CLASS = 'text-base font-bold tracking-tight sm:text-lg'

export const COMPANY_HUB_TOUCH_TARGET_CLASS = 'ie-company-hub-touch-target'

// ── Section order (TOC + article body) ──────────────────────────────────────

export const COMPANY_HUB_SECTION_FLOW = [
  { key: 'hero', label: 'Hero + stats strip + TOC', anchor: null },
  { key: 'questions', label: 'Curated questions', anchor: '{slug}-questions' },
  { key: 'hiring-process', label: 'Hiring process', anchor: '{slug}-hiring-process' },
  { key: 'exam-pattern', label: 'Exam / screening pattern', anchor: '{slug}-exam-pattern' },
  { key: 'topic-importance', label: 'Topic importance chart', anchor: '{slug}-topic-importance' },
  { key: 'company-comparison', label: 'Company-specific comparison tables', anchor: '{slug}-comparison' },
  { key: 'score-targets', label: 'Score / cutoff benchmarks (optional)', anchor: '{slug}-score-targets' },
  { key: 'roadmap', label: 'Preparation roadmap', anchor: '{slug}-roadmap' },
  { key: 'mistakes', label: 'Common mistakes', anchor: '{slug}-mistakes' },
  { key: 'faq', label: 'FAQ (12 items + FAQPage JSON-LD)', anchor: '{slug}-faq' },
  { key: 'mock-cta', label: 'Mock interview CTA', anchor: '{slug}-mock-interview-cta' },
  { key: 'related-guides', label: 'Related guides (company row first)', anchor: '{slug}-contextual-links' },
] as const

/** TCS anchor IDs mapped to blueprint keys (use as template when cloning). */
export const TCS_HUB_SECTION_ANCHORS = {
  questions: 'tcs-questions',
  hiringProcess: 'tcs-hiring-process',
  examPattern: 'tcs-nqt-pattern',
  topicImportance: 'tcs-topic-importance',
  packageTracks: 'tcs-package-tracks',
  digitalVsPrime: 'tcs-digital-vs-prime',
  scoreTargets: 'tcs-score-targets',
  roadmap: 'tcs-30-day-roadmap',
  mistakes: 'tcs-top-mistakes',
  faq: 'tcs-faq',
  mockCta: 'tcs-mock-interview-cta',
  relatedGuides: 'tcs-contextual-links',
} as const

/** Wipro anchor IDs mapped to blueprint keys (company careers pillar hub). */
export const WIPRO_HUB_SECTION_ANCHORS = {
  overview: 'wipro-hub-overview',
  hiringStatus: 'wipro-hub-hiring-status',
  eliteNlth: 'wipro-hub-elite-nlth',
  nlth: 'wipro-hub-nlth',
  wilp: 'wipro-hub-wilp',
  turbo: 'wipro-hub-turbo',
  onCampus: 'wipro-hub-on-campus',
  offCampus: 'wipro-hub-off-campus',
  experienced: 'wipro-hub-experienced',
  internship: 'wipro-hub-internship',
  apprenticeship: 'wipro-hub-apprenticeship',
  recruitmentCalendar: 'wipro-hub-recruitment-calendar',
  hiringTimeline: 'wipro-hub-hiring-timeline',
  hiringLocations: 'wipro-hub-hiring-locations',
  onlineTest: 'wipro-hub-online-test',
  technicalInterview: 'wipro-hub-technical-interview',
  hrInterview: 'wipro-hub-hr-interview',
  eligibility: 'wipro-hub-eligibility',
  salary: 'wipro-hub-salary',
  roleGuides: 'wipro-hub-role-guides',
  questions: 'wipro-hub-questions',
  roadmap15: 'wipro-hub-roadmap-15',
  roadmap30: 'wipro-hub-roadmap-30',
  roadmap60: 'wipro-hub-roadmap-60',
  documents: 'wipro-hub-documents',
  offerJoining: 'wipro-hub-offer-joining',
  training: 'wipro-hub-training',
  careerGrowth: 'wipro-hub-career-growth',
  workCulture: 'wipro-hub-work-culture',
  companyOverview: 'wipro-hub-company-overview',
  trends2026: 'wipro-hub-2026-trends',
  faq: 'wipro-hub-faq',
  mockCta: 'wipro-hub-mock-cta',
  related: 'wipro-hub-related',
} as const

// ── Question card standard (company hubs) ───────────────────────────────────

/**
 * Frozen company-hub question card contract.
 * Implementation: QuestionsList expanded + QuestionInsight + mergeQuestionInsights.
 *
 * Collapsed (default):
 *   01 Question text
 *   [Category] [Difficulty]
 *   ▸ View expert answer & prep guide
 *
 * Expanded:
 *   Expert answer
 *   What interviewers evaluate
 *   Answer strategy
 *   Common mistakes
 *   Follow-up questions (bulleted)
 */
export const COMPANY_HUB_QUESTION_CARD_STANDARD = {
  component: 'QuestionsList',
  insightComponent: 'QuestionInsight',
  mergeFn: 'mergeQuestionInsights',
  expanded: true,
  fields: [
    'expertAnswer',
    'evaluates',
    'strategy',
    'mistakes',
    'followUps',
  ],
  preserve: ['question', 'category', 'difficulty'],
  dataSource: 'question-insights.ts keyed by exact question string',
} as const

// ── Shared UI components ────────────────────────────────────────────────────

export const COMPANY_HUB_COMPONENTS = {
  article: 'TcsHubArticle → rename per company (e.g. InfosysHubArticle)',
  heroVisual: 'TcsHeroVisual — coded roadmap (no H1 duplicate)',
  hiringProcessVisual: 'TcsHiringProcessVisual',
  dataTable: 'TcsResponsiveDataTable (dim | Digital green | Prime amber columns)',
  topicChart: 'TcsTopicImportanceChart — swap data constant per company',
  toc: 'BaTableOfContents',
  questions: 'QuestionsList',
  pageRoute: 'src/app/(marketing)/interview-questions/{slug}/page.tsx',
  contentModule: 'src/lib/seo/programmatic/{slug}-hub.ts',
} as const

// ── Table accent presets (re-export from TCS — canonical) ───────────────────

export {
  TCS_TABLE_ACCENTS_2COL as COMPANY_HUB_TABLE_ACCENTS_2COL,
  TCS_TABLE_ACCENTS_3COL as COMPANY_HUB_TABLE_ACCENTS_3COL,
  TCS_TABLE_ACCENTS_4COL as COMPANY_HUB_TABLE_ACCENTS_4COL,
} from './tcs-hub'

// ── SEO page shell (do not alter when cloning) ────────────────────────────────

export const COMPANY_HUB_PAGE_SCHEMA_SHELL = [
  'BreadcrumbList',
  'FAQPage',
  'ItemList (questions)',
  'Article + WebPage + ImageObject @graph',
] as const

/** Company hubs that use a top-level pillar path instead of /companies/{slug}. */
export function companyHubCanonicalPath(slug: CompanyHubPillarSlug): string {
  if (slug === 'tcs') return '/interview-questions/tcs'
  if (slug === 'solera') return '/interview-questions/solera'
  return `/interview-questions/companies/${slug}`
}

/** Peer company links — first row on every service company hub. */
export const COMPANY_HUB_PEER_LINKS = [
  { href: '/interview-questions/companies/infosys', label: 'Infosys Interview Questions' },
  { href: '/interview-questions/companies/wipro', label: 'Wipro Interview Questions' },
  { href: '/interview-questions/companies/accenture', label: 'Accenture Interview Questions' },
  { href: '/interview-questions/companies/cognizant', label: 'Cognizant Interview Questions' },
  { href: '/interview-questions/companies/hcl', label: 'HCL Interview Questions' },
] as const
