import Link from 'next/link'
import { Gauge } from 'lucide-react'
import type { ReadinessScoreResult } from '@/lib/candidate/types'
import { DashboardReadinessDonut } from './DashboardReadinessDonut'

const CATEGORY_ICON: Record<string, string> = {
  resume_quality: '📄',
  interview_performance: '📈',
  communication: '💬',
  technical_depth: '</>',
  consistency: '🎯',
}

const CATEGORY_COLOR: Record<string, string> = {
  resume_quality: '#2563eb',
  interview_performance: '#7c3aed',
  communication: '#ea580c',
  technical_depth: '#16a34a',
  consistency: '#db2777',
}

export function DashboardReadinessCard({ readiness }: { readiness: ReadinessScoreResult }) {
  return (
    <section className="dashboard-premium-card px-5 py-5 sm:px-7 sm:py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Gauge className="size-4.5" style={{ color: 'var(--accent-primary)' }} aria-hidden />
          <div>
            <p className="dashboard-section-title !mt-0 text-base sm:text-lg">Interview readiness</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Your recent performance across key skills
            </p>
          </div>
        </div>
        <Link
          href="/readiness"
          className="shrink-0 text-xs font-semibold hover:underline"
          style={{ color: 'var(--accent-primary)' }}
        >
          View details →
        </Link>
      </div>

      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center">
        <DashboardReadinessDonut score={readiness.overall} />

        <div className="w-full flex-1 space-y-3">
          {readiness.categories.map((cat) => (
            <div key={cat.key} className="flex items-center gap-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-xs"
                style={{
                  background: `color-mix(in srgb, ${CATEGORY_COLOR[cat.key] ?? 'var(--accent-primary)'} 14%, transparent)`,
                }}
                aria-hidden
              >
                {CATEGORY_ICON[cat.key] ?? '•'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {cat.label}
                  </p>
                  <span className="shrink-0 text-sm font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {cat.score ?? '—'}/100
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${cat.score ?? 0}%`,
                      background: CATEGORY_COLOR[cat.key] ?? 'var(--accent-primary)',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
