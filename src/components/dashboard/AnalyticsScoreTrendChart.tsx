'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { BarChart3, TrendingUp } from 'lucide-react'
import { tierColorFromScore } from '@/lib/utils/score-tier-color'

export interface ScoreTrendPoint {
  label: string
  score: number
  dateLabel: string
}

interface AnalyticsScoreTrendChartProps {
  points: ScoreTrendPoint[]
  improvementPct: number | null
}

const CHART_HEIGHT = 168
const BAR_MAX_WIDTH = 40
const Y_TICKS = [0, 2, 4, 6, 8, 10]
const Y_AXIS_WIDTH = 22

function scoreToY(score: number): number {
  const safe = Math.max(0, Math.min(10, score))
  return CHART_HEIGHT - (safe / 10) * CHART_HEIGHT
}

export function AnalyticsScoreTrendChart({ points, improvementPct }: AnalyticsScoreTrendChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [plotWidth, setPlotWidth] = useState(0)
  const plotRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const n = points.length

  // Measure the plot's real pixel width so the trend-line SVG can use a
  // viewBox that matches the DOM 1:1 (no non-uniform stretch). A scaled,
  // non-square viewBox + vector-effect="non-scaling-stroke" + Framer
  // Motion's pathLength draw-in is a known combination that renders the
  // stroke as broken/dashed segments in some browsers — 1:1 pixel space
  // sidesteps the whole class of bug instead of chasing the render quirk.
  useEffect(() => {
    const el = plotRef.current
    if (!el) return
    const update = () => setPlotWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (n < 2) return null

  // Matches the bar row's `gap-2` (8px) between n equal-width flex-1 columns —
  // must mirror the actual flex layout exactly, or the line drifts off the
  // bar tops as n or the container width changes.
  const GAP_PX = 8
  const columnWidth = Math.max(0, (plotWidth - GAP_PX * (n - 1)) / n)
  const centers = points.map((_, i) => i * (columnWidth + GAP_PX) + columnWidth / 2)
  const linePoints = points
    .map((p, i) => `${centers[i]},${scoreToY(p.score)}`)
    .join(' ')

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
              color: 'var(--accent-primary)',
            }}
            aria-hidden
          >
            <BarChart3 className="size-4.5" />
          </span>
          <div>
            <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Score trend
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              Last {n} completed interviews
            </p>
          </div>
        </div>
        {improvementPct != null ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-col items-center rounded-2xl px-3 py-1.5"
            style={{
              background:
                improvementPct >= 0
                  ? 'color-mix(in srgb, var(--accent-success) 14%, transparent)'
                  : 'color-mix(in srgb, var(--accent-danger) 14%, transparent)',
            }}
          >
            <span
              className="flex items-center gap-1 text-sm font-bold"
              style={{ color: improvementPct >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}
            >
              <TrendingUp
                className="size-3.5"
                style={{ transform: improvementPct >= 0 ? undefined : 'scaleY(-1)' }}
              />
              {improvementPct >= 0 ? `+${improvementPct}%` : `${improvementPct}%`}
            </span>
            <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>
              vs previous {n}
            </span>
          </motion.div>
        ) : null}
      </div>

      <div
        className="relative mt-4 rounded-xl px-4 pb-4 pt-6"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div className="flex gap-2">
          {/* Y-axis labels */}
          <div className="relative shrink-0" style={{ width: Y_AXIS_WIDTH, height: CHART_HEIGHT }}>
            {Y_TICKS.map((tick) => (
              <span
                key={tick}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums"
                style={{ top: scoreToY(tick), color: 'var(--text-muted)' }}
              >
                {tick}
              </span>
            ))}
          </div>

          {/*
            Bar track — EXACTLY CHART_HEIGHT, bars + line only. Labels render in
            a separate row below (not nested in this flex column) — a shared
            column with the date/score <p> tags caused the browser to flex-
            shrink the bar's height:100% to make room for them, so bars
            rendered ~20% shorter than the line (which assumed the full
            CHART_HEIGHT was available). Keeping the measured geometry isolated
            from text flow is what keeps the two in sync.
          */}
          <div
            ref={plotRef}
            className="relative flex min-w-0 flex-1 items-end justify-between gap-2"
            style={{ height: CHART_HEIGHT }}
          >
            {/* Gridlines — recessive, dashed, one per Y tick */}
            {Y_TICKS.map((tick) => (
              <div
                key={tick}
                className="absolute inset-x-0 border-t border-dashed"
                style={{ top: scoreToY(tick), borderColor: 'var(--card-border)', opacity: 0.6 }}
                aria-hidden
              />
            ))}

            {/* Trend line + point markers — 1:1 pixel viewBox, no scale distortion */}
            {plotWidth > 0 ? (
              <svg
                className="pointer-events-none absolute inset-0 overflow-visible"
                width={plotWidth}
                height={CHART_HEIGHT}
                viewBox={`0 0 ${plotWidth} ${CHART_HEIGHT}`}
                aria-hidden
              >
                <motion.polyline
                  points={linePoints}
                  fill="none"
                  stroke="var(--accent-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.55 }}
                  initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.55 }}
                  transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
                />
                {points.map((p, i) => {
                  const safeScore = Math.max(0, Math.min(10, p.score))
                  return (
                    <motion.circle
                      key={i}
                      cx={centers[i]}
                      cy={scoreToY(safeScore)}
                      r={4}
                      fill="var(--bg-secondary)"
                      stroke={tierColorFromScore(safeScore)}
                      strokeWidth="2"
                      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: prefersReducedMotion ? 0 : 0.5 + i * 0.08 }}
                    />
                  )
                })}
              </svg>
            ) : null}

            {points.map((point, i) => {
              const safeScore = Math.max(0, Math.min(10, point.score))
              const heightPct = Math.max(6, (safeScore / 10) * 100)
              const isHovered = hovered === i
              const isLatest = i === n - 1
              const tier = tierColorFromScore(safeScore)

              return (
                <div
                  key={`${point.label}-${point.dateLabel}-${i}`}
                  className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                >
                  {/* Always-visible value pill above the point */}
                  <motion.div
                    className="pointer-events-none absolute whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
                    style={{
                      bottom: `calc(${heightPct}% + 10px)`,
                      background: `color-mix(in srgb, ${tier} 16%, var(--card-bg))`,
                      color: tier,
                    }}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: prefersReducedMotion ? 0 : 0.55 + i * 0.08 }}
                  >
                    {safeScore.toFixed(1)}
                  </motion.div>

                  <button
                    type="button"
                    className="group relative flex w-full max-w-10 flex-col items-center justify-end rounded-t-sm outline-none"
                    style={{ height: '100%' }}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    aria-label={`${point.dateLabel}: ${safeScore.toFixed(1)} out of 10`}
                  >
                    <motion.div
                      className="w-full rounded-t-[4px]"
                      style={{
                        maxWidth: BAR_MAX_WIDTH,
                        background: isLatest
                          ? `linear-gradient(180deg, color-mix(in srgb, ${tier} 85%, white), ${tier})`
                          : `linear-gradient(180deg, color-mix(in srgb, ${tier} 65%, transparent), color-mix(in srgb, ${tier} 85%, transparent))`,
                        boxShadow: isLatest
                          ? `0 0 0 2px color-mix(in srgb, ${tier} 35%, transparent)`
                          : isHovered
                            ? `0 0 0 2px color-mix(in srgb, ${tier} 45%, transparent)`
                            : 'none',
                      }}
                      initial={prefersReducedMotion ? false : { height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{
                        duration: 0.6,
                        delay: prefersReducedMotion ? 0 : i * 0.08,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      whileHover={{ filter: 'brightness(1.08)' }}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Labels row — mirrors the bar track's flex-1/gap-2 column structure for alignment */}
        <div className="mt-2 flex gap-2" style={{ paddingLeft: Y_AXIS_WIDTH + 8 }}>
          {points.map((point, i) => {
            const safeScore = Math.max(0, Math.min(10, point.score))
            return (
              <div key={`${point.label}-${point.dateLabel}-${i}-label`} className="min-w-0 flex-1 text-center">
                <p className="truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {point.dateLabel}
                </p>
                <p
                  className="text-[10px] font-semibold tabular-nums"
                  style={{ color: tierColorFromScore(safeScore) }}
                >
                  {safeScore.toFixed(1)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
