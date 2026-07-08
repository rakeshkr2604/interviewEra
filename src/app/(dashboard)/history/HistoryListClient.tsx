'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { formatInterviewDateTimeEnIn } from '@/lib/datetime/ist'
import { isResumableInterviewStatus } from '@/lib/interview/interview-status'
import { CommunityCTA } from '@/components/community/CommunityCTA'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<FilterTab>('All')
  const [continueTargetId, setContinueTargetId] = useState<string | null>(null)

  const filteredItems = useMemo(() => {
    if (activeTab === 'All') return items
    if (activeTab === 'Completed') return items.filter((item) => item.status === 'completed')
    return items.filter((item) => item.status !== 'completed')
  }, [activeTab, items])

  const tabCounts = useMemo<Record<FilterTab, number>>(
    () => ({
      All: items.length,
      Completed: items.filter((item) => item.status === 'completed').length,
      'In-progress': items.filter((item) => item.status !== 'completed').length,
    }),
    [items],
  )

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
            {tab} ({tabCounts[tab]})
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
            const isEnded = interview.status === 'abandoned'
            const date = formatInterviewDateTimeEnIn(interview.startedAt, interview.completedAt)
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
                    <button
                      type="button"
                      onClick={() => setContinueTargetId(interview.id)}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 active:opacity-90 sm:text-sm"
                      style={{ background: 'var(--accent-primary)' }}
                    >
                      Continue
                    </button>
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

                {isEnded ? (
                  <p className="w-full text-sm" style={{ color: 'var(--text-muted)' }}>
                    Session ended without completion — credit was deducted
                  </p>
                ) : null}

                {isResumable ? (
                  <div
                    className="w-full rounded-lg border px-3 py-2 text-xs leading-relaxed"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--accent-warning) 35%, transparent)',
                      background: 'color-mix(in srgb, var(--accent-warning) 10%, transparent)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    ⚠ Complete in one sitting — if you exit without finishing, this credit will be
                    deducted and the interview will be marked as Ended. You won&apos;t be able to
                    continue it.
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </div>

      <Dialog open={continueTargetId !== null} onOpenChange={(open) => !open && setContinueTargetId(null)}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Continue your interview?</DialogTitle>
            <DialogDescription>
              This is your only attempt. Exiting without completing will mark it as Ended and
              deduct your credit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setContinueTargetId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (continueTargetId) router.push(`/interview/session/${continueTargetId}`)
              }}
            >
              Continue Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
