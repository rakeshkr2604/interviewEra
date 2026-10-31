import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import {
  BADGE_KEYS,
  BADGE_THRESHOLDS,
  type BadgeKey,
} from '@/lib/retention/constants'
import { BADGE_DISPLAY } from '@/lib/retention/badge-copy'
import { privatePageMetadata } from '@/lib/seo/metadata'
import { getCanonicalSiteOrigin, originFromRequestHost } from '@/lib/seo/site-url'
import { createClient } from '@/lib/supabase/server'
import { Lock, Award } from 'lucide-react'
import { TierLadder } from '@/components/retention/TierLadder'
import { PointsJourneyChart } from '@/components/retention/PointsJourneyChart'
import { buildPointsJourney } from '@/lib/retention/points-journey'

export const metadata: Metadata = privatePageMetadata({
  title: 'Retention badges',
  description: 'InterviewEra streak milestones and badges you have earned.',
  path: '/profile/badges',
})

/**
 * Origin of the request actually serving this page — localhost in local dev,
 * the real host in staging/prod. Used ONLY for the "Preview share page" link
 * so clicking it from localhost stays on localhost instead of jumping to
 * production (getCanonicalSiteOrigin() deliberately always returns the
 * production origin — correct for the LinkedIn share URL, which must be a
 * real public link, but wrong for a same-session preview).
 */
async function getRequestOrigin(): Promise<string> {
  const h = await headers()
  return originFromRequestHost(h.get('host'), h.get('x-forwarded-proto')) ?? getCanonicalSiteOrigin()
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

  const [{ data: progress }, { data: sessionLog }] = await Promise.all([
    supabase
      .from('user_progress')
      .select('badges_earned, current_streak, longest_streak, current_tier, total_xp')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('session_quality_log')
      .select('completed_at, unlock_contribution')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: true }),
  ])

  const earnedKeys = parseEarnedKeys(progress?.badges_earned)
  const streak = Number(progress?.current_streak ?? 0) || 0
  const longest = Number(progress?.longest_streak ?? 0) || 0
  const currentTier = Number(progress?.current_tier ?? 1) || 1
  const totalXp = Number(progress?.total_xp ?? 0) || 0
  const pointsJourney = buildPointsJourney(
    (sessionLog ?? []) as { completed_at: string; unlock_contribution: Record<string, unknown> | null }[],
  )

  const orderedEarnedForShare = BADGE_KEYS.filter((k) => earnedKeys.has(k))

  const sharePath =
    orderedEarnedForShare.length > 0
      ? `/open/badges?badges=${encodeURIComponent(orderedEarnedForShare.join(','))}`
      : '/open/badges'

  const canonicalOrigin = getCanonicalSiteOrigin()
  const sharePage = `${canonicalOrigin}${sharePath}`
  const linkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    sharePage,
  )}`

  const requestOrigin = await getRequestOrigin()
  const previewHref = `${requestOrigin}${sharePath}`

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-75">Profile</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Your progress</h1>
        <p className="mt-2 text-sm opacity-85">
          Current streak <strong>{streak}</strong> days · longest <strong>{longest}</strong> days ·{' '}
          <strong>{totalXp.toLocaleString('en-IN')}</strong> XP earned.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Interview difficulty tiers
        </h2>
        <TierLadder currentTier={currentTier} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Points journey
        </h2>
        <PointsJourneyChart points={pointsJourney} />
      </section>

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
            href={previewHref}
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

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Streak badges
          </h2>
          <Link
            href={previewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold"
            style={{ color: 'var(--accent-primary)' }}
            prefetch={false}
          >
            Full showcase →
          </Link>
        </div>
        {/*
          Deliberately compact — a quick personal-status strip, not a full
          showcase. The big descriptive medallion cards live on the public
          /open/badges share page (see page.tsx there); duplicating that
          same large-card treatment here made the two pages feel like
          copies of each other when navigating between "Badges" and the
          share preview.
        */}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BADGE_KEYS.map((key) => {
            const earned = earnedKeys.has(key)
            const meta = BADGE_DISPLAY[key]
            const need = BADGE_THRESHOLDS[key]

            return (
              <li
                key={key}
                className="flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center"
                style={{
                  borderColor: earned ? 'var(--accent-primary)' : 'var(--card-border)',
                  background: earned
                    ? 'color-mix(in srgb, var(--accent-primary) 6%, var(--card-bg))'
                    : 'var(--card-bg)',
                }}
                title={meta.shortDescription}
              >
                <span
                  className="flex size-8 items-center justify-center rounded-full"
                  style={{
                    background: earned
                      ? 'color-mix(in srgb, var(--accent-primary) 14%, transparent)'
                      : 'var(--bg-tertiary)',
                    color: earned ? 'var(--accent-primary)' : 'var(--text-muted)',
                  }}
                  aria-hidden
                >
                  {earned ? <Award className="size-4" /> : <Lock className="size-3.5" />}
                </span>
                <p className="text-[11px] font-semibold leading-tight">{meta.title}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide opacity-60">
                  {earned ? 'Unlocked' : `${need}d streak`}
                </p>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
