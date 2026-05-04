import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PlacementCountdown } from '@/components/layout/PlacementCountdown'
import { ActionCards } from '@/components/dashboard/ActionCards'
import { RecentInterviews } from '@/components/dashboard/RecentInterviews'
import { ScoreTrendChart } from '@/components/dashboard/ScoreTrendChart'
import {
  ClipboardList,
  TrendingUp,
  CheckCircle2,
  Clock,
} from 'lucide-react'

/** Row from interviews + embedded reports. */
type InterviewWithReportsRow = {
  id: string
  role: string
  difficulty: string
  status: string
  completed_at: string | null
  started_at: string | null
  reports: { overall_score: number | null; generated_at: string | null }[] | null
}

type UserRow = {
  name: string | null
  plan_tier: string | null
  credits_remaining: number | null
  placement_date: string | null
  created_at: string | null
}

export async function DashboardMain({
  userId,
  userData,
  displayName,
  memberSince,
  creditsRemaining,
}: {
  userId: string
  userData: UserRow | null
  displayName: string
  memberSince: string
  creditsRemaining: number
}) {
  const supabase = await createClient()
  const { data: interviewsRaw } = await supabase
    .from('interviews')
    .select(`
        id,
        role,
        difficulty,
        status,
        completed_at,
        started_at,
        reports (
          overall_score,
          generated_at
        )
      `)
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(5)

  const rows = (interviewsRaw ?? []) as InterviewWithReportsRow[]
  const interviews = rows.map(({ reports: _r, ...rest }) => rest)

  const reports = rows.flatMap((i) =>
    i.status === 'completed'
      ? (i.reports ?? []).map((r) => ({
          interview_id: i.id,
          overall_score: r.overall_score,
          generated_at: r.generated_at,
        }))
      : [],
  )

  const completedCount = (interviews || []).filter((i) => i.status === 'completed').length
  const totalCount = interviews?.length || 0
  const avgScore =
    reports && reports.length > 0
      ? (reports.reduce((s, r) => s + (r.overall_score || 0), 0) / reports.length).toFixed(1)
      : null
  const trendData = (reports || [])
    .filter((r) => typeof r.overall_score === 'number' && !!r.generated_at)
    .sort(
      (a, b) =>
        new Date(a.generated_at as string).getTime() - new Date(b.generated_at as string).getTime(),
    )
    .slice(-5)
    .map((r, idx) => ({
      label: `#${idx + 1}`,
      score: Number(r.overall_score),
    }))

  const scoreMap = new Map(reports?.map((r) => [r.interview_id, r.overall_score]) || [])

  return (
    <>
      <div className="dashboard-premium-card mb-6 flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-7">
        <div>
          <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Hi, {displayName}
          </p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Member since {memberSince} &nbsp;·&nbsp;
            Interviews completed: {completedCount} &nbsp;·&nbsp;
            Credits: {creditsRemaining} &nbsp;·&nbsp;
            1 interview = 1 credit
          </p>
        </div>
        <div className="flex items-center gap-3">
          {userData?.placement_date ? (
            <PlacementCountdown
              placementDate={userData.placement_date}
              interviewsCompleted={completedCount}
            />
          ) : null}
          <Link
            href="/feedback"
            className="rounded-[14px] border-2 px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            Give feedback
          </Link>
        </div>
      </div>

      <div className="dashboard-premium-card mb-6 px-6 py-5 sm:px-7">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px]"
              style={{ color: 'var(--accent-primary)' }}
            >
              Performance
            </p>
            <p className="text-lg font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
              Score Trend
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Last 5 completed interviews · Hover for details
            </p>
          </div>
          {avgScore ? (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                Average
              </p>
              <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                {avgScore}/10
              </p>
            </div>
          ) : null}
        </div>

        {completedCount < 2 ? (
          <div
            className="flex flex-col items-center justify-center py-12 rounded-xl mt-4"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <TrendingUp size={28} style={{ color: 'var(--text-muted)' }} />
            <p className="mt-3 font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
              Not enough data to show a chart yet
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Complete at least 2 interviews to unlock a meaningful trend.
            </p>
          </div>
        ) : (
          <div className="h-32 rounded-xl mt-4 px-2 py-1" style={{ background: 'var(--bg-secondary)' }}>
            <ScoreTrendChart data={trendData} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        {[
          { label: 'TOTAL INTERVIEWS', value: totalCount, icon: ClipboardList },
          { label: 'COMPLETED INTERVIEWS', value: completedCount, icon: CheckCircle2 },
          { label: 'AVERAGE SCORE', value: avgScore ? `${avgScore}/10` : '—', icon: TrendingUp },
          { label: 'CREDITS LEFT', value: creditsRemaining, icon: Clock },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="dashboard-premium-card px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>
                    {stat.label}
                  </p>
                  <p className="text-4xl font-bold mt-2 leading-none" style={{ color: 'var(--text-primary)' }}>
                    {stat.value}
                  </p>
                </div>
                <div
                  className="rounded-xl p-2.5"
                  style={{
                    background: 'var(--accent-primary)18',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <Icon size={18} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <ActionCards
        cards={[
          {
            label: 'Continue last session',
            description: 'Resume your most recent practice flow.',
            link: interviews?.[0]?.id ? `/interview/${interviews[0].id}` : '/onboarding',
            cta: 'Open →',
          },
          {
            label: 'Open last report',
            description: 'Review feedback and apply one improvement.',
            link:
              interviews?.find((i) => i.status === 'completed')?.id != null
                ? `/report/${interviews.find((i) => i.status === 'completed')!.id}`
                : '/history',
            cta: 'Open report →',
          },
          {
            label: 'Start Practice Interview',
            description: 'New AI mock interview with avatar.',
            link: '/onboarding',
            cta: 'Start now →',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="dashboard-premium-card lg:col-span-2 px-6 py-5 sm:px-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Recent Activity
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Your latest interviews
              </p>
            </div>
            <Link
              href="/history"
              className="rounded-[12px] border-2 px-3 py-1.5 text-xs font-semibold transition-all duration-200"
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
                color: 'var(--text-primary)',
              }}
            >
              View history
            </Link>
          </div>

          <RecentInterviews
            interviews={(interviews || []).map((i) => ({
              id: i.id,
              role: i.role,
              difficulty: i.difficulty,
              status: i.status,
              started_at: i.started_at ?? '',
              score: scoreMap.get(i.id) ?? null,
            }))}
          />
        </div>

        <div className="dashboard-premium-card px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              AI Insights
            </p>
          </div>

          {completedCount === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
              Complete an interview to see AI insights.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                  Weak area
                </p>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{
                    background: 'var(--accent-primary)15',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent-primary)' }} />
                  Confidence
                </span>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                  How to improve
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Slow down slightly and use deliberate pauses after key points.
                </p>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                  Action suggestion
                </p>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Record one answer daily and remove filler words.
                </p>
              </div>
            </div>
          )}

          <div
            className="mt-4 rounded-xl p-3"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--card-border)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                Interview Goal
              </p>
              <p className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
                {Math.round((completedCount / 20) * 100)}%
              </p>
            </div>
            <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>
              Target: 20 interviews · Completed: {completedCount}
            </p>
            <div className="h-1.5 w-full rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((completedCount / 20) * 100, 100)}%`,
                  background: 'var(--accent-primary)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
