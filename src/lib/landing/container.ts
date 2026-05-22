/**
 * Shared horizontal cap for premium homepage + marketing chrome.
 * Past `xl` / `2xl`, width grows so 15" and external monitors do not leave huge side gutters.
 */
export const LANDING_PAGE_CONTAINER =
  'mx-auto w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem]';

/** Sections on the same page canvas — tighter vertical rhythm (no dividers) */
export const LANDING_SECTION = 'px-4 py-14 sm:px-5 md:py-20';

/** Content-dense SEO pages (programmatic Q&A, blog posts) — tighter rhythm. */
export const CONTENT_SECTION = 'py-8 md:py-12';
