import type { Metadata } from 'next'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { HiringTeamsComingSoon } from '@/components/landing/hiring/HiringTeamsComingSoon'
import { HiringTeamsLandingClient } from '@/components/landing/hiring/HiringTeamsLandingClient'
import {
  HIRING_COMING_SOON_META,
  HIRING_FAQ,
  HIRING_META,
} from '@/lib/landing/hiring-content'
import { getTeamsLandingMode } from '@/lib/hiring/teams-landing-mode'
import { generateMetadata as buildPageMetadata } from '@/lib/seo/metadata'
import { breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld'
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url'

/** Mode is Redis-backed — must not be statically cached across toggles. */
export const dynamic = 'force-dynamic'

const ORIGIN = getCanonicalSiteOrigin()

const TEAMS_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Hiring Teams', path: '/teams' },
  ],
  ORIGIN,
)

export async function generateMetadata(): Promise<Metadata> {
  const mode = await getTeamsLandingMode()
  if (mode === 'live') {
    return buildPageMetadata({
      title: HIRING_META.title,
      description: HIRING_META.description,
      path: '/teams',
      keywords:
        'AI candidate evaluation, hiring team dashboard, structured interview scoring, recruiter pipeline, HR interview platform',
    })
  }
  return buildPageMetadata({
    title: HIRING_COMING_SOON_META.title,
    description: HIRING_COMING_SOON_META.description,
    path: '/teams',
    keywords: 'Hiring Teams coming soon, AI candidate evaluation, InterviewEra hiring',
    // Thin Coming Soon shell — keep crawlable for internal links, hold out of the index
    // and pages sitemap until admin flips landing mode to live.
    noIndex: true,
    noIndexFollow: true,
  })
}

export default async function TeamsPage() {
  const mode = await getTeamsLandingMode()
  const isLive = mode === 'live'

  return (
    <>
      {isLive ? (
        <JsonLdScript
          id="teams-faq-ld"
          data={faqPageJsonLd(HIRING_FAQ.map((item) => ({ question: item.q, answer: item.a })))}
        />
      ) : null}
      <JsonLdScript id="teams-breadcrumb-ld" data={TEAMS_BREADCRUMB_LD} />
      <main id="main-content">
        {isLive ? <HiringTeamsLandingClient /> : <HiringTeamsComingSoon />}
      </main>
    </>
  )
}
