'use client'

import { useMemo, useState } from 'react'
import { DashboardScoreTrendChart, type DashboardTrendPoint } from './DashboardScoreTrendChart'
import { IE_FOCUS_VISIBLE } from '@/lib/theme/component-classes'

const SESSION_OPTIONS = [5, 10, 0] as const
const SESSION_LABELS: Record<number, string> = { 5: 'Last 5 sessions', 10: 'Last 10 sessions', 0: 'All sessions' }

export function DashboardScoreTrendSection({
  points,
  avgScore,
}: {
  /** Chronologically ordered (oldest first), full available set. */
  points: DashboardTrendPoint[]
  avgScore: string | null
}) {
  const [limit, setLimit] = useState<number>(5)

  const visible = useMemo(() => (limit === 0 ? points : points.slice(-limit)), [points, limit])

  return (
    <div className="dashboard-premium-card px-4 py-4 sm:px-6 sm:py-5 lg:px-7 lg:py-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="dashboard-section-eyebrow">Performance</p>
          <p className="dashboard-section-title">Score trend</p>
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium outline-none ${IE_FOCUS_VISIBLE}`}
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
          aria-label="Number of sessions to show"
        >
          {SESSION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {SESSION_LABELS[opt]}
            </option>
          ))}
        </select>
      </div>
      {avgScore ? (
        <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Average {avgScore}/10 across your recent sessions.
        </p>
      ) : null}
      <DashboardScoreTrendChart points={visible} />
    </div>
  )
}
