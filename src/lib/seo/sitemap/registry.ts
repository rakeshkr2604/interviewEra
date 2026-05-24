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
import type { RoleSlug, CompanySlug, SkillSlug, StarTopicSlug } from '@/lib/seo/programmatic';

export type SitemapSourceEntry = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
  /** ISO date or `Date` — tune per route when content ships */
  lastModified?: string | Date;
};

function toAbsolute(entry: SitemapSourceEntry, fallbackDate: Date): MetadataRoute.Sitemap[number] {
  const path = entry.path.startsWith('/') ? entry.path : `/${entry.path}`;
  return {
    url: canonicalUrl(path),
    lastModified: entry.lastModified ?? fallbackDate,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  };
}

/** Marketing / legal / campus — indexable HTML. */
export const STATIC_MARKETING_ROUTES: SitemapSourceEntry[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/interviewera', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/how-it-works', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/pricing', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/campus', changeFrequency: 'monthly', priority: 0.78 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.65 },
  { path: '/help', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.35 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.35 },
  { path: '/refund', changeFrequency: 'yearly', priority: 0.3 },
];

/** Free tools — landing only (results URLs are noindex + robots disallow). */
export const TOOL_LANDING_ROUTES: SitemapSourceEntry[] = [
  { path: '/tools/question-generator', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/tools/ats-checker', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/tools/star-builder', changeFrequency: 'monthly', priority: 0.9 },
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
    lastModified: '2026-05-01',
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
    lastModified: '2026-05-01',
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

export function buildQuestionsSitemapEntries(now: Date): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  // Hub index page
  entries.push({
    url: canonicalUrl(questionsHubPath()),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
  })

  // Role pages
  for (const role of ROLES) {
    const lastModified = getRoleQuestionsLastUpdated(role.slug as RoleSlug, QUESTIONS_FALLBACK_DATE)
    entries.push({
      url: canonicalUrl(roleQuestionsPath(role.slug as RoleSlug)),
      lastModified,
      changeFrequency: 'monthly',
      priority: role.sitemapPriority,
    })
  }

  // Company pages
  for (const company of COMPANIES) {
    const lastModified = getCompanyQuestionsLastUpdated(
      company.slug as CompanySlug,
      QUESTIONS_FALLBACK_DATE,
    )
    entries.push({
      url: canonicalUrl(companyQuestionsPath(company.slug as CompanySlug)),
      lastModified,
      changeFrequency: 'monthly',
      priority: company.sitemapPriority,
    })
  }

  // High-value intersection pages
  for (const pair of HIGH_VALUE_INTERSECTIONS) {
    entries.push({
      url: canonicalUrl(
        intersectionQuestionsPath(pair.company as CompanySlug, pair.role as RoleSlug),
      ),
      lastModified: QUESTIONS_FALLBACK_DATE,
      changeFrequency: 'monthly',
      priority: 0.78,
    })
  }

  // Skill / topic pages
  for (const skill of SKILLS) {
    const lastModified = getSkillQuestionsLastUpdated(
      skill.slug as SkillSlug,
      QUESTIONS_FALLBACK_DATE,
    )
    entries.push({
      url: canonicalUrl(skillQuestionsPath(skill.slug as SkillSlug)),
      lastModified,
      changeFrequency: 'monthly',
      priority: skill.sitemapPriority,
    })
  }

  return entries
}

export function buildPagesSitemapEntries(now: Date): MetadataRoute.Sitemap {
  return STATIC_MARKETING_ROUTES.map((e) => toAbsolute(e, now));
}

/**
 * Every indexable absolute URL across all child sitemaps — single source of truth for
 * IndexNow submissions (`npm run submit:indexnow` + `/api/indexnow/submit`).
 */
export function buildAllIndexableUrls(now: Date = new Date()): string[] {
  const all = [
    ...buildPagesSitemapEntries(now),
    ...buildBlogSitemapEntries(now),
    ...buildToolsSitemapEntries(now),
    ...buildQuestionsSitemapEntries(now),
  ];
  return Array.from(new Set(all.map((e) => e.url)));
}

export function buildBlogSitemapEntries(now: Date): MetadataRoute.Sitemap {
  return BLOG_POST_ROUTES.map((e) => toAbsolute(e, now));
}

export function buildToolsSitemapEntries(now: Date): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = TOOL_LANDING_ROUTES.map((e) => toAbsolute(e, now))

  // QGen role variants — /tools/question-generator/[role]
  for (const role of ROLES) {
    entries.push({
      url: canonicalUrl(toolVariantRolePath(role.slug as RoleSlug)),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    })
  }

  // QGen company variants — /tools/question-generator/companies/[company]
  for (const company of COMPANIES) {
    entries.push({
      url: canonicalUrl(toolVariantCompanyPath(company.slug as CompanySlug)),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.74,
    })
  }

  // ATS role variants — /tools/ats-checker/[role]
  for (const role of ROLES) {
    entries.push({
      url: canonicalUrl(toolAtsRolePath(role.slug as RoleSlug)),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    })
  }

  // STAR topic variants — /tools/star-builder/[topic]
  for (const topic of STAR_TOPICS) {
    entries.push({
      url: canonicalUrl(toolStarTopicPath(topic.slug as StarTopicSlug)),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: topic.sitemapPriority,
    })
  }

  return entries
}
