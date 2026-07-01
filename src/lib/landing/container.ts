/**
 * Shared horizontal cap for premium homepage + marketing chrome.
 * Past `xl` / `2xl`, width grows so 15" and external monitors do not leave huge side gutters.
 */
export const LANDING_PAGE_CONTAINER =
  'mx-auto w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem]';

/** Sections on the same page canvas — tighter vertical rhythm (no dividers) */
export const LANDING_SECTION = 'px-4 py-14 sm:px-5 md:py-20';

/** Homepage marketing sections — generous vertical rhythm, safe viewport gutters. */
export const LANDING_HOME_SECTION = 'px-4 py-20 sm:px-5 sm:py-24';

/**
 * Inner content cap for the homepage hero + mid/below-fold (1080px).
 * `LANDING_PAGE_CONTAINER` is wider on xl+ for SEO/tools pages.
 */
export const LANDING_HOME_INNER = 'mx-auto w-full max-w-[1080px] px-4 sm:px-6';

/** Shared homepage section header → content spacing */
export const LANDING_HOME_HEADER_BLOCK = 'mx-auto max-w-3xl text-center';
export const LANDING_HOME_EYEBROW =
  'text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--accent-hover)]';
export const LANDING_HOME_HEADING =
  'mt-3.5 text-balance font-[family-name:var(--font-bricolage)] text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-[42px] text-[var(--text-primary)]';
export const LANDING_HOME_SUBHEAD =
  'mx-auto mt-4 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]';

/** Content-dense SEO pages (programmatic Q&A, blog posts) — tighter rhythm. */
export const CONTENT_SECTION = 'py-8 md:py-12';

/** Vertical rhythm between major blocks on marketing hub pages. */
export const MARKETING_SECTION_GAP = 'space-y-12 sm:space-y-16 lg:space-y-20';

/** Spacing below in-page section headers. */
export const MARKETING_SECTION_HEADER_MB = 'mb-6 sm:mb-8';
