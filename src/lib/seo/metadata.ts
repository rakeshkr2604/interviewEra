import { Metadata } from 'next'
import { canonicalUrl, getCanonicalSiteOrigin } from './site-url'

const BASE_URL = getCanonicalSiteOrigin()
const BRAND = 'InterviewEra'

/** Launcher / JSON-LD — `public/favicon/android-chrome-192x192.png` */
export const BRAND_ICON_192_PATH = '/favicon/android-chrome-192x192.png' as const

export const siteConfig = {
  name: BRAND,
  url: BASE_URL,
  /** After brand in root/default Open Graph & Twitter titles: `InterviewEra | …` */
  socialDefaultHeadline: 'AI mock interviews',
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

/**
 * Organization `sameAs` + founder — keep in sync with marketing footer / about page.
 */
export const siteOrganizationStructured = {
  sameAs: [
    'https://www.linkedin.com/company/interviewera',
    'https://twitter.com/interviewera',
  ],
  founder: {
    name: 'Rakesh Kumar',
    jobTitle: 'Founder & CEO',
    sameAs: ['https://www.linkedin.com/in/rakeshkumar2604/'],
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
 */
export function authPageMetadata(input: Omit<PageSeoParams, 'noIndex' | 'noIndexFollow'>): Metadata {
  return generateMetadata({ ...input, noIndex: true, noIndexFollow: true })
}

export const PAGE_SEO = {
  home: generateMetadata({
    title: 'AI Mock Interviews',
    documentTitleAbsolute: BRAND,
    socialTitle: brandPageTitle('AI Mock Interviews'),
    description:
      'Practice AI-powered mock interviews with real-time feedback. Upload your resume, get personalized questions, and track your improvement. Free to start.',
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
