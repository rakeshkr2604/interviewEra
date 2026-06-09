'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { formatDateEnIn } from '@/lib/datetime/ist'

type FilterTab = 'All' | 'Completed' | 'In-progress'

interface HistoryItem {
  id: string
  role: string
  difficulty: string
  status: string
  startedAt: string
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
      <div className="mb-6 flex gap-2">
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
          </div>
        ) : (
          filteredItems.map((interview) => {
            const isCompleted = interview.status === 'completed'
            const date = formatDateEnIn(interview.startedAt, {
              day: 'numeric',
              month: 'numeric',
              year: 'numeric',
            })
            const reportHref =
              isCompleted && interview.reportId ? `/report/${interview.reportId}` : null

            return (
              <div
                key={interview.id}
                className="dashboard-premium-card flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-7"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {interview.role}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {interview.difficulty} · {date}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-secondary)' }}>
                      {interview.score != null ? `${interview.score}/10` : '—'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Overall Score
                    </p>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: isCompleted ? 'var(--accent-success)20' : 'var(--accent-warning)20',
                      color: isCompleted ? 'var(--accent-success)' : 'var(--accent-warning)',
                    }}
                  >
                    {isCompleted ? 'Completed' : 'Incomplete'}
                  </span>

                  {!isCompleted ? (
                    <Link
                      href={`/interview/session/${interview.id}`}
                      className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ background: 'var(--accent-primary)' }}
                    >
                      Continue
                    </Link>
                  ) : reportHref ? (
                    <Link
                      href={reportHref}
                      className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
