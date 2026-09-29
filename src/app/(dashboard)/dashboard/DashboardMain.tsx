import dynamic from 'next/dynamic'
import Link from 'next/link'
import { RecentInterviews } from '@/components/dashboard/RecentInterviews'
import {
  countHiddenInterviews,
  pickRecentInterviews,
} from '@/lib/dashboard/dashboard-view'
import type { InterviewWithReportsRow, UserRow } from './dashboard-types'

const ScoreTrendChart = dynamic(
  () =>
    import('@/components/dashboard/ScoreTrendChart').then((m) => ({
      default: m.ScoreTrendChart,
    })),
  {
    loading: () => (
      <div
        className="h-28 w-full animate-pulse motion-reduce:animate-none rounded-lg"
        style={{ background: 'var(--bg-tertiary)' }}
        aria-hidden
      />
    ),
  },
)

export function DashboardMain({
  rows,
  avgScore,
}: {
  rows: InterviewWithReportsRow[]
  userData: UserRow | null
  avgScore: string | null
  currentStreak: number
}) {
  const visibleRows = pickRecentInterviews(rows, 3)
  const hiddenCount = countHiddenInterviews(rows, visibleRows)
  const completedCount = rows.filter((row) => row.status === 'completed').length

  type DashboardReportRow = {
    interview_id: string
    overall_score: number
    generated_at: string | null
    reportKind: 'script' | 'v1'
    reportId: string
  }

  const reports: DashboardReportRow[] = rows.flatMap((row): DashboardReportRow[] => {
    if (row.status !== 'completed') return []
    if (row.engine === 'v2.1') {
      return (row.script_interview_reports ?? [])
        .filter((r) => (r.status === 'ready' || r.status === 'partial') && r.overall != null)
        .map((report) => ({
          interview_id: row.id,
          overall_score: Number(report.overall),
          generated_at: report.generated_at,
          reportKind: 'script' as const,
          reportId: report.id,
        }))
    }
    return (row.reports ?? [])
      .filter((report) => report.overall_score != null)
      .map((report) => ({
        interview_id: row.id,
        overall_score: Number(report.overall_score),
        generated_at: report.generated_at,
        reportKind: 'v1' as const,
        reportId: report.id,
      }))
  })

  const trendData = reports
    .filter((report) => typeof report.overall_score === 'number' && !!report.generated_at)
    .sort(
      (a, b) =>
        new Date(a.generated_at as string).getTime() - new Date(b.generated_at as string).getTime(),
    )
    .slice(-5)
    .map((report, idx) => ({
      label: `#${idx + 1}`,
      score: Number(report.overall_score),
    }))

  const scoreMap = new Map(reports.map((report) => [report.interview_id, report.overall_score]))
  const reportMetaMap = new Map(
    reports.map((report) => [
      report.interview_id,
      {
        reportId: report.reportId,
        reportKind: report.reportKind,
        engine: report.reportKind === 'script' ? ('v2.1' as const) : ('v1' as const),
      },
    ]),
  )

  const showTrend = completedCount >= 2

  return (
    <div className={`grid grid-cols-1 gap-3 sm:gap-4 ${showTrend ? 'lg:grid-cols-2 lg:gap-6' : ''}`}>
      {showTrend ? (
        <div className="dashboard-premium-card px-4 py-4 sm:px-6 sm:py-5 lg:px-7 lg:py-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="dashboard-section-eyebrow">Performance</p>
              <p className="dashboard-section-title">Score trend</p>
            </div>
            {avgScore ? (
              <div className="text-right">
                <p className="dashboard-section-eyebrow" style={{ color: 'var(--text-muted)' }}>
                  Average
                </p>
                <p
                  className="mt-0.5 text-2xl font-bold tabular-nums leading-none sm:text-3xl"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {avgScore}
                  <span className="text-base font-semibold sm:text-lg" style={{ color: 'var(--text-muted)' }}>
                    /10
                  </span>
                </p>
              </div>
            ) : null}
          </div>
          <div className="h-28 rounded-xl px-2 py-1" style={{ background: 'var(--bg-secondary)' }}>
            <ScoreTrendChart data={trendData} />
          </div>
        </div>
      ) : null}

      <div className={`dashboard-premium-card px-4 py-4 sm:px-6 sm:py-5 lg:px-7 lg:py-6 ${showTrend ? '' : 'lg:col-span-1'}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="dashboard-section-eyebrow">History</p>
            <p className="dashboard-section-title">Recent activity</p>
            <p className="dashboard-section-subtitle">Latest mocks — continue or review reports</p>
          </div>
          <Link
            href="/history"
            className="dashboard-hover-lift shrink-0 rounded-xl border px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
              color: 'var(--text-secondary)',
            }}
          >
            View all
          </Link>
        </div>

        <RecentInterviews
          interviews={visibleRows.map((row) => {
            const meta = reportMetaMap.get(row.id)
            const engine = row.engine === 'v2.1' ? ('v2.1' as const) : ('v1' as const)
            return {
              id: row.id,
              role: row.role,
              difficulty: row.difficulty,
              status: row.status,
              started_at: row.started_at ?? null,
              completed_at: row.completed_at ?? null,
              engine,
              reportId: meta?.reportId ?? null,
              reportHref:
                row.status === 'completed'
                  ? engine === 'v2.1'
                    ? `/report/script/${row.id}`
                    : meta?.reportId
                      ? `/report/${meta.reportId}`
                      : null
                  : null,
              continueHref:
                engine === 'v2.1' ? `/interview/script/${row.id}` : '/dashboard',
              score: scoreMap.get(row.id) ?? null,
              abandonedResumeUsed: row.abandoned_resume_used === true,
              creditDeducted: row.credit_deducted === true,
            }
          })}
        />

        {hiddenCount > 0 ? (
          <p className="mt-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            +{hiddenCount} more in{' '}
            <Link href="/history" className="font-medium hover:underline" style={{ color: 'var(--accent-primary)' }}>
              interview history
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  )
}
