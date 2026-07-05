'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { formatInterviewDateEnIn } from '@/lib/datetime/ist'
import { isResumableInterviewStatus } from '@/lib/interview/interview-status'
import { CommunityCTA } from '@/components/community/CommunityCTA'

type FilterTab = 'All' | 'Completed' | 'In-progress'

interface HistoryItem {
  id: string
  role: string
  difficulty: string
  status: string
  startedAt: string | null
  completedAt: string | null
  reportId: string | null
  score: number | null
}

interface HistoryListClientProps {
  items: HistoryItem[]
}

const TABS: FilterTab[] = ['All', 'Completed', 'In-progress']

export function HistoryListClient({ items }: HistoryListClientProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('All')

  const filteredItems = useMemo(() => {
    if (activeTab === 'All') return items
    if (activeTab === 'Completed') return items.filter((item) => item.status === 'completed')
    return items.filter((item) => item.status !== 'completed')
  }, [activeTab, items])

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150"
            style={{
              background: tab === activeTab ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: tab === activeTab ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--card-border)',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="dashboard-premium-card p-12 text-center sm:p-14">
            <p className="mb-2 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              No {activeTab === 'All' ? '' : activeTab.toLowerCase()} interviews yet
            </p>
            <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Start your next mock interview to build your history.
            </p>
            <Link
              href="/onboarding"
              className="landing-cta-lift inline-block rounded-[14px] px-6 py-2.5 text-sm font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
                boxShadow: '0 16px 48px color-mix(in srgb, var(--accent-primary) 32%, transparent)',
              }}
            >
              Start Interview
            </Link>
            <div className="mt-6 flex justify-center">
              <CommunityCTA placement="dashboard_empty_state" />
            </div>
          </div>
        ) : (
          filteredItems.map((interview) => {
            const isCompleted = interview.status === 'completed'
            // Server only accepts answers/checkpoints for pending/in_progress —
            // abandoned sessions are terminal and must not offer "Continue".
            const isResumable = isResumableInterviewStatus(interview.status)
            const date = formatInterviewDateEnIn(interview.startedAt, interview.completedAt)
            const reportHref =
              isCompleted && interview.reportId ? `/report/${interview.reportId}` : null

            return (
              <div
                key={interview.id}
                className="dashboard-premium-card flex flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5 lg:px-7"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="text-base font-semibold leading-snug sm:truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {interview.role}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {interview.difficulty} · {date}
                  </p>
                </div>

                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <div className="text-left sm:text-right">
                      <p
                        className="text-lg font-bold tabular-nums sm:text-2xl"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {interview.score != null ? `${interview.score}/10` : '—'}
                      </p>
                      <p className="text-[10px] sm:text-right" style={{ color: 'var(--text-muted)' }}>
                        Overall Score
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs"
                      style={{
                        background: isCompleted ? 'var(--accent-success)20' : 'var(--accent-warning)20',
                        color: isCompleted ? 'var(--accent-success)' : 'var(--accent-warning)',
                      }}
                    >
                      {isCompleted ? 'Completed' : interview.status === 'abandoned' ? 'Ended' : 'Incomplete'}
                    </span>
                  </div>

                  {isResumable ? (
                    <Link
                      href={`/interview/session/${interview.id}`}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 active:opacity-90 sm:text-sm"
                      style={{ background: 'var(--accent-primary)' }}
                    >
                      Continue
                    </Link>
                  ) : reportHref ? (
                    <Link
                      href={reportHref}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 active:opacity-90 sm:text-sm"
                      style={{ background: 'var(--accent-primary)' }}
                    >
                      View report
                    </Link>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
