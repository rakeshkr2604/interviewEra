'use client'

import Link from 'next/link'
import { formatInterviewDateEnIn } from '@/lib/datetime/ist'
import { isResumableInterviewStatus } from '@/lib/interview/interview-status'

interface Interview {
  id: string
  role: string
  difficulty: string
  status: string
  started_at: string | null
  completed_at?: string | null
  reportId?: string | null
  score?: number | null
}

interface RecentInterviewsProps {
  interviews: Interview[]
}

const actionBtnClass =
  'inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-90 sm:px-4 sm:text-sm'

export function RecentInterviews({ interviews }: RecentInterviewsProps) {
  if (interviews.length === 0) {
    return (
      <div
        className="rounded-xl px-4 py-6 text-center"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No interviews yet — start your first one!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {interviews.map((interview) => {
        const isCompleted = interview.status === 'completed'
        // Server only accepts answers/checkpoints for pending/in_progress —
        // abandoned sessions are terminal and must not offer "Continue".
        const isResumable = isResumableInterviewStatus(interview.status)
        const date = formatInterviewDateEnIn(interview.started_at, interview.completed_at)
        const reportHref =
          isCompleted && interview.reportId ? `/report/${interview.reportId}` : null

        return (
          <div
            key={interview.id}
            className="dashboard-hover-row flex flex-col gap-3 rounded-xl border px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 82%, transparent)',
            }}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {interview.role}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                {interview.difficulty} · {date}
              </p>
            </div>

            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {interview.score != null ? `${interview.score}/10` : '—'}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
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
                  className={actionBtnClass}
                  style={{ background: 'var(--accent-primary)' }}
                >
                  Continue
                </Link>
              ) : reportHref ? (
                <Link href={reportHref} className={actionBtnClass} style={{ background: 'var(--accent-primary)' }}>
                  View report
                </Link>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
