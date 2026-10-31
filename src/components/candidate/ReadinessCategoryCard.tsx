'use client'

import { motion, useReducedMotion } from 'motion/react'
import { ArrowDown, ArrowUp, FileText, Users, MessageCircle, Code2, Target, type LucideIcon } from 'lucide-react'
import type { ReadinessCategoryKey } from '@/lib/candidate/types'

/** Fixed per-category identity (icon + hue) — assigned in order, never cycled. */
const CATEGORY_IDENTITY: Record<ReadinessCategoryKey, { icon: LucideIcon; color: string }> = {
  resume_quality: { icon: FileText, color: '#2563eb' },
  interview_performance: { icon: Users, color: '#7c3aed' },
  communication: { icon: MessageCircle, color: '#ea580c' },
  technical_depth: { icon: Code2, color: '#16a34a' },
  consistency: { icon: Target, color: '#db2777' },
}

interface ReadinessCategoryCardProps {
  categoryKey: ReadinessCategoryKey
  label: string
  score: number | null
  summary: string
  /** Percent change vs the start of the selected window — omit the badge when not computable. */
  deltaPercent: number | null
  /** True for resume_quality/consistency — no per-session history, shown as a fixed lifetime number. */
  isLifetimeOnly?: boolean
  delay: number
}

export function ReadinessCategoryCard({
  categoryKey,
  label,
  score,
  summary,
  deltaPercent,
  isLifetimeOnly,
  delay,
}: ReadinessCategoryCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const identity = CATEGORY_IDENTITY[categoryKey]
  const Icon = identity.icon

  return (
    <motion.article
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="dashboard-premium-card px-4 py-4"
      aria-labelledby={`cat-${categoryKey}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: `color-mix(in srgb, ${identity.color} 15%, transparent)`,
            color: identity.color,
          }}
          aria-hidden
        >
          <Icon className="size-5" />
        </span>
        {isLifetimeOnly ? (
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
            title="Doesn't change with the selected time window — no per-session history to compare."
          >
            Lifetime
          </span>
        ) : deltaPercent != null ? (
          <span
            className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            style={{
              color: deltaPercent >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
              background:
                deltaPercent >= 0
                  ? 'color-mix(in srgb, var(--accent-success) 14%, transparent)'
                  : 'color-mix(in srgb, var(--accent-danger) 14%, transparent)',
            }}
          >
            {deltaPercent >= 0 ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />}
            {Math.abs(deltaPercent)}%
          </span>
        ) : null}
      </div>

      <h2 id={`cat-${categoryKey}`} className="mt-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {label}
      </h2>
      <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {score == null ? '—' : score}
        <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
          /100
        </span>
      </p>

      {score != null ? (
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: 'var(--bg-tertiary)' }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: identity.color }}
            initial={prefersReducedMotion ? false : { width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      ) : null}

      <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {summary}
      </p>
    </motion.article>
  )
}
