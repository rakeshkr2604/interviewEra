import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  BADGE_KEYS,
  BADGE_THRESHOLDS,
  type BadgeKey,
} from '@/lib/retention/constants'
import { BADGE_DISPLAY } from '@/lib/retention/badge-copy'
import { privatePageMetadata } from '@/lib/seo/metadata'
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { createClient } from '@/lib/supabase/server'
import { Lock } from 'lucide-react'

export const metadata: Metadata = privatePageMetadata({
  title: 'Retention badges',
  description: 'InterviewEra streak milestones and badges you have earned.',
  path: '/profile/badges',
})

function shareOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, '')
  if (raw) return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return getCanonicalSiteOrigin()
}

function parseEarnedKeys(raw: unknown): Set<BadgeKey> {
  const have = new Set<BadgeKey>()
  if (!Array.isArray(raw)) return have
  for (const item of raw) {
    if (!item || typeof item !== 'object' || !('badge' in item)) continue
    const b = (item as { badge?: string }).badge
    if (typeof b !== 'string' || !BADGE_KEYS.includes(b as BadgeKey)) continue
    have.add(b as BadgeKey)
  }
  return have
}

export default async function ProfileBadgesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: progress } = await supabase
    .from('user_progress')
    .select('badges_earned, current_streak, longest_streak')
    .eq('user_id', user.id)
    .maybeSingle()

  const earnedKeys = parseEarnedKeys(progress?.badges_earned)
  const streak = Number(progress?.current_streak ?? 0) || 0
  const longest = Number(progress?.longest_streak ?? 0) || 0

  const orderedEarnedForShare = BADGE_KEYS.filter((k) => earnedKeys.has(k))

  const sharePage =
    orderedEarnedForShare.length > 0
      ? `${shareOrigin()}/open/badges?badges=${encodeURIComponent(orderedEarnedForShare.join(','))}`
      : `${shareOrigin()}/open/badges`
  const linkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    sharePage,
  )}`

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-75">Profile</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Retention badges</h1>
        <p className="mt-2 text-sm opacity-85">
          Earned by maintaining quality interview days in a row (IST calendar). Current streak{' '}
          <strong>{streak}</strong> days · longest <strong>{longest}</strong> days.
        </p>
      </header>

      <div className="mb-8 rounded-2xl border p-5" style={{ borderColor: 'var(--card-border)' }}>
        <p className="text-sm opacity-85">
          Share a public preview card (Open Graph image) showing your badges on LinkedIn. The link stays
          on this allowlist — no account details are exposed.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={linkedInHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-opacity hover:opacity-95"
            style={{
              background: '#0a66c2',
              color: '#ffffff',
            }}
          >
            Share on LinkedIn
          </a>
          <Link
            href={sharePage}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-xl border px-5 py-2.5 text-sm font-semibold"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
            prefetch={false}
          >
            Preview share page
          </Link>
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {BADGE_KEYS.map((key) => {
          const earned = earnedKeys.has(key)
          const meta = BADGE_DISPLAY[key]
          const need = BADGE_THRESHOLDS[key]

          return (
            <li
              key={key}
              className="relative flex flex-col gap-2 rounded-2xl border p-5"
              style={{
                borderColor: 'var(--card-border)',
                background: earned
                  ? 'color-mix(in srgb, var(--accent-primary) 6%, var(--card-bg))'
                  : 'var(--card-bg)',
              }}
            >
              {!earned ? (
                <span
                  className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border"
                  style={{
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-muted)',
                  }}
                  aria-hidden
                >
                  <Lock className="size-4" />
                </span>
              ) : null}
              <h2 className="pr-10 text-lg font-bold">{meta.title}</h2>
              <p className="text-sm opacity-85">{meta.shortDescription}</p>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                {earned ? 'Unlocked' : `Unlocks at · ${need}-day streak`}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
