'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export interface DashboardTrendPoint {
  label: string
  score: number
}

const CHART_HEIGHT = 180
const Y_TICKS = [0, 2, 4, 6, 8, 10]
const Y_AXIS_WIDTH = 20
const MAX_SCORE = 10

function scoreToY(score: number): number {
  const safe = Math.max(0, Math.min(MAX_SCORE, score))
  return CHART_HEIGHT - (safe / MAX_SCORE) * CHART_HEIGHT
}

export function DashboardScoreTrendChart({ points }: { points: DashboardTrendPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [plotWidth, setPlotWidth] = useState(0)
  const plotRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const n = points.length

  useEffect(() => {
    const el = plotRef.current
    if (!el) return
    const update = () => setPlotWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (n < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-xl py-12 text-center text-xs"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
      >
        Complete 2 mock interviews to see your score trend.
      </div>
    )
  }

  const toX = (i: number) => (n > 1 ? (i / (n - 1)) * plotWidth : plotWidth / 2)
  const linePoints = points.map((p, i) => `${toX(i)},${scoreToY(p.score)}`).join(' ')
  const areaPoints = `0,${CHART_HEIGHT} ${linePoints} ${toX(n - 1)},${CHART_HEIGHT}`

  return (
    <div className="flex gap-2">
      <div className="relative shrink-0" style={{ width: Y_AXIS_WIDTH, height: CHART_HEIGHT }}>
        {Y_TICKS.map((tick) => (
          <span
            key={tick}
            className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums"
            style={{ top: scoreToY(tick), color: 'var(--text-muted)' }}
          >
            {tick}
          </span>
        ))}
      </div>

      <div className="relative min-w-0 flex-1">
        <div ref={plotRef} className="relative" style={{ height: CHART_HEIGHT }}>
          {Y_TICKS.map((tick) => (
            <div
              key={tick}
              className="absolute inset-x-0 border-t border-dashed"
              style={{ top: scoreToY(tick), borderColor: 'var(--card-border)', opacity: 0.6 }}
              aria-hidden
            />
          ))}

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
                style={{ opacity: 0.1 }}
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 0.1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
              <motion.polyline
                points={linePoints}
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="2.5"
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
                  cy={scoreToY(p.score)}
                  r={hovered === i ? 6 : 4}
                  fill="var(--bg-secondary)"
                  stroke="var(--accent-primary)"
                  strokeWidth="2.5"
                  style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
            </svg>
          ) : null}

          {plotWidth > 0
            ? points.map((p, i) => {
                const isLast = i === n - 1
                return (
                  <motion.div
                    key={i}
                    className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums shadow-sm"
                    style={{
                      left: toX(i),
                      top: scoreToY(p.score) - 28,
                      background: isLast ? 'var(--accent-primary)' : 'var(--card-bg)',
                      color: isLast ? 'white' : 'var(--accent-primary)',
                      border: isLast ? 'none' : '1px solid var(--card-border)',
                    }}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: prefersReducedMotion ? 0 : 0.5 + i * 0.07 }}
                  >
                    {p.score.toFixed(1)}
                  </motion.div>
                )
              })
            : null}
        </div>

        <div className="mt-2 flex justify-between">
          {points.map((p, i) => (
            <span key={i} className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
