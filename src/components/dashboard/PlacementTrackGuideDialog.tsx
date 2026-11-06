'use client'

import { useState } from 'react'
import { ChevronRight, Flame, Layers, Lock, Trophy, Unlock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IE_FOCUS_VISIBLE } from '@/lib/theme/component-classes'
import {
  BADGE_THRESHOLDS,
  QUALITY_CRITERIA,
  TIER_2_UNLOCK,
  TIER_3_UNLOCK,
  TIER_4_UNLOCK,
} from '@/lib/retention/constants'

const TIER_STEPS = [
  {
    tier: 1,
    name: 'Fundamentals',
    requirement: 'Where every account starts.',
  },
  {
    tier: 2,
    name: 'Advanced Questions',
    requirement: `${TIER_2_UNLOCK.minSessions} sessions completed + ${TIER_2_UNLOCK.minDimensionScore.toFixed(1)}+ on any one skill in a single session.`,
  },
  {
    tier: 3,
    name: 'Company Patterns',
    requirement: `${TIER_3_UNLOCK.minSessions}+ sessions + average of your last ${TIER_3_UNLOCK.rollingWindow} session scores ≥ ${TIER_3_UNLOCK.minRollingAvg.toFixed(1)}.`,
  },
  {
    tier: 4,
    name: 'Mock Panel Mode',
    requirement: `${TIER_4_UNLOCK.minSessions}+ sessions + lifetime average score ≥ ${TIER_4_UNLOCK.minOverallAvg.toFixed(1)}.`,
  },
] as const

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Layers
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0" style={{ color: 'var(--accent-primary)' }} aria-hidden />
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
      </div>
      {children}
    </section>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
      <span className="mt-1.5 size-1 shrink-0 rounded-full" style={{ background: 'var(--text-muted)' }} aria-hidden />
      <span>{children}</span>
    </li>
  )
}

export function PlacementTrackGuideDialog({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-xs font-semibold text-(--accent-primary) hover:underline ${IE_FOCUS_VISIBLE} ${className}`}
      >
        See more
        <ChevronRight className="size-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[min(90dvh,42rem)] w-[calc(100%-1.5rem)] max-w-xl overflow-y-auto overscroll-contain bg-(--card-bg) p-0 text-(--text-primary) sm:max-w-2xl"
          showCloseButton
        >
          <div className="sticky top-0 z-10 border-b border-(--card-border) bg-(--card-bg) px-5 py-4 pr-12">
            <DialogHeader className="gap-1">
              <DialogTitle className="text-base font-bold tracking-wide text-(--accent-primary)">
                How Placement Track works
              </DialogTitle>
              <DialogDescription className="text-[12px] text-(--text-muted)">
                Your practice progress, explained simply.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-5 py-4">
            <Section icon={Layers} title="4 tiers — unlock harder practice as you improve">
              <ol className="space-y-2.5">
                {TIER_STEPS.map((step) => (
                  <li
                    key={step.tier}
                    className="rounded-xl border p-3"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: 'var(--accent-primary)' }}
                      >
                        {step.tier}
                      </span>
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {step.name}
                      </p>
                    </div>
                    <p className="mt-1.5 pl-7 text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {step.requirement}
                    </p>
                  </li>
                ))}
              </ol>
              <ul className="space-y-1.5">
                <Bullet>Every candidate starts at Tier 1 — tiers only move forward, never backward.</Bullet>
                <Bullet>The session count works with <em>any</em> completed interview. The score requirement needs a real evaluated session.</Bullet>
                <Bullet>Unlocking a tier shows a short celebration popup — you don&apos;t need to check back manually.</Bullet>
              </ul>
            </Section>

            <Section icon={Trophy} title="Streak, XP and badges — 3 different things">
              <ul className="space-y-1.5">
                <Bullet>
                  <strong style={{ color: 'var(--text-primary)' }}>🔥 Streak</strong> — consecutive calendar
                  days with at least one quality session. Skip a day, it resets to 0. Doesn&apos;t affect your tier.
                </Bullet>
                <Bullet>
                  <strong style={{ color: 'var(--text-primary)' }}>🏆 XP</strong> — points from quality sessions
                  (score × 10, so a 7.5/10 session = 75 XP). Adds up forever — a running record of effort, not a
                  requirement for anything.
                </Bullet>
                <Bullet>
                  <strong style={{ color: 'var(--text-primary)' }}>🎖 Badges</strong> — earned at streak
                  milestones: {Object.entries(BADGE_THRESHOLDS)
                    .map(([, days]) => `${days}`)
                    .join(', ')}{' '}
                  days. Once earned, they&apos;re yours permanently, even if the streak later resets.
                </Bullet>
              </ul>
            </Section>

            <Section icon={Unlock} title="What makes a session 'quality' (counts toward streak + XP)">
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                All three must be true in the same session:
              </p>
              <ul className="space-y-1.5">
                <Bullet>Answer every question asked (no skips).</Bullet>
                <Bullet>Average at least {QUALITY_CRITERIA.minAvgDurationSec} seconds per answer — rushed one-liners don&apos;t count.</Bullet>
                <Bullet>Session score of at least {QUALITY_CRITERIA.minSessionScore.toFixed(1)}/10.</Bullet>
              </ul>
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                A session that misses this still counts toward your tier&apos;s session count — it just
                won&apos;t extend your streak or add XP that day.
              </p>
            </Section>

            <Section icon={Lock} title="Why it's useful for you">
              <ul className="space-y-1.5">
                <Bullet>An objective readiness signal — not just &ldquo;I practiced&rdquo;, but &ldquo;I&apos;m hitting real interview benchmarks&rdquo;.</Bullet>
                <Bullet>Content gets progressively harder only once you&apos;re actually ready for it — you&apos;re never thrown into company-specific or panel-style questions too early.</Bullet>
                <Bullet>Gamified motivation (streak + XP + badges) to keep practicing consistently instead of a few sessions and stopping.</Bullet>
              </ul>
            </Section>

            <Section icon={Flame} title="How to use it — practical tips">
              <ul className="space-y-1.5">
                <Bullet>Check &ldquo;Progress to Tier N&rdquo; on your dashboard after each session — it shows exactly what&apos;s left.</Bullet>
                <Bullet>Don&apos;t rush answers just to finish — a low-quality session breaks your streak and earns 0 XP, even though it still counts as a completed session.</Bullet>
                <Bullet>Use your report&apos;s weakest-dimension callout to target practice — raising your weakest skill is the fastest way to clear a tier&apos;s score bar.</Bullet>
                <Bullet>One quality session a day is enough to keep your streak alive — consistency matters more than marathon sessions.</Bullet>
              </ul>
            </Section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
