'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { formatInterviewDateEnIn } from '@/lib/datetime/ist'
import { isResumableInterviewStatus, shouldOfferHistoryContinue } from '@/lib/interview/interview-status'
import { requestInterviewResume } from '@/lib/interview/request-interview-resume'

interface Interview {
  id: string
  role: string
  difficulty: string
  status: string
  started_at: string | null
  completed_at?: string | null
  engine?: 'v1' | 'v2.1'
  reportId?: string | null
  reportHref?: string | null
  continueHref?: string | null
  score?: number | null
  abandonedResumeUsed?: boolean
  creditDeducted?: boolean
}

interface RecentInterviewsProps {
  interviews: Interview[]
}

const actionBtnClass =
  'inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-90 sm:px-4 sm:text-sm'

export function RecentInterviews({ interviews }: RecentInterviewsProps) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

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
        const isResumable = isResumableInterviewStatus(interview.status)
        const canContinue = shouldOfferHistoryContinue({
          status: interview.status,
          abandonedResumeUsed: interview.abandonedResumeUsed,
          creditDeducted: interview.creditDeducted,
        })
        const date = formatInterviewDateEnIn(interview.started_at, interview.completed_at)
        const continueHref =
          interview.continueHref ??
          (interview.engine === 'v2.1'
            ? `/interview/script/${interview.id}`
            : '/dashboard')
        const reportHref =
          interview.reportHref ??
          (isCompleted && interview.reportId
            ? interview.engine === 'v2.1'
              ? `/report/script/${interview.id}`
              : `/report/${interview.reportId}`
            : null)

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
                  {interview.score != null ? `${Number(interview.score).toFixed(1)}/10` : '—'}
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

              {canContinue ? (
                isResumable ? (
                <Link
                  href={continueHref}
                  className={actionBtnClass}
                  style={{ background: 'var(--accent-primary)' }}
                >
                  Continue
                </Link>
                ) : (
                <button
                  type="button"
                  disabled={busyId === interview.id}
                  className={actionBtnClass}
                  style={{ background: 'var(--accent-primary)' }}
                  onClick={() => {
                    if (
                      !window.confirm(
                        'This is your one continue on this credit. Same questions. Leave again and the session ends for good.',
                      )
                    ) {
                      return
                    }
                    setBusyId(interview.id)
                    void (async () => {
                      const result = await requestInterviewResume(interview.id)
                      if (!result.ok) {
                        if (result.resumeUrl) {
                          router.push(result.resumeUrl)
                          return
                        }
                        setBusyId(null)
                        window.alert(result.message)
                        return
                      }
                      router.push(result.resumeUrl)
                    })()
                  }}
                >
                  {busyId === interview.id ? 'Opening…' : 'Continue'}
                </button>
                )
              ) : reportHref ? (
                <Link
                  href={reportHref}
                  prefetch={false}
                  className={actionBtnClass}
                  style={{ background: 'var(--accent-primary)' }}
                >
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
