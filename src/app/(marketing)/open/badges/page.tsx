import Link from 'next/link'
import type { Metadata } from 'next'
import { Award, Lock } from 'lucide-react'
import { BADGE_DISPLAY } from '@/lib/retention/badge-copy'
import { BADGE_KEYS, BADGE_THRESHOLDS } from '@/lib/retention/constants'
import { parseBadgeKeysFromShareParam } from '@/lib/retention/parse-share-badges'
import { generateMetadata as buildPageMetadata } from '@/lib/seo/metadata'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { CopyBadgeShareLinkButton } from '@/components/retention/CopyBadgeShareLinkButton'

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

  /** Same path as `generateMetadata`; absolute URL ignores polluted NEXT_PUBLIC_APP_URL (localhost). */
  const canonicalPath =
    earned.length > 0
      ? `/open/badges?badges=${encodeURIComponent(earned.join(','))}`
      : '/open/badges'
  const canonicalHref = canonicalUrl(canonicalPath)

  const earnedSet = new Set(earned)

  return (
    <div
      className="relative overflow-hidden px-4 py-16 sm:py-20"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, var(--accent-primary) 16%, transparent), transparent)',
      }}
    >
      <div className="mx-auto max-w-2xl text-center">
        <p
          className="text-xs font-bold uppercase tracking-[0.25em]"
          style={{ color: 'var(--accent-primary)' }}
        >
          InterviewEra · Placement prep
        </p>
        <h1 className="mt-3 text-balance text-3xl font-extrabold sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
          {earned.length > 0 ? 'Quality streak badges, earned' : 'Quality streak badges'}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-balance text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
          {earned.length > 0
            ? `${earned.length} of ${BADGE_KEYS.length} badges unlocked by finishing full, high-quality mock interviews on consecutive days.`
            : 'Earned by finishing full-length mock interviews that meet quality streak rules on consecutive IST days.'}
        </p>

        <div className="mx-auto mt-12 grid max-w-xl gap-4 sm:grid-cols-2">
          {BADGE_KEYS.map((key) => {
            const isEarned = earnedSet.has(key)
            const meta = BADGE_DISPLAY[key]
            const need = BADGE_THRESHOLDS[key]

            return (
              <div
                key={key}
                className="relative flex flex-col items-center gap-2.5 rounded-2xl border p-5 text-center"
                style={{
                  borderColor: isEarned ? 'var(--accent-primary)' : 'var(--card-border)',
                  background: isEarned
                    ? 'color-mix(in srgb, var(--accent-primary) 7%, var(--card-bg))'
                    : 'var(--card-bg)',
                  boxShadow: isEarned
                    ? '0 4px 20px color-mix(in srgb, var(--accent-primary) 22%, transparent)'
                    : 'none',
                }}
              >
                <span
                  className="flex size-12 items-center justify-center rounded-full"
                  style={{
                    background: isEarned
                      ? 'color-mix(in srgb, var(--accent-primary) 16%, transparent)'
                      : 'var(--bg-tertiary)',
                    color: isEarned ? 'var(--accent-primary)' : 'var(--text-muted)',
                  }}
                  aria-hidden
                >
                  {isEarned ? <Award className="size-6" /> : <Lock className="size-5" />}
                </span>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {meta.title}
                </h2>
                <p className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
                  {meta.shortDescription}
                </p>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    background: isEarned
                      ? 'var(--accent-primary)'
                      : 'color-mix(in srgb, var(--text-muted) 14%, transparent)',
                    color: isEarned ? 'white' : 'var(--text-muted)',
                  }}
                >
                  {isEarned ? 'Unlocked' : `${need}-day streak`}
                </span>
              </div>
            )
          })}
        </div>

        <div
          className="mx-auto mt-14 max-w-md rounded-2xl border p-6"
          style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Build your own streak
          </p>
          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Free mock interviews, adaptive follow-ups, and a structured report after every session.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-xl px-6 py-3 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 72%, #5b21b6))',
              }}
            >
              Start free on InterviewEra
            </Link>
            {canonicalHref ? (
              <CopyBadgeShareLinkButton
                url={canonicalHref}
                className="rounded-xl border px-6 py-3 text-sm font-semibold opacity-85"
                style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
