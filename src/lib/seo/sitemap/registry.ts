import type { MetadataRoute } from 'next';
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url';

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
  { path: '/pricing', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/campus', changeFrequency: 'monthly', priority: 0.78 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.65 },
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
} as const;

export function buildPagesSitemapEntries(now: Date): MetadataRoute.Sitemap {
  return STATIC_MARKETING_ROUTES.map((e) => toAbsolute(e, now));
}

export function buildBlogSitemapEntries(now: Date): MetadataRoute.Sitemap {
  return BLOG_POST_ROUTES.map((e) => toAbsolute(e, now));
}

export function buildToolsSitemapEntries(now: Date): MetadataRoute.Sitemap {
  return TOOL_LANDING_ROUTES.map((e) => toAbsolute(e, now));
}
