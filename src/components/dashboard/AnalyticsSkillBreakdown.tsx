'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Star } from 'lucide-react'
import { tierColorFromPercent } from '@/lib/utils/score-tier-color'
import { DIMENSION_IDENTITY } from '@/lib/utils/dimension-identity'
import type { DimensionKey } from '@/lib/interview/answer-score/rubric'

export interface SkillRow {
  /** Current rubric dimension this row measures — drives the identity icon/color below. */
  rubricKey: DimensionKey
  name: string
  pct: number
}

interface AnalyticsSkillBreakdownProps {
  skills: SkillRow[]
  reportCount: number
}

function AnimatedPercent({ value, delay }: { value: number; delay: number }) {
  const [display, setDisplay] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) return
    let raf = 0
    let start: number | null = null
    const duration = 800

    const timeout = window.setTimeout(() => {
      const step = (ts: number) => {
        if (start === null) start = ts
        const elapsed = ts - start
        const progress = Math.min(1, elapsed / duration)
        const eased = 1 - (1 - progress) ** 3
        setDisplay(Math.round(eased * value))
        if (progress < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, delay * 1000)

    return () => {
      window.clearTimeout(timeout)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [value, delay, prefersReducedMotion])

  return <span className="tabular-nums">{prefersReducedMotion ? value : display}%</span>
}

export function AnalyticsSkillBreakdown({ skills, reportCount }: AnalyticsSkillBreakdownProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div>
      <div className="mb-1 flex items-center gap-2.5">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
            color: 'var(--accent-primary)',
          }}
          aria-hidden
        >
          <Star className="size-4.5" />
        </span>
        <div>
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Skill breakdown
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Averages across the last {reportCount || 0} report{reportCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {skills.map((skill, i) => {
          const color = tierColorFromPercent(skill.pct)
          const identity = DIMENSION_IDENTITY[skill.rubricKey]
          const Icon = identity?.icon ?? Star
          const identityColor = identity?.color ?? 'var(--accent-primary)'
          const delay = i * 0.08
          return (
            <motion.div
              key={skill.rubricKey}
              initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay }}
              className="flex items-start gap-3"
            >
              <span
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: `color-mix(in srgb, ${identityColor} 15%, transparent)`,
                  color: identityColor,
                }}
                aria-hidden
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {skill.name}
                  </p>
                  <p className="text-sm font-semibold" style={{ color }}>
                    <AnimatedPercent value={skill.pct} delay={delay} />
                  </p>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full"
                  style={{ background: 'var(--bg-tertiary)' }}
                  role="progressbar"
                  aria-valuenow={skill.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={skill.name}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: color }}
                    initial={prefersReducedMotion ? false : { width: 0 }}
                    animate={{ width: `${skill.pct}%` }}
                    transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            </motion.div>
          )
        })}
        {skills.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Skill-level data appears after report dimensions are generated.
          </p>
        )}
      </div>
    </div>
  )
}
