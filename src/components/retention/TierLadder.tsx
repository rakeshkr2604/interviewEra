'use client'

import { motion, useReducedMotion } from 'motion/react'
import { BookOpen, Swords, Building2, Users } from 'lucide-react'
import { MAX_TIER } from '@/lib/retention/constants'
import { getTierPublicLabel } from '@/lib/retention/tier-copy'

interface TierLadderProps {
  currentTier: number
}

const TIER_ICONS = [BookOpen, Swords, Building2, Users]

const TIER_DESCRIPTIONS: Record<number, string> = {
  1: 'Core fundamentals — get comfortable with the format.',
  2: 'Tougher, adaptive questions that probe deeper.',
  3: 'Questions patterned on real company interview styles.',
  4: 'Full panel-style mock — the closest thing to the real day.',
}

export function TierLadder({ currentTier }: TierLadderProps) {
  const prefersReducedMotion = useReducedMotion()
  const tier = Math.min(MAX_TIER, Math.max(1, Math.round(currentTier)))

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: MAX_TIER }, (_, idx) => idx + 1).map((t) => {
        const Icon = TIER_ICONS[t - 1] ?? BookOpen
        const isCurrent = t === tier
        const isUnlocked = t <= tier

        return (
          <motion.div
            key={t}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: (t - 1) * 0.07 }}
            className="relative flex flex-col items-center gap-2 rounded-2xl border p-3 text-center sm:p-4"
            style={{
              borderColor: isCurrent
                ? 'var(--accent-primary)'
                : 'var(--card-border)',
              background: isCurrent
                ? 'color-mix(in srgb, var(--accent-primary) 8%, var(--card-bg))'
                : 'var(--card-bg)',
              boxShadow: isCurrent
                ? '0 0 0 1px var(--accent-primary), 0 4px 16px color-mix(in srgb, var(--accent-primary) 20%, transparent)'
                : 'none',
            }}
          >
            <div
              className="flex size-11 items-center justify-center rounded-full"
              style={{
                background: isUnlocked
                  ? 'color-mix(in srgb, var(--accent-primary) 14%, transparent)'
                  : 'var(--bg-tertiary)',
                color: isUnlocked ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            >
              <Icon className="size-5" strokeWidth={2} />
            </div>
            <div>
              <p
                className="text-[11px] font-semibold"
                style={{ color: isUnlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                {getTierPublicLabel(t)}
              </p>
              {isCurrent ? (
                <span
                  className="mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                  style={{
                    background: 'var(--accent-primary)',
                    color: 'white',
                  }}
                >
                  You are here
                </span>
              ) : (
                <p className="mt-1 text-[10px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                  {TIER_DESCRIPTIONS[t]}
                </p>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
