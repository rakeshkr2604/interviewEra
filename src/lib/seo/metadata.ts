import { Metadata } from 'next'
import { canonicalUrl, getCanonicalSiteOrigin } from './site-url'

const BASE_URL = getCanonicalSiteOrigin()
const BRAND = 'InterviewEra'

/** Launcher / JSON-LD — `public/favicon/android-chrome-192x192.png` */
export const BRAND_ICON_192_PATH = '/favicon/android-chrome-192x192.png' as const

export const siteConfig = {
  name: BRAND,
  /**
   * Spelling variants that resolve to the same brand entity. "Interview Era" (two words)
   * is the key disambiguation signal: it tells search engines the brand parses as
   * Interview + Era — not a misspelling of "interviewer".
   */
  alternateNames: ['Interview Era', 'InterviewEra.com', 'Interview-Era'],
  url: BASE_URL,
  /** After brand in root/default Open Graph & Twitter titles: `InterviewEra | …` */
  socialDefaultHeadline: 'AI mock interviews',
  /**
   * Canonical one-line brand definition — the SINGLE SOURCE OF TRUTH.
   * Reused verbatim across Organization / WebSite / SoftwareApplication JSON-LD
   * and visible brand copy. Do not paraphrase it elsewhere; import this instead.
   */
  entityDefinition:
    'InterviewEra is an AI-powered mock interview platform with adaptive follow-ups, resume-aware scoring, and structured interview preparation for campus placements and early-career hiring.',
  slogan: 'Know your interview score before the company decides.',
  defaultDescription:
    'Structured mock interviews from your CV — STAR-aligned flow, five-dimension scoring, and progress built for Indian campus hiring. Start free, no card.',
  ogImage: `${BASE_URL}/og/default.png`,
  locale: 'en_IN',
} as const

/** Stable `@id` fragments for JSON-LD `@graph` (aligned with `siteConfig.url`). */
export const schemaIds = {
  organization: `${siteConfig.url}#organization`,
  founder: `${siteConfig.url}#founder`,
  logo: `${siteConfig.url}#logo`,
} as const

/** Canonical, externally-linkable brand profiles — keep identical in schema + visible anchors. */
export const BRAND_LINKEDIN_URL = 'https://www.linkedin.com/company/interviewera/' as const
export const BRAND_X_URL = 'https://x.com/InterviewEra' as const
export const BRAND_GITHUB_URL = 'https://github.com/InterviewEraHQ' as const
export const FOUNDER_LINKEDIN_URL = 'https://www.linkedin.com/in/rakeshkumar2604/' as const
export const FOUNDER_GITHUB_URL = 'https://github.com/rakesh2604' as const

/**
 * Organization `sameAs` + founder — keep in sync with marketing footer / about page.
 *
 * `sameAs` should only list profiles that actually exist and link back; mismatched
 * profiles weaken entity trust. These are the verified, reciprocal references for the
 * InterviewEra entity: company LinkedIn, official X, and the GitHub organization.
 */
export const siteOrganizationStructured = {
  sameAs: [BRAND_LINKEDIN_URL, BRAND_X_URL, BRAND_GITHUB_URL],
  /** Topics the entity is an authority on — anchors InterviewEra to its real subject area. */
  knowsAbout: [
    'AI mock interviews',
    'Campus placement preparation',
    'Resume-aware interview practice',
    'Interview scoring rubrics',
    'STAR method coaching',
    'Technical interview preparation',
  ],
  areaServed: 'India',
  address: {
    locality: 'Ranchi',
    region: 'Jharkhand',
    country: 'IN',
  },
  founder: {
    name: 'Rakesh Kumar',
    jobTitle: 'Founder & CEO',
    sameAs: [FOUNDER_LINKEDIN_URL, FOUNDER_GITHUB_URL],
  },
} as const

export function brandPageTitle(pageTitle: string): string {
  return `${BRAND} | ${pageTitle}`
}

/** Open Graph / Twitter title for articles (brand-last). */
export function brandArticleOgTitle(postTitle: string): string {
  return `${postTitle} | ${BRAND}`
}

interface PageSeoParams {
  /** Used for OG/Twitter titles via `InterviewEra | …` unless `socialTitle` is set */
  title: string
  description: string
  path: string
  ogImage?: string
  noIndex?: boolean
  /**
   * When `noIndex` is true, allow `follow: true` so crawlers can still pass link equity
   * (e.g. thin tool result pages).
   */
  noIndexFollow?: boolean
  keywords?: string | string[]
  /** When set, bypasses root `metadata.title.template` (e.g. homepage tab `InterviewEra` only). */
  documentTitleAbsolute?: string
  /** Override both Open Graph and Twitter `title`; defaults from `brandPageTitle(title)`. */
  socialTitle?: string
  openGraphType?: 'website' | 'article'
}

export function generateMetadata({
  title,
  description,
  path,
  ogImage,
  noIndex = false,
  noIndexFollow = false,
  documentTitleAbsolute,
  socialTitle,
  keywords,
  openGraphType = 'website',
}: PageSeoParams): Metadata {
  const promoTitle = socialTitle ?? brandPageTitle(title)
  const url = canonicalUrl(path)
  const image = ogImage || `${BASE_URL}/og/default.png`

  const robotsBlock: Metadata['robots'] = noIndex
    ? noIndexFollow
      ? { index: false, follow: true, googleBot: { index: false, follow: true } }
      : { index: false, follow: false }
    : {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
      }

  return {
    title:
      documentTitleAbsolute !== undefined
        ? { absolute: documentTitleAbsolute }
        : title,
    description,
    ...(keywords !== undefined ? { keywords } : {}),
    alternates: { canonical: url },
    robots: robotsBlock,
    openGraph: {
      title: promoTitle,
      description,
      url,
      siteName: BRAND,
      images: [{ url: image, width: 1200, height: 630, alt: promoTitle }],
      locale: 'en_IN',
      type: openGraphType,
    },
    twitter: {
      card: 'summary_large_image',
      title: promoTitle,
      description,
      images: [image],
    },
  }
}

/** Self-canonical + `noindex` for authenticated app routes (aligned with `robots.txt` disallow). */
export function privatePageMetadata(input: Omit<PageSeoParams, 'noIndex'>): Metadata {
  return generateMetadata({ ...input, noIndex: true })
}

/**
 * Auth / recovery flows — `noindex` so they do not compete in search, `follow` so equity
 * still flows to linked marketing pages (Google still recommends crawlable auth when thin).
 * Exception: `/signup` uses `generateMetadata()` directly — primary conversion page, indexable.
 */
export function authPageMetadata(input: Omit<PageSeoParams, 'noIndex' | 'noIndexFollow'>): Metadata {
  return generateMetadata({ ...input, noIndex: true, noIndexFollow: true })
}

export const PAGE_SEO = {
  home: generateMetadata({
    title: 'AI Mock Interviews',
    // Pair the brand with its category so search engines learn the entity, not just the word.
    documentTitleAbsolute: `${BRAND} — AI Mock Interview Platform for Campus Placements`,
    socialTitle: brandPageTitle('AI Mock Interview Platform for Campus Placements'),
    description:
      'InterviewEra is an AI-powered mock interview platform for Indian campus placements. Upload your resume, get rubric-scored feedback across five dimensions, and track your improvement. Free to start.',
    path: '/',
  }),
  dashboard: generateMetadata({
    title: 'Dashboard',
    description: 'Your interview practice dashboard',
    path: '/dashboard',
    noIndex: true,
  }),
  interview: generateMetadata({
    title: 'Live Mock Interview',
    description: 'Practice your interview with AI avatar',
    path: '/interview',
    noIndex: true,
  }),
  onboarding: generateMetadata({
    title: 'Setup Your Interview',
    description: 'Personalize your AI mock interview experience',
    path: '/onboarding',
    noIndex: true,
  }),
  questionGenerator: generateMetadata({
    title: 'Free Interview Question Generator',
    description:
      'Generate role-specific interview questions instantly. Free tool for placement preparation — no signup required.',
    path: '/tools/question-generator',
  }),
  atsChecker: generateMetadata({
    title: 'Free ATS Resume Checker',
    description:
      'Check if your resume passes Applicant Tracking Systems. Instant ATS compatibility score. Free tool.',
    path: '/tools/ats-checker',
  }),
  campus: generateMetadata({
    title: 'AI Mock Interviews for Campus Placements',
    description:
      'Train your entire placement batch with AI mock interviews. ₹799/student/year.',
    path: '/campus',
  }),
}
