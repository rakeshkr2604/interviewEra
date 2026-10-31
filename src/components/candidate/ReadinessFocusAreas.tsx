'use client'

import { motion, useReducedMotion } from 'motion/react'
import { ChevronRight, Compass } from 'lucide-react'
import { DIMENSION_IDENTITY } from '@/lib/utils/dimension-identity'
import { tierColorFromPercent } from '@/lib/utils/score-tier-color'
import type { DimensionKey } from '@/lib/interview/answer-score/rubric'

export interface FocusAreaRow {
  rubricKey: DimensionKey
  name: string
  pct: number
}

interface ReadinessFocusAreasProps {
  areas: FocusAreaRow[]
}

export function ReadinessFocusAreas({ areas }: ReadinessFocusAreasProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="dashboard-premium-card px-5 py-5">
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
            color: 'var(--accent-primary)',
          }}
          aria-hidden
        >
          <Compass className="size-4.5" />
        </span>
        <div>
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Focus areas
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Key areas to work on for a higher score
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {areas.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Complete a scored mock interview to see focus areas.
          </p>
        ) : (
          areas.map((area, i) => {
            const identity = DIMENSION_IDENTITY[area.rubricKey]
            const Icon = identity.icon
            const color = tierColorFromPercent(area.pct)
            return (
              <motion.div
                key={area.rubricKey}
                initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="flex items-center gap-3 rounded-xl border p-3"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: `color-mix(in srgb, ${identity.color} 15%, transparent)`,
                    color: identity.color,
                  }}
                  aria-hidden
                >
                  <Icon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {area.name}
                    </p>
                    <span className="text-sm font-bold tabular-nums" style={{ color }}>
                      {area.pct}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full"
                    style={{ background: 'var(--bg-tertiary)' }}
                    role="progressbar"
                    aria-valuenow={area.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={area.name}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: color }}
                      initial={prefersReducedMotion ? false : { width: 0 }}
                      animate={{ width: `${area.pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0" style={{ color: 'var(--text-muted)' }} aria-hidden />
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
