'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { activeInterviewResumePath } from '@/lib/interview/active-interview-policy'
import { requestInterviewResume } from '@/lib/interview/request-interview-resume'

export type DashboardRecoveryInterview = {
  id: string
  role: string
  engine?: string | null
  /** continue = open session URL; resume = POST resume API then open */
  mode: 'continue' | 'resume'
}

/**
 * Hero recovery CTA on the candidate dashboard summary card.
 * Abandoned one-continue must reopen via the resume API (session URL redirects away).
 */
export function DashboardRecoveryCta({ interview }: { interview: DashboardRecoveryInterview }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (interview.mode === 'continue') {
    return (
      <Link
        href={activeInterviewResumePath(interview.engine, interview.id)}
        className="dashboard-hover-lift flex min-h-12 items-center justify-between gap-3 rounded-xl border-2 px-4 py-3.5 shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        style={{
          borderColor: 'color-mix(in srgb, var(--accent-primary) 45%, var(--card-border))',
          background: 'color-mix(in srgb, var(--accent-primary) 12%, var(--bg-secondary))',
          textDecoration: 'none',
        }}
      >
        <div className="min-w-0">
          <p className="dashboard-section-eyebrow">In progress</p>
          <p
            className="mt-0.5 truncate text-sm font-semibold sm:text-base"
            style={{ color: 'var(--text-primary)' }}
          >
            {interview.role}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
          Continue interview →
        </span>
      </Link>
    )
  }

  return (
    <button
      type="button"
      disabled={busy}
      className="dashboard-hover-lift flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3.5 text-left shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-primary) 45%, var(--card-border))',
        background: 'color-mix(in srgb, var(--accent-primary) 12%, var(--bg-secondary))',
      }}
      onClick={() => {
        if (
          !window.confirm(
            'This is your one continue on this credit. Same questions. Leave again and the session ends for good.',
          )
        ) {
          return
        }
        setBusy(true)
        void (async () => {
          const result = await requestInterviewResume(interview.id)
          if (!result.ok) {
            if (result.resumeUrl) {
              router.push(result.resumeUrl)
              return
            }
            setBusy(false)
            window.alert(result.message)
            return
          }
          router.push(result.resumeUrl)
        })()
      }}
    >
      <div className="min-w-0">
        <p className="dashboard-section-eyebrow">Incomplete</p>
        <p
          className="mt-0.5 truncate text-sm font-semibold sm:text-base"
          style={{ color: 'var(--text-primary)' }}
        >
          {interview.role}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
        {busy ? 'Opening…' : 'Resume interview →'}
      </span>
    </button>
  )
}
