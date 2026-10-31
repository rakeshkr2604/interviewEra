'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Flame, TrendingUp, Zap, type LucideIcon } from 'lucide-react'
import { IE_FOCUS_VISIBLE } from '@/lib/theme/component-classes'

export interface DashboardProgressPoint {
  /** ISO timestamp of when the interview/report completed. */
  completedAt: string | null
  score: number | null
}

const WINDOWS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 0, label: 'All time' },
] as const

function windowStats(points: DashboardProgressPoint[], days: number) {
  const withDate = points.filter((p): p is DashboardProgressPoint & { completedAt: string } =>
    p.completedAt != null,
  )
  const inWindow =
    days === 0
      ? withDate
      : withDate.filter((p) => Date.parse(p.completedAt) >= Date.now() - days * 24 * 60 * 60 * 1000)
  const completed = inWindow.length
  const scored = inWindow.filter((p): p is { completedAt: string; score: number } => p.score != null)
  const avg = scored.length > 0 ? scored.reduce((s, p) => s + p.score, 0) / scored.length : null
  return { completed, avg }
}

function previousWindowStats(points: DashboardProgressPoint[], days: number) {
  const withDate = points.filter((p): p is DashboardProgressPoint & { completedAt: string } =>
    p.completedAt != null,
  )
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const prevCutoff = cutoff - days * 24 * 60 * 60 * 1000
  const prevWindow = withDate.filter(
    (p) => Date.parse(p.completedAt) >= prevCutoff && Date.parse(p.completedAt) < cutoff,
  )
  const completed = prevWindow.length
  const scored = prevWindow.filter((p): p is { completedAt: string; score: number } => p.score != null)
  const avg = scored.length > 0 ? scored.reduce((s, p) => s + p.score, 0) / scored.length : null
  return { completed, avg }
}

function deltaPercent(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct == null) {
    return (
      <span className="shrink-0 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        —
      </span>
    )
  }
  const positive = pct >= 0
  return (
    <span
      className="shrink-0 text-xs font-bold"
      style={{ color: positive ? 'var(--accent-success)' : 'var(--accent-danger)' }}
    >
      {positive ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  )
}

function StatTile({
  icon: Icon,
  color,
  label,
  value,
  suffix,
  deltaPct,
}: {
  icon: LucideIcon
  color: string
  label: string
  value: string
  suffix?: string
  deltaPct: number | null
}) {
  return (
    <div className="dashboard-premium-card flex items-center gap-3 px-4 py-4">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
        aria-hidden
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        <p className="text-xl font-bold tabular-nums leading-tight" style={{ color: 'var(--text-primary)' }}>
          {value}
          {suffix ? (
            <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              {suffix}
            </span>
          ) : null}
        </p>
      </div>
      <DeltaBadge pct={deltaPct} />
    </div>
  )
}

export function DashboardProgressOverview({
  points,
  lifetimeCompletedCount,
  currentStreak,
}: {
  /** Up to ~20 most recent scored interviews — not full lifetime history, but
   *  enough for honest 7d/30d windows; "All time" count uses the real total. */
  points: DashboardProgressPoint[]
  lifetimeCompletedCount: number
  currentStreak: number
}) {
  const [windowDays, setWindowDays] = useState<number>(30)

  const { completed, avg, completedDelta, avgDelta } = useMemo(() => {
    const current = windowStats(points, windowDays)
    // Previous equivalent window, for a delta badge — all-time has no "previous" to compare to.
    const previous = windowDays > 0 ? previousWindowStats(points, windowDays) : { completed: null, avg: null }
    return {
      completed: windowDays === 0 ? lifetimeCompletedCount : current.completed,
      avg: current.avg,
      completedDelta: windowDays === 0 ? null : deltaPercent(current.completed, previous.completed),
      avgDelta: windowDays === 0 ? null : deltaPercent(current.avg, previous.avg),
    }
  }, [points, windowDays, lifetimeCompletedCount])

  return (
    <section className="dashboard-section">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="size-4" style={{ color: 'var(--accent-primary)' }} aria-hidden />
          <h2 className="dashboard-section-title !mt-0">Your progress overview</h2>
        </div>
        <div className="inline-flex rounded-xl border p-0.5" style={{ borderColor: 'var(--card-border)' }}>
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => setWindowDays(w.value)}
              className={`rounded-[0.6rem] px-3 py-1.5 text-xs font-semibold transition-colors ${IE_FOCUS_VISIBLE}`}
              style={
                windowDays === w.value
                  ? { background: 'var(--accent-primary)', color: 'white' }
                  : { color: 'var(--text-secondary)' }
              }
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          icon={CheckCircle2}
          color="var(--accent-primary)"
          label="Completed mocks"
          value={String(completed)}
          deltaPct={completedDelta}
        />
        <StatTile
          icon={TrendingUp}
          color="#16a34a"
          label="Average score"
          value={avg != null ? avg.toFixed(1) : '—'}
          suffix="/10"
          deltaPct={avgDelta}
        />
        <StatTile
          icon={Flame}
          color="#f97316"
          label="Current streak"
          value={`${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`}
          deltaPct={null}
        />
      </div>
    </section>
  )
}
