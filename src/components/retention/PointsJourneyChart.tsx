'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { PointsJourneyPoint } from '@/lib/retention/points-journey'

interface PointsJourneyChartProps {
  points: PointsJourneyPoint[]
}

const CHART_HEIGHT = 140

export function PointsJourneyChart({ points }: PointsJourneyChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [plotWidth, setPlotWidth] = useState(0)
  const plotRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const el = plotRef.current
    if (!el) return
    const update = () => setPlotWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (points.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-xl py-10 text-center text-xs"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
      >
        Complete 2 quality sessions to see your points journey.
      </div>
    )
  }

  const maxXp = Math.max(...points.map((p) => p.cumulativeXp), 1)
  const n = points.length
  const colWidth = n > 1 ? plotWidth / (n - 1) : plotWidth
  const toX = (i: number) => (n > 1 ? i * colWidth : plotWidth / 2)
  const toY = (xp: number) => CHART_HEIGHT - (xp / maxXp) * CHART_HEIGHT

  const linePoints = points.map((p, i) => `${toX(i)},${toY(p.cumulativeXp)}`).join(' ')
  const areaPoints = `0,${CHART_HEIGHT} ${linePoints} ${toX(n - 1)},${CHART_HEIGHT}`

  return (
    <div className="relative rounded-xl px-3 py-4" style={{ background: 'var(--bg-secondary)' }}>
      <div ref={plotRef} className="relative" style={{ height: CHART_HEIGHT }}>
        {plotWidth > 0 ? (
          <svg
            className="absolute inset-0 overflow-visible"
            width={plotWidth}
            height={CHART_HEIGHT}
            viewBox={`0 0 ${plotWidth} ${CHART_HEIGHT}`}
          >
            <motion.polygon
              points={areaPoints}
              fill="var(--accent-primary)"
              style={{ opacity: 0.08 }}
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 0.08 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            />
            <motion.polyline
              points={linePoints}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={prefersReducedMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={toX(i)}
                cy={toY(p.cumulativeXp)}
                r={hovered === i ? 5 : 3.5}
                fill="var(--bg-secondary)"
                stroke="var(--accent-primary)"
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </svg>
        ) : null}

        {hovered != null ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs shadow-lg"
            style={{
              left: toX(hovered),
              top: toY(points[hovered].cumulativeXp) - 10,
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-primary)',
            }}
          >
            <span className="font-semibold tabular-nums">{points[hovered].cumulativeXp} pts</span>
            <span className="ml-1.5" style={{ color: 'var(--text-muted)' }}>
              {points[hovered].dateLabel}
            </span>
          </motion.div>
        ) : null}
      </div>

      <div className="mt-2 flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span>{points[0].dateLabel}</span>
        <span className="font-semibold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
          {points[n - 1].cumulativeXp} pts
        </span>
        <span>{points[n - 1].dateLabel}</span>
      </div>
    </div>
  )
}
