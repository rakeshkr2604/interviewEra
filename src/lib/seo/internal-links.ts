/**
 * Centralized internal links for crawl depth + topical clustering (blog ↔ tools ↔ money pages).
 * Keep labels descriptive (anchor quality); update when shipping new routes.
 */
export type SeoTextLink = {
  href: string;
  label: string;
};

/** Homepage strip — ≤3 clicks to pricing, campus, tools, blog. */
export const HOME_MONEY_PAGE_LINKS: SeoTextLink[] = [
  { href: '/pricing', label: 'Pricing & credits' },
  { href: '/campus', label: 'Campus placements' },
  { href: '/tools/question-generator', label: 'Interview Question Generator' },
  { href: '/tools/ats-checker', label: 'ATS resume checker' },
  { href: '/tools/star-builder', label: 'STAR answer builder' },
  { href: '/blog', label: 'Interview prep blog' },
];

/** Shown on all `/tools/*` marketing pages — points crawlers + users to blog depth. */
export const TOOL_PAGE_BLOG_LINKS: SeoTextLink[] = [
  { href: '/blog/what-is-star-method-with-examples', label: 'STAR method with examples' },
  { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR interview answer tips' },
  { href: '/blog/how-to-prepare-for-placement-interviews', label: 'Placement interview prep guide' },
  { href: '/blog/top-10-interview-questions-freshers-india-2026', label: 'Top fresher interview questions' },
  { href: '/blog', label: 'All articles' },
];

/** Blog shell — cross-sell free tools (intent overlap). */
export const BLOG_TOOL_LINKS: SeoTextLink[] = [
  { href: '/tools/question-generator', label: 'Interview question generator' },
  { href: '/tools/ats-checker', label: 'ATS resume checker' },
  { href: '/tools/star-builder', label: 'STAR answer builder' },
  { href: '/pricing', label: 'Plans & credits' },
];
