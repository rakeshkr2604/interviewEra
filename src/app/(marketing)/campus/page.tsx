import type { Metadata } from 'next'
import CampusLandingClient from '@/components/landing/campus/CampusLandingClient'
import { CampusComingSoon } from '@/components/landing/campus/CampusComingSoon'
import {
  CAMPUS_COMING_SOON_META,
  CAMPUS_META,
  FAQ_ITEMS,
} from '@/lib/landing/campus-content'
import { getCampusLandingMode } from '@/lib/campus/campus-landing-mode'
import { generateMetadata as buildPageMetadata } from '@/lib/seo/metadata'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { faqPageJsonLd, breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld'
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url'

/** Mode is Redis-backed — must not be statically cached across toggles. */
export const dynamic = 'force-dynamic'

const ORIGIN = getCanonicalSiteOrigin()

const CAMPUS_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Campus Placements', path: '/campus' },
  ],
  ORIGIN,
)

export async function generateMetadata(): Promise<Metadata> {
  const mode = await getCampusLandingMode()
  if (mode === 'live') {
    return buildPageMetadata({
      title: CAMPUS_META.title,
      description: CAMPUS_META.description,
      path: '/campus',
      keywords:
        'campus placement training, AI mock interviews college, placement cell software India, T&P officer platform',
    })
  }
  return buildPageMetadata({
    title: CAMPUS_COMING_SOON_META.title,
    description: CAMPUS_COMING_SOON_META.description,
    path: '/campus',
    keywords: 'Campus placements coming soon, college mock interviews, InterviewEra campus',
  })
}

export default async function CampusPage() {
  const mode = await getCampusLandingMode()
  const isLive = mode === 'live'
  const calendlyUrl =
    process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com/interviewera/demo'

  return (
    <>
      {isLive ? (
        <JsonLdScript
          id="campus-faq-ld"
          data={faqPageJsonLd(FAQ_ITEMS.map((item) => ({ question: item.q, answer: item.a })))}
        />
      ) : null}
      <JsonLdScript id="campus-breadcrumb-ld" data={CAMPUS_BREADCRUMB_LD} />
      {isLive ? (
        <CampusLandingClient calendlyUrl={calendlyUrl} />
      ) : (
        <main id="main-content">
          <CampusComingSoon />
        </main>
      )}
    </>
  )
}
