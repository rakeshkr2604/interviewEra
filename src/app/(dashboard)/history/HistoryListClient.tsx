'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { formatInterviewDateTimeEnIn } from '@/lib/datetime/ist'
import { isResumableInterviewStatus } from '@/lib/interview/interview-status'
import { getInterviewRecoveryPresentation } from '@/lib/interview/interview-recovery-ui'
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
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path'
import { requestInterviewResume } from '@/lib/interview/request-interview-resume'

type FilterTab = 'All' | 'Completed' | 'In-progress'

interface HistoryItem {
  id: string
  role: string
  difficulty: string
  status: string
  startedAt: string | null
  completedAt: string | null
  engine: 'v1' | 'v2.1'
  reportHref: string | null
  continueHref: string
  score: number | null
  abandonedResumeUsed: boolean
  creditDeducted: boolean
}

interface HistoryListClientProps {
  items: HistoryItem[]
}

const TABS: FilterTab[] = ['All', 'Completed', 'In-progress']

export function HistoryListClient({ items }: HistoryListClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<FilterTab>('All')
  const [continueTarget, setContinueTarget] = useState<HistoryItem | null>(null)
  const [continueBusy, setContinueBusy] = useState(false)
  const [continueError, setContinueError] = useState<string | null>(null)

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
              href={getDefaultInterviewStartPath()}
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
            const isResumable = isResumableInterviewStatus(interview.status)
            const reportHref = interview.reportHref
            const presentation = getInterviewRecoveryPresentation({
              status: interview.status,
              abandonedResumeUsed: interview.abandonedResumeUsed,
              creditDeducted: interview.creditDeducted,
              hasReportHref: Boolean(reportHref),
            })
            const canContinue =
              presentation.mode === 'continue' || presentation.mode === 'resume'
            const isEnded = interview.status === 'abandoned'
            const isCompleted = presentation.badge === 'Completed'
            const date = formatInterviewDateTimeEnIn(interview.startedAt, interview.completedAt)
            const isScript = interview.engine === 'v2.1'

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
                    {isScript ? ' · v2.1' : ''}
                  </p>
                </div>

                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <div className="text-left sm:text-right">
                      <p
                        className="text-lg font-bold tabular-nums sm:text-2xl"
                        style={{
                          color:
                            interview.score != null ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {interview.score != null ? `${Number(interview.score).toFixed(1)}/10` : '—'}
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
                      {presentation.badge}
                    </span>
                  </div>

                  {canContinue ? (
                    <button
                      type="button"
                      onClick={() => {
                        setContinueError(null)
                        setContinueTarget(interview)
                      }}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 active:opacity-90 sm:text-sm"
                      style={{ background: 'var(--accent-primary)' }}
                    >
                      {presentation.cta}
                    </button>
                  ) : interview.reportHref ? (
                    <Link
                      href={interview.reportHref}
                      prefetch={false}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 active:opacity-90 sm:text-sm"
                      style={{ background: 'var(--accent-primary)' }}
                    >
                      View report
                    </Link>
                  ) : null}
                </div>

                {isEnded ? (
                  <p className="w-full text-sm" style={{ color: 'var(--text-muted)' }}>
                    {presentation.mode === 'resume'
                      ? 'Session ended without completion — one resume left on this credit, same questions.'
                      : 'Session ended without completion — credit was deducted'}
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
                    {isScript ? (
                      <>
                        Resume from your last question — finish this session so your credit is not wasted.
                        Completing generates your score report. If you exit, you get one continue from history.
                      </>
                    ) : (
                      <>
                        Complete in one sitting if you can. If you exit, you get one continue from history
                        on this credit with the same questions. A second exit ends the session.
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </div>

      <Dialog
        open={continueTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setContinueTarget(null)
            setContinueError(null)
            setContinueBusy(false)
          }
        }}
      >
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {continueTarget?.status === 'abandoned'
                ? 'Resume your interview?'
                : 'Continue your interview?'}
            </DialogTitle>
            <DialogDescription>
              {continueTarget?.status === 'abandoned'
                ? 'This is your one resume on this credit. You will reopen the same interview. If you leave again, the session ends for good.'
                : continueTarget?.engine === 'v2.1'
                  ? 'You will resume from the last question you reached. Finish the session to generate your report and use this credit fully.'
                  : 'You will resume this session. If you exit, you still have one continue from history on this credit.'}
            </DialogDescription>
          </DialogHeader>
          {continueError ? (
            <p className="text-sm" style={{ color: 'var(--accent-danger, #b91c1c)' }}>
              {continueError}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={continueBusy}
              onClick={() => setContinueTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={continueBusy || !continueTarget}
              onClick={() => {
                if (!continueTarget) return
                void (async () => {
                  setContinueBusy(true)
                  setContinueError(null)
                  const result = await requestInterviewResume(continueTarget.id)
                  if (!result.ok) {
                    if (result.resumeUrl) {
                      router.push(result.resumeUrl)
                      return
                    }
                    setContinueError(result.message)
                    setContinueBusy(false)
                    return
                  }
                  router.push(result.resumeUrl)
                })()
              }}
            >
              {continueBusy
                ? 'Opening…'
                : continueTarget?.status === 'abandoned'
                  ? 'Resume interview'
                  : 'Continue interview'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
