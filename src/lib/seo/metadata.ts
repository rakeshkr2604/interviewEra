import { Metadata } from 'next'
import { getCanonicalSiteOrigin } from './site-url'

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
  /** When set, bypasses root `metadata.title.template` (e.g. homepage tab `InterviewEra` only). */
  documentTitleAbsolute?: string
  /** Override both Open Graph and Twitter `title`; defaults from `brandPageTitle(title)`. */
  socialTitle?: string
}

export function generateMetadata({
  title,
  description,
  path,
  ogImage,
  noIndex = false,
  documentTitleAbsolute,
  socialTitle,
}: PageSeoParams): Metadata {
  const promoTitle = socialTitle ?? brandPageTitle(title)
  const url = `${BASE_URL}${path}`
  const image = ogImage || `${BASE_URL}/og/default.png`

  return {
    title:
      documentTitleAbsolute !== undefined
        ? { absolute: documentTitleAbsolute }
        : title,
    description,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true } },
    openGraph: {
      title: promoTitle,
      description,
      url,
      siteName: BRAND,
      images: [{ url: image, width: 1200, height: 630, alt: promoTitle }],
      locale: 'en_IN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: promoTitle,
      description,
      images: [image],
    },
  }
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
