import Link from 'next/link'
import type { Metadata } from 'next'
import { BADGE_DISPLAY } from '@/lib/retention/badge-copy'
import { generateMetadata as buildPageMetadata } from '@/lib/seo/metadata'
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { parseBadgeKeysFromShareParam } from '@/lib/retention/parse-share-badges'

interface PageProps {
  searchParams: Promise<{ badges?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams
  const earned = parseBadgeKeysFromShareParam(sp.badges)
  const origin = getCanonicalSiteOrigin()

  const path =
    earned.length > 0
      ? `/open/badges?badges=${encodeURIComponent(earned.join(','))}`
      : '/open/badges'
  const ogImage =
    earned.length > 0
      ? `${origin}/api/og/badges-card?badges=${encodeURIComponent(earned.join(','))}`
      : `${origin}/api/og/badges-card`

  return buildPageMetadata({
    title: 'InterviewEra retention badges',
    description:
      earned.length > 0
        ? `Badges unlocked on InterviewEra: ${earned.map((k) => BADGE_DISPLAY[k].title).join(' · ')}`
        : 'Quality streak badges for campus placement prep on InterviewEra.',
    path,
    ogImage,
    /** noindex for search; social crawlers still fetch og:image for previews. */
    noIndex: true,
    noIndexFollow: true,
  })
}

export default async function OpenBadgesSharePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const earned = parseBadgeKeysFromShareParam(sp.badges)

  /** Same path as `generateMetadata` — relative so the link works on prod, previews, and local without env drift. */
  const canonicalPath =
    earned.length > 0
      ? `/open/badges?badges=${encodeURIComponent(earned.join(','))}`
      : '/open/badges'

  return (
    <div className="mx-auto max-w-xl px-4 py-14 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-65">InterviewEra</p>
      <h1 className="mt-3 text-balance text-3xl font-extrabold">Retention badges shared</h1>
      <p className="mt-4 text-balance opacity-85">
        {earned.length > 0
          ? `${earned.length} badge preview — open the app with your placement profile to chase the next milestone.`
          : 'InterviewEra celebrates consistent, high-quality mock interview days.'}
      </p>
      {earned.length > 0 ? (
        <ul className="mt-10 space-y-2 text-left text-sm font-semibold">
          {earned.map((key) => (
            <li
              key={key}
              className="rounded-xl border px-4 py-3"
              style={{ borderColor: 'var(--card-border)' }}
            >
              {BADGE_DISPLAY[key].title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 opacity-75">
          Earn badges by finishing full-length sessions that meet{' '}
          <span className="font-semibold">quality streak rules</span> on consecutive IST days.
        </p>
      )}
      <div className="mt-14 flex flex-wrap justify-center gap-3">
        <Link
          href="/signup"
          className="rounded-xl px-6 py-3 text-sm font-bold text-white shadow-md"
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 72%, #5b21b6))',
          }}
        >
          Start free on InterviewEra
        </Link>
        <Link
          href={canonicalPath}
          prefetch={false}
          className="rounded-xl border px-6 py-3 text-sm font-semibold opacity-85"
          style={{ borderColor: 'var(--card-border)' }}
        >
          Canonical link
        </Link>
      </div>
    </div>
  )
}
