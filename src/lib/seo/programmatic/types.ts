/**
 * Core type definitions for the programmatic SEO layer.
 *
 * This file is the single contract between data files (roles, companies, skills)
 * and consumers (page templates, sitemap builders, metadata generators).
 *
 * Design decisions:
 * - All `slug` fields in definition interfaces use `string`, not a union type.
 *   The actual union types (RoleSlug, CompanySlug, SkillSlug) are derived from
 *   `as const satisfies` arrays in each data file, keeping this file free of
 *   circular imports while still giving callers the narrow literal types they need.
 * - Cross-reference fields (e.g. `primarySkills: readonly string[]`) also use
 *   `string` so data files can compile independently. Runtime validation is
 *   handled by the type-guard helpers in slugs.ts.
 */

// ─── Primitive enum types ────────────────────────────────────────────────────

/**
 * Search intent a programmatic page primarily satisfies.
 * Drives metadata copy style: informational → educational framing,
 * navigational → brand+year framing, transactional → CTA-forward framing.
 */
export type SearchIntent =
  | 'informational'            // "how to prepare for TCS interview"
  | 'navigational'             // "TCS software engineer interview questions 2026"
  | 'commercial-investigation' // "best mock interview tool India"
  | 'transactional'            // "free interview question generator online"

export type Difficulty = 'easy' | 'medium' | 'hard'

/**
 * Interview question categories — mirrors the interview engine's own taxonomy
 * but kept independent so the SEO data layer has no runtime coupling to it.
 */
export type QuestionCategory =
  | 'technical'
  | 'behavioral'
  | 'hr'
  | 'situational'
  | 'aptitude'

/** Broad grouping for role pages — used for related-role suggestions. */
export type RoleCategory =
  | 'engineering'
  | 'data'
  | 'product'
  | 'design'
  | 'quality'
  | 'security'
  | 'operations'

/**
 * Company tier — determines interview complexity copy on company pages.
 * - service:  Mass-hiring IT services (TCS, Infosys, Wipro, HCL)
 * - product:  Indian product/startup companies (Swiggy, Razorpay, Zoho)
 * - startup:  High-growth funded startups (CRED, Meesho, Groww)
 * - mnc:      Global MNC product companies (Google, Microsoft, Amazon)
 */
export type CompanyTier = 'service' | 'product' | 'startup' | 'mnc'

/** Skill grouping for `/interview-questions/topics/[skill]` pages. */
export type SkillCategory =
  | 'frontend'
  | 'backend'
  | 'data'
  | 'devops'
  | 'database'
  | 'cs-fundamentals'
  | 'cloud'
  | 'mobile'

// ─── Data-entry definition interfaces ────────────────────────────────────────
// Each is validated at compile time via `as const satisfies readonly T[]`
// in the respective data file.

export interface RoleDefinition {
  readonly slug: string
  /** Display label used in headings and titles: "Software Engineer" */
  readonly label: string
  /** Compact label for breadcrumbs / narrow spaces: "SWE" */
  readonly shortLabel: string
  /** Plural form for page headings: "Software Engineers" */
  readonly pluralLabel: string
  readonly category: RoleCategory
  /** True when this role commonly accepts 0–1 year experience. */
  readonly fresherFriendly: boolean
  /**
   * Skill slugs most queried alongside this role.
   * Used for cross-link sections on role pages.
   * Must match slugs defined in skills.ts — validated at runtime by isSkillSlug().
   */
  readonly primarySkills: readonly string[]
  readonly searchIntent: SearchIntent
  /**
   * Sitemap priority in [0.0, 1.0].
   * Assigned per documented search-volume band, never auto-computed.
   * High-volume roles: 0.87–0.88. Niche roles: 0.76–0.78.
   */
  readonly sitemapPriority: number
  /** 1–2 sentence description used in meta tags and page introductions. */
  readonly description: string
}

export interface CompanyDefinition {
  readonly slug: string
  /** Short display name: "TCS" */
  readonly label: string
  /** Official full name: "Tata Consultancy Services" */
  readonly fullName: string
  readonly tier: CompanyTier
  readonly headquartersCity: string
  /** Typical fresher CTC range: "3.5–7 LPA" */
  readonly avgPackageRange: string
  /** Number of stages in the typical placement process. */
  readonly typicalRounds: number
  /** Plain-text interview process summary: "Online Test → Technical → HR" */
  readonly interviewStyle: string
  readonly sitemapPriority: number
  /** Whether this company actively hires from campus placement drives. */
  readonly fresherHiring: boolean
  /** 1–2 sentence description used in meta tags. */
  readonly description: string
}

export interface SkillDefinition {
  readonly slug: string
  /** Full label including version info where relevant: "React.js" */
  readonly label: string
  /** Compact label for narrow spaces: "React" */
  readonly shortLabel: string
  readonly category: SkillCategory
  /**
   * Role slugs this skill most commonly appears in.
   * Used to build "See also" cross-links on skill pages.
   */
  readonly relatedRoles: readonly string[]
  readonly sitemapPriority: number
  /** Whether freshers are typically assessed on this skill. */
  readonly fresherRelevant: boolean
  /** 1–2 sentence description used in meta tags. */
  readonly description: string
}

// ─── Question structures ──────────────────────────────────────────────────────

/**
 * A single curated interview question for a static SEO page.
 * These are NOT AI-generated at request time — they are hand-curated / script-
 * generated once and committed to the repo, serving as the indexable content.
 */
export interface SeoQuestion {
  readonly question: string
  readonly category: QuestionCategory
  readonly difficulty: Difficulty
  /**
   * Short guidance note shown beside the question on static pages.
   * Adds real value so pages are not bare question lists.
   * 1–2 sentences only.
   */
  readonly tip?: string
  /** Model answer for hub pages (50–120 words). Preferred over `tip` in expanded cards and FAQ schema. */
  readonly expertAnswer?: string
  /** Why the panel asks this question (hub pages with expanded answers). */
  readonly whyAsked?: string
  /** What the interviewer is grading (hub pages with expanded answers). */
  readonly evaluates?: string
  /** Suggested time to answer aloud in a live interview (e.g. "2–3 min"). */
  readonly answerTime?: string
  /** How to structure a strong answer. */
  readonly strategy?: string
  /** Common mistakes that weaken the response. */
  readonly mistakes?: string
  /** Typical follow-up probes from the panel. */
  readonly followUps?: readonly string[]
  /**
   * Keywords used to construct `acceptedAnswer` text in FAQ schema.
   * If absent, the tip is used as the answer; if both absent, question is
   * omitted from FAQ schema.
   */
  readonly keywords?: readonly string[]
}

/**
 * A complete curated set of questions for one slug dimension.
 * Stored per-slug so `lastUpdated` can be bumped independently of the
 * data file itself — this date drives sitemap `<lastmod>` freshness.
 */
export interface QuestionSet {
  readonly questions: readonly SeoQuestion[]
  /**
   * ISO 8601 date of last material edit (YYYY-MM-DD).
   * Bump this when questions are added, revised, or pruned.
   */
  readonly lastUpdated: string
}

// ─── Page context types ───────────────────────────────────────────────────────

/** Breadcrumb item fed to `breadcrumbListJsonLd()` and page components. */
export interface ProgrammaticBreadcrumb {
  /** Display label: "Software Engineer" */
  readonly label: string
  /** Relative path: "/interview-questions/software-engineer" */
  readonly path: string
}

/**
 * All programmatic page variants. Typed as a discriminated union so
 * future page templates can narrow on `type` without if/else chains.
 */
export type ProgrammaticPageType =
  | 'hub'          // /interview-questions
  | 'role'         // /interview-questions/[role]
  | 'company'      // /interview-questions/companies/[company]
  | 'intersection' // /interview-questions/[company]/[role]
  | 'skill'        // /interview-questions/topics/[skill]
  | 'tool-variant' // /tools/question-generator/[role]

/**
 * Full resolved context for any programmatic page.
 * Returned by helpers in slugs.ts and consumed by page templates and
 * metadata generators so no page component needs to re-derive these values.
 */
export interface ProgrammaticPageContext {
  readonly type: ProgrammaticPageType
  /** Relative canonical path — pass to canonicalUrl() to get full URL. */
  readonly canonicalPath: string
  /** Ready-to-use document `<title>` content (without brand prefix). */
  readonly title: string
  /** Meta description string (target 140–160 chars). */
  readonly description: string
  /** Keyword list for the `keywords` meta tag. */
  readonly keywords: readonly string[]
  /** Ordered breadcrumb trail including the current page. */
  readonly breadcrumbs: readonly ProgrammaticBreadcrumb[]
  readonly sitemapPriority: number
  /** ISO 8601 date for sitemap `<lastmod>`. */
  readonly lastModified: string
}

/**
 * Intersection pair — a specific company × role combination that has
 * documented search demand. Used by `generateStaticParams` in intersection
 * page routes and by the questions sitemap builder.
 *
 * Kept as a plain object (not a class) so it can be used in both runtime
 * route code and build-time sitemap scripts without any bundling concerns.
 */
export interface IntersectionPair {
  readonly company: string // CompanySlug — widened to string here, narrowed at call sites
  readonly role: string    // RoleSlug — widened to string here, narrowed at call sites
}
