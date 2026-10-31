'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { Trophy, Map, Flag, PartyPopper, ThumbsUp, Rocket, TrendingDown } from 'lucide-react'
import type { ReadinessScoreResult } from '@/lib/candidate/types'
import {
  computeReadinessTrend,
  computeWindowedFocusAreas,
  computeWindowedReadiness,
  type ReadinessHistoryReport,
} from '@/lib/candidate/readiness-trend'
import { V1_KEY_TO_RUBRIC_KEY } from '@/lib/interview/script-dimension-bridge'
import { ReadinessCategoryCard } from '@/components/candidate/ReadinessCategoryCard'
import { ReadinessScoreTrendChart } from '@/components/candidate/ReadinessScoreTrendChart'
import { ReadinessFocusAreas } from '@/components/candidate/ReadinessFocusAreas'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { JourneyIllustration } from '@/components/candidate/JourneyIllustration'
import { IE_FOCUS_VISIBLE } from '@/lib/theme/component-classes'

const WINDOW_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 0, label: 'All time' },
] as const

const TREND_PRESENTATION: Record<
  ReadinessScoreResult['improvementTrend'],
  { icon: typeof PartyPopper; headline: string }
> = {
  improving: { icon: PartyPopper, headline: "You're on the right track!" },
  steady: { icon: ThumbsUp, headline: 'Steady progress' },
  declining: { icon: TrendingDown, headline: "Let's turn this around" },
  insufficient_data: { icon: Rocket, headline: 'Just getting started' },
}

function filterByWindow(reports: ReadinessHistoryReport[], windowDays: number): ReadinessHistoryReport[] {
  if (windowDays === 0) return reports
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000
  return reports.filter((r) => r.generatedAt && Date.parse(r.generatedAt) >= cutoff)
}

const CATEGORY_DISPLAY_LABELS: Record<string, string> = {
  resume_quality: 'Resume quality',
  interview_performance: 'Interview performance',
  communication: 'Communication',
  technical_depth: 'Technical depth',
  consistency: 'Consistency',
}

export function ReadinessPageContent({
  improvementTrend,
  trendLabel,
  reportHistory,
  resumeScore,
  resumeSummary,
  consistencyScore,
  consistencySummary,
}: {
  improvementTrend: ReadinessScoreResult['improvementTrend']
  trendLabel: string
  reportHistory: ReadinessHistoryReport[]
  resumeScore: number
  resumeSummary: string
  consistencyScore: number
  consistencySummary: string
}) {
  const [windowDays, setWindowDays] = useState<number>(30)
  const prefersReducedMotion = useReducedMotion()

  // Everything below is derived from the SAME filtered report set — trend
  // chart, overall score, and all 5 category cards move together when the
  // window changes. Splitting these (windowed chart + fixed-lifetime cards)
  // read as a bug in practice: picking "Last 7 days" and the score cards not
  // moving at all.
  const windowedReports = useMemo(() => filterByWindow(reportHistory, windowDays), [reportHistory, windowDays])

  const windowed = useMemo(
    () =>
      computeWindowedReadiness(windowedReports, resumeScore, resumeSummary, consistencyScore, consistencySummary),
    [windowedReports, resumeScore, resumeSummary, consistencyScore, consistencySummary],
  )

  const trendPoints = useMemo(() => {
    // The trend chart still walks the FULL window chronologically (not the
    // windowed snapshot) so it can show the cumulative build-up within the
    // window, point by point — computeWindowedReadiness gives the single
    // end-state number for the cards above.
    const sorted = [...windowedReports].sort(
      (a, b) => Date.parse(a.generatedAt ?? '') - Date.parse(b.generatedAt ?? ''),
    )
    return computeReadinessTrend(sorted, resumeScore, consistencyScore)
  }, [windowedReports, resumeScore, consistencyScore])

  const focusAreas = useMemo(
    () =>
      computeWindowedFocusAreas(windowedReports, 3).map((row) => ({
        rubricKey: V1_KEY_TO_RUBRIC_KEY[row.dimensionKey],
        name: row.name,
        pct: row.pct,
      })),
    [windowedReports],
  )

  const presentation = TREND_PRESENTATION[improvementTrend]
  const TrendIcon = presentation.icon
  const overallDelta =
    trendPoints.length >= 2 && trendPoints[0].score > 0
      ? Math.round(((trendPoints[trendPoints.length - 1].score - trendPoints[0].score) / trendPoints[0].score) * 100)
      : null

  return (
    <div className="space-y-6">
      {/*
        Header + controls in one row — these used to be two disconnected
        pieces (a server-rendered DashboardPageHeader, then a separate
        client-only controls row floating below it with its own alignment),
        which read as two unrelated blocks instead of one page header. The
        window selector is page-local client state, so the header moved in
        here with it rather than trying to share state across the server/
        client boundary.
      */}
      <DashboardPageHeader
        eyebrow="Insights"
        title="Readiness score"
        subtitle="Production score from your resume, interview reports, and practice consistency."
        action={
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={windowDays}
                onChange={(e) => setWindowDays(Number(e.target.value))}
                className={`rounded-xl border px-3.5 py-2 text-sm font-medium outline-none ${IE_FOCUS_VISIBLE}`}
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                }}
                aria-label="Trend window — filters every score on this page"
              >
                {WINDOW_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Link
                href="/roadmap"
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.02] ${IE_FOCUS_VISIBLE}`}
                style={{
                  background: 'linear-gradient(135deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 72%, #5b21b6))',
                }}
              >
                <Map className="size-4" aria-hidden />
                View full roadmap
                <span aria-hidden>→</span>
              </Link>
            </div>
            {/* Data-basis line — explicit about what window is driving the numbers below */}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {windowed.rangeLabel}
              {windowDays !== 0 ? ` (${WINDOW_OPTIONS.find((o) => o.value === windowDays)?.label.toLowerCase()})` : ''}
            </p>
          </div>
        }
      />

      {/* Overall score hero */}
      <section className="dashboard-premium-card overflow-hidden px-5 py-5 sm:px-7 sm:py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex items-center gap-4">
            <span
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                color: 'var(--accent-primary)',
              }}
              aria-hidden
            >
              <Trophy className="size-7" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Overall score
              </p>
              <p className="text-4xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {windowed.overall}
                <span className="text-xl font-semibold" style={{ color: 'var(--text-muted)' }}>
                  /100
                </span>
              </p>
              {overallDelta != null ? (
                <p
                  className="mt-1 flex items-center gap-1 text-sm font-semibold"
                  style={{ color: overallDelta >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}
                >
                  {overallDelta >= 0 ? '↑' : '↓'} {Math.abs(overallDelta)}%
                  <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
                    within this window
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          <div
            className="rounded-2xl p-4"
            style={{ background: 'color-mix(in srgb, var(--accent-primary) 6%, var(--bg-secondary))' }}
          >
            <p className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              <TrendIcon className="size-4" style={{ color: 'var(--accent-primary)' }} aria-hidden />
              {presentation.headline}
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {trendLabel}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div
                className="h-2 flex-1 overflow-hidden rounded-full"
                style={{ background: 'var(--bg-tertiary)' }}
                role="progressbar"
                aria-valuenow={windowed.overall}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Overall readiness"
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--accent-primary)' }}
                  initial={prefersReducedMotion ? false : { width: 0 }}
                  animate={{ width: `${windowed.overall}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {windowed.overall}%
              </span>
            </div>
          </div>

          <div
            className="hidden items-center gap-3 overflow-hidden rounded-2xl p-4 lg:flex"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 10%, var(--bg-secondary)), color-mix(in srgb, var(--accent-primary) 4%, var(--bg-secondary)))',
            }}
          >
            <div className="h-24 w-36 shrink-0">
              <JourneyIllustration />
            </div>
            <div className="max-w-[9rem]">
              <p className="flex items-center gap-1.5 text-sm font-bold" style={{ color: 'var(--accent-primary)' }}>
                <Flag className="size-3.5" aria-hidden />
                Keep going!
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Complete more mock interviews to boost your score.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Category cards — all 5 recompute from the same windowed report set above */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {windowed.categories.map((cat, i) => (
          <ReadinessCategoryCard
            key={cat.key}
            categoryKey={cat.key}
            label={CATEGORY_DISPLAY_LABELS[cat.key]}
            score={cat.score}
            summary={cat.summary}
            deltaPercent={cat.deltaPercent}
            isLifetimeOnly={cat.isLifetimeOnly}
            delay={i * 0.06}
          />
        ))}
      </section>

      {/* Trend + focus areas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="dashboard-premium-card px-5 py-5 sm:px-7 lg:col-span-2">
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Score trend
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Track your overall readiness score over time — {windowed.rangeLabel.toLowerCase()}.
          </p>
          <div className="mt-5">
            <ReadinessScoreTrendChart points={trendPoints} />
          </div>
        </section>

        <ReadinessFocusAreas areas={focusAreas} />
      </div>
    </div>
  )
}
