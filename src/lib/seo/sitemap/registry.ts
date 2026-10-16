import type { MetadataRoute } from 'next';
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url';
import {
  ROLES,
  COMPANIES,
  SKILLS,
  STAR_TOPICS,
  HIGH_VALUE_INTERSECTIONS,
  roleQuestionsPath,
  companyQuestionsPath,
  intersectionQuestionsPath,
  skillQuestionsPath,
  questionsHubPath,
  toolVariantRolePath,
  toolVariantCompanyPath,
  toolAtsRolePath,
  toolStarTopicPath,
} from '@/lib/seo/programmatic';
import {
  getRoleQuestionsLastUpdated,
  getCompanyQuestionsLastUpdated,
  getSkillQuestionsLastUpdated,
} from '@/lib/seo/programmatic/questions';
import {
  isRoleIndexable,
  isCompanyIndexable,
  isSkillIndexable,
  isIntersectionIndexable,
  isAtsRoleVariantIndexable,
} from '@/lib/seo/programmatic/indexing';
import { getRoleBySlug, getCompanyBySlug } from '@/lib/seo/programmatic';
import { FRESHWORKS_FE_LAST_UPDATED } from '@/lib/seo/programmatic/freshworks-fe-hub';
import { AMAZON_SE_LAST_UPDATED } from '@/lib/seo/programmatic/amazon-se-hub';
import { MICROSOFT_SE_LAST_UPDATED } from '@/lib/seo/programmatic/microsoft-se-hub';
import { INFOSYS_SE_LAST_UPDATED } from '@/lib/seo/programmatic/infosys-se-hub';
import { INFOSYS_JAVA_LAST_UPDATED } from '@/lib/seo/programmatic/infosys-java-hub';
import { WIPRO_SWE_LAST_UPDATED } from '@/lib/seo/programmatic/wipro-swe-hub';
import { WIPRO_JAVA_LAST_UPDATED } from '@/lib/seo/programmatic/wipro-java-hub';
import { WIPRO_QA_LAST_UPDATED } from '@/lib/seo/programmatic/wipro-qa-hub';
import { WIPRO_DA_LAST_UPDATED } from '@/lib/seo/programmatic/wipro-da-hub';
import { TOP_DSA_LAST_UPDATED } from '@/lib/seo/blog/top-dsa-hub';
import { AGENTIC_LAST_UPDATED } from '@/lib/seo/blog/agentic-ai-hub';
import { WHAT_IS_AGENTIC_AI_CONFIG } from '@/lib/seo/blog/agentic-spoke-what-is';
import { AGENTIC_CODING_ROUND_CONFIG } from '@/lib/seo/blog/agentic-spoke-coding-round';
import { AI_PROMPT_ENGINEERING_CONFIG } from '@/lib/seo/blog/agentic-spoke-prompt-engineering';
import { CURSOR_AI_INTERVIEW_CONFIG } from '@/lib/seo/blog/agentic-spoke-cursor';
import { GOOGLE_APPRENTICESHIP_LAST_UPDATED } from '@/lib/seo/content/google-apprenticeship-hub';
import type { RoleSlug, CompanySlug, SkillSlug, StarTopicSlug } from '@/lib/seo/programmatic';

export type SitemapSourceEntry = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
  /** ISO date or `Date` — tune per route when content ships */
  lastModified?: string | Date;
};

function toAbsolute(entry: SitemapSourceEntry): MetadataRoute.Sitemap[number] | null {
  const path = entry.path.startsWith('/') ? entry.path : `/${entry.path}`;
  const url = canonicalUrl(path);
  if (url == null) return null;
  // Omit lastmod when no stable content date exists — never invent "now".
  return {
    url,
    ...(entry.lastModified !== undefined ? { lastModified: entry.lastModified } : {}),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  };
}

function notNull<T>(value: T | null): value is T {
  return value != null;
}

/**
 * Stable lastmod dates for marketing/tool shells without per-route content
 * timestamps. Bump only when the page's visible content or metadata materially
 * changes — never substitute request time.
 */
const MARKETING_SHELL_LASTMOD = '2026-10-14'
const TOOL_LANDING_LASTMOD = '2026-10-14'
/** Shared lastmod for QGen / STAR tool variants until per-variant dates exist. */
const TOOL_VARIANT_LASTMOD = '2026-05-21'
const QUESTIONS_HUB_LASTMOD = '2026-05-21'
const LEGAL_LASTMOD = '2026-10-01'

/** Marketing / legal / campus — indexable HTML. */
export const STATIC_MARKETING_ROUTES: SitemapSourceEntry[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0, lastModified: MARKETING_SHELL_LASTMOD },
  {
    path: '/interviewera',
    changeFrequency: 'monthly',
    priority: 0.9,
    lastModified: MARKETING_SHELL_LASTMOD,
  },
  {
    path: '/how-it-works',
    changeFrequency: 'monthly',
    priority: 0.85,
    lastModified: MARKETING_SHELL_LASTMOD,
  },
  {
    path: '/pricing',
    changeFrequency: 'weekly',
    priority: 0.9,
    lastModified: MARKETING_SHELL_LASTMOD,
  },
  {
    path: '/signup',
    changeFrequency: 'monthly',
    priority: 0.92,
    lastModified: MARKETING_SHELL_LASTMOD,
  },
  // Included in the pages sitemap only while landing mode is `live` (see
  // `buildPagesSitemapEntries`). Coming Soon shells stay out of the sitemap.
  {
    path: '/campus',
    changeFrequency: 'monthly',
    priority: 0.78,
    lastModified: MARKETING_SHELL_LASTMOD,
  },
  {
    path: '/teams',
    changeFrequency: 'monthly',
    priority: 0.74,
    lastModified: MARKETING_SHELL_LASTMOD,
  },
  {
    path: '/about',
    changeFrequency: 'monthly',
    priority: 0.65,
    lastModified: MARKETING_SHELL_LASTMOD,
  },
  {
    path: '/community',
    changeFrequency: 'monthly',
    priority: 0.58,
    lastModified: MARKETING_SHELL_LASTMOD,
  },
  {
    path: '/google-apprenticeship',
    changeFrequency: 'weekly',
    priority: 0.9,
    lastModified: GOOGLE_APPRENTICESHIP_LAST_UPDATED,
  },
  {
    path: '/help-center',
    changeFrequency: 'monthly',
    priority: 0.62,
    lastModified: MARKETING_SHELL_LASTMOD,
  },
  {
    path: '/contact',
    changeFrequency: 'monthly',
    priority: 0.55,
    lastModified: MARKETING_SHELL_LASTMOD,
  },
  { path: '/resources', changeFrequency: 'weekly', priority: 0.82, lastModified: '2026-10-14' },
  {
    path: '/resources/chatgpt-interview-preparation',
    changeFrequency: 'monthly',
    priority: 0.8,
    lastModified: '2026-10-14',
  },
  {
    path: '/resources/hr-interview-answer-framework',
    changeFrequency: 'monthly',
    priority: 0.8,
    lastModified: '2026-10-14',
  },
  {
    path: '/resources/online-assessment-preparation',
    changeFrequency: 'monthly',
    priority: 0.8,
    lastModified: '2026-10-14',
  },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.35, lastModified: LEGAL_LASTMOD },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.35, lastModified: LEGAL_LASTMOD },
  { path: '/refund', changeFrequency: 'yearly', priority: 0.3, lastModified: LEGAL_LASTMOD },
];

/** Free tools — landing only (results URLs are noindex + robots disallow). */
export const TOOL_LANDING_ROUTES: SitemapSourceEntry[] = [
  {
    path: '/tools/question-generator',
    changeFrequency: 'monthly',
    priority: 0.9,
    lastModified: TOOL_LANDING_LASTMOD,
  },
  {
    path: '/tools/ats-checker',
    changeFrequency: 'monthly',
    priority: 0.9,
    lastModified: TOOL_LANDING_LASTMOD,
  },
  {
    path: '/tools/star-builder',
    changeFrequency: 'monthly',
    priority: 0.9,
    lastModified: TOOL_LANDING_LASTMOD,
  },
  {
    path: '/tools/prompt-builder',
    changeFrequency: 'monthly',
    priority: 0.9,
    lastModified: TOOL_LANDING_LASTMOD,
  },
];

/**
 * Blog posts — add a row when you ship a new `src/app/(marketing)/blog/<slug>/page.tsx`.
 * `lastModified`: bump when materially editing the article (GSC freshness signal).
 */
export const BLOG_POST_ROUTES: SitemapSourceEntry[] = [
  {
    path: '/blog',
    changeFrequency: 'weekly',
    priority: 0.76,
    lastModified: AGENTIC_LAST_UPDATED,
  },
  {
    path: '/blog/agentic-ai-interview-round-2026',
    changeFrequency: 'monthly',
    priority: 0.88,
    lastModified: AGENTIC_LAST_UPDATED,
  },
  {
    path: '/blog/what-is-agentic-ai',
    changeFrequency: 'monthly',
    priority: 0.84,
    lastModified: WHAT_IS_AGENTIC_AI_CONFIG.lastUpdated,
  },
  {
    path: '/blog/agentic-coding-round',
    changeFrequency: 'monthly',
    priority: 0.84,
    lastModified: AGENTIC_CODING_ROUND_CONFIG.lastUpdated,
  },
  {
    path: '/blog/ai-prompt-engineering-interview',
    changeFrequency: 'monthly',
    priority: 0.84,
    lastModified: AI_PROMPT_ENGINEERING_CONFIG.lastUpdated,
  },
  {
    path: '/blog/cursor-ai-interview-guide',
    changeFrequency: 'monthly',
    priority: 0.83,
    lastModified: CURSOR_AI_INTERVIEW_CONFIG.lastUpdated,
  },
  {
    path: '/blog/top-10-interview-questions-freshers-india-2026',
    changeFrequency: 'monthly',
    priority: 0.86,
    lastModified: '2026-05-01',
  },
  {
    path: '/blog/ai-mock-interviews-smartest-prep-2026',
    changeFrequency: 'monthly',
    priority: 0.82,
    lastModified: '2026-05-01',
  },
  {
    path: '/blog/top-dsa-interview-questions',
    changeFrequency: 'monthly',
    priority: 0.8,
    lastModified: TOP_DSA_LAST_UPDATED,
  },
  {
    path: '/blog/hr-interview-answer-tips-and-tricks',
    changeFrequency: 'monthly',
    priority: 0.8,
    lastModified: '2026-05-01',
  },
  {
    path: '/blog/how-to-prepare-for-placement-interviews',
    changeFrequency: 'monthly',
    priority: 0.8,
    lastModified: '2026-05-01',
  },
  {
    path: '/blog/top-interview-questions-for-software-engineers',
    changeFrequency: 'monthly',
    priority: 0.8,
    lastModified: '2026-05-01',
  },
  {
    path: '/blog/what-is-star-method-with-examples',
    changeFrequency: 'monthly',
    priority: 0.8,
    lastModified: '2026-05-01',
  },
  {
    path: '/blog/overcome-interview-anxiety-mock-interviews',
    changeFrequency: 'monthly',
    priority: 0.88,
    lastModified: '2026-05-31',
  },
  {
    path: '/blog/english-confidence-interviews',
    changeFrequency: 'monthly',
    priority: 0.87,
    lastModified: '2026-05-31',
  },
  {
    path: '/blog/how-to-get-internship-opportunities',
    changeFrequency: 'monthly',
    priority: 0.87,
    lastModified: '2026-05-31',
  },
  {
    path: '/blog/amazon-sde-intern-interview-experience-2026',
    changeFrequency: 'monthly',
    priority: 0.88,
    lastModified: '2026-08-05',
  },
];

const origin = getCanonicalSiteOrigin();

/** Child sitemap absolute URLs (sitemap index). */
export const CHILD_SITEMAP_LOCS = {
  pages: `${origin}/pages-sitemap.xml`,
  blog: `${origin}/blog-sitemap.xml`,
  tools: `${origin}/tools-sitemap.xml`,
  questions: `${origin}/questions-sitemap.xml`,
} as const;

// ─── Questions sitemap entries ────────────────────────────────────────────────

/** Fallback lastModified date for programmatic pages without question data yet. */
const QUESTIONS_FALLBACK_DATE = '2026-05-21';

/** Editorial hub lastmod dates — bump when hub content or metadata ships. */
const EDITORIAL_INTERSECTION_LASTMOD: Partial<Record<string, string>> = {
  'freshworks:frontend-developer': FRESHWORKS_FE_LAST_UPDATED,
  'amazon:software-engineer': AMAZON_SE_LAST_UPDATED,
  'microsoft:software-engineer': MICROSOFT_SE_LAST_UPDATED,
  'infosys:software-engineer': INFOSYS_SE_LAST_UPDATED,
  'infosys:java-developer': INFOSYS_JAVA_LAST_UPDATED,
  'wipro:software-engineer': WIPRO_SWE_LAST_UPDATED,
  'wipro:java-developer': WIPRO_JAVA_LAST_UPDATED,
  'wipro:qa-engineer': WIPRO_QA_LAST_UPDATED,
  'wipro:data-analyst': WIPRO_DA_LAST_UPDATED,
}

export function buildQuestionsSitemapEntries(_now?: Date): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  // Hub index page
  {
    const url = canonicalUrl(questionsHubPath())
    if (url != null) {
      entries.push({
        url,
        lastModified: QUESTIONS_HUB_LASTMOD,
        changeFrequency: 'weekly',
        priority: 0.9,
      })
    }
  }

  // Role pages — only those that clear the content-sufficiency gate (indexing.ts).
  // A sitemap that advertises thin/duplicate URLs degrades the whole domain's
  // quality prior, so it must mirror the pages we actually allow Google to index.
  for (const role of ROLES) {
    if (!isRoleIndexable(role)) continue
    const lastModified = getRoleQuestionsLastUpdated(role.slug as RoleSlug, QUESTIONS_FALLBACK_DATE)
    const url = canonicalUrl(roleQuestionsPath(role.slug as RoleSlug))
    if (url != null) {
      entries.push({
        url,
        lastModified,
        changeFrequency: 'monthly',
        priority: role.sitemapPriority,
      })
    }
  }

  // Company pages
  for (const company of COMPANIES) {
    if (!isCompanyIndexable(company)) continue
    const lastModified = getCompanyQuestionsLastUpdated(
      company.slug as CompanySlug,
      QUESTIONS_FALLBACK_DATE,
    )
    const url = canonicalUrl(companyQuestionsPath(company.slug as CompanySlug))
    if (url != null) {
      entries.push({
        url,
        lastModified,
        changeFrequency: 'monthly',
        priority: company.sitemapPriority,
      })
    }
  }

  // Intersection pages — only editorial intersections clear the gate; template
  // fallbacks duplicate the role bank and stay out of the sitemap.
  for (const pair of HIGH_VALUE_INTERSECTIONS) {
    const company = getCompanyBySlug(pair.company)
    const role = getRoleBySlug(pair.role)
    if (!company || !role || !isIntersectionIndexable(company, role)) continue
    const intersectionKey = `${pair.company}:${pair.role}`
    const lastModified =
      EDITORIAL_INTERSECTION_LASTMOD[intersectionKey] ?? QUESTIONS_FALLBACK_DATE
    const url = canonicalUrl(
      intersectionQuestionsPath(pair.company as CompanySlug, pair.role as RoleSlug),
    )
    if (url != null) {
      entries.push({
        url,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.78,
      })
    }
  }

  // Skill / topic pages — only populated topics (empty ones are noindex).
  for (const skill of SKILLS) {
    if (!isSkillIndexable(skill)) continue
    const lastModified = getSkillQuestionsLastUpdated(
      skill.slug as SkillSlug,
      QUESTIONS_FALLBACK_DATE,
    )
    const url = canonicalUrl(skillQuestionsPath(skill.slug as SkillSlug))
    if (url != null) {
      entries.push({
        url,
        lastModified,
        changeFrequency: 'monthly',
        priority: skill.sitemapPriority,
      })
    }
  }

  return entries
}

export type PagesSitemapOptions = {
  /**
   * Redis-backed campus landing mode. Fail-closed: omit `/campus` unless `live`
   * so thin Coming Soon shells are never advertised in the sitemap.
   */
  campusMode?: 'live' | 'coming_soon'
  /** Same gate for `/teams`. */
  teamsMode?: 'live' | 'coming_soon'
}

export function buildPagesSitemapEntries(
  _now?: Date,
  options: PagesSitemapOptions = {},
): MetadataRoute.Sitemap {
  const campusMode = options.campusMode ?? 'coming_soon'
  const teamsMode = options.teamsMode ?? 'coming_soon'
  return STATIC_MARKETING_ROUTES.filter((entry) => {
    if (entry.path === '/campus' && campusMode !== 'live') return false
    if (entry.path === '/teams' && teamsMode !== 'live') return false
    return true
  })
    .map((e) => toAbsolute(e))
    .filter(notNull)
}

/**
 * Every indexable absolute URL across all child sitemaps — single source of truth for
 * IndexNow submissions (`npm run submit:indexnow` + `/api/indexnow/submit`).
 *
 * Campus/teams default to excluded (Coming Soon fail-closed). Pass live modes when
 * submitting IndexNow after an admin enables the full landings.
 */
export function buildAllIndexableUrls(
  now: Date = new Date(),
  pagesOptions: PagesSitemapOptions = {},
): string[] {
  const all = [
    ...buildPagesSitemapEntries(now, pagesOptions),
    ...buildBlogSitemapEntries(now),
    ...buildToolsSitemapEntries(now),
    ...buildQuestionsSitemapEntries(now),
  ];
  return Array.from(new Set(all.map((e) => e.url)));
}

export function buildBlogSitemapEntries(_now?: Date): MetadataRoute.Sitemap {
  return BLOG_POST_ROUTES.map((e) => toAbsolute(e)).filter(notNull);
}

export function buildToolsSitemapEntries(_now?: Date): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = TOOL_LANDING_ROUTES.map((e) => toAbsolute(e)).filter(
    notNull,
  )

  // QGen role variants — /tools/question-generator/[role]
  for (const role of ROLES) {
    const url = canonicalUrl(toolVariantRolePath(role.slug as RoleSlug))
    if (url != null) {
      entries.push({
        url,
        lastModified: TOOL_VARIANT_LASTMOD,
        changeFrequency: 'monthly',
        priority: 0.75,
      })
    }
  }

  // QGen company variants — /tools/question-generator/companies/[company]
  for (const company of COMPANIES) {
    const url = canonicalUrl(toolVariantCompanyPath(company.slug as CompanySlug))
    if (url != null) {
      entries.push({
        url,
        lastModified: TOOL_VARIANT_LASTMOD,
        changeFrequency: 'monthly',
        priority: 0.74,
      })
    }
  }

  // ATS role variants — /tools/ats-checker/[role] (gated in indexing.ts)
  for (const role of ROLES) {
    if (!isAtsRoleVariantIndexable(role)) continue
    const url = canonicalUrl(toolAtsRolePath(role.slug as RoleSlug))
    if (url != null) {
      entries.push({
        url,
        lastModified: TOOL_VARIANT_LASTMOD,
        changeFrequency: 'monthly',
        priority: 0.75,
      })
    }
  }

  // STAR topic variants — /tools/star-builder/[topic]
  for (const topic of STAR_TOPICS) {
    const url = canonicalUrl(toolStarTopicPath(topic.slug as StarTopicSlug))
    if (url != null) {
      entries.push({
        url,
        lastModified: TOOL_VARIANT_LASTMOD,
        changeFrequency: 'monthly',
        priority: topic.sitemapPriority,
      })
    }
  }

  return entries
}
