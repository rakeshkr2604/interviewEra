'use client'

import { useEffect, useState } from 'react'
import type { UserTechnicalFailureCase } from '@/app/api/account/technical-failures/route'
import { TECHNICAL_FAILURE_CATEGORY_LABELS } from '@/lib/technical-failures/types'
import { TECHNICAL_FAILURE_STATUS_LABELS } from '@/lib/technical-failures/status'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TechnicalIssueStatusList({ highlightId }: { highlightId?: string | null }) {
  const [items, setItems] = useState<UserTechnicalFailureCase[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/account/technical-failures')
        const data = (await res.json().catch(() => null)) as
          | { items?: UserTechnicalFailureCase[]; error?: string }
          | null
        if (!res.ok) {
          if (!cancelled) setError(data?.error || 'Could not load technical issues.')
          return
        }
        if (!cancelled) setItems(data?.items ?? [])
      } catch {
        if (!cancelled) setError('Could not load technical issues.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {error}
      </p>
    )
  }

  if (!items) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Loading technical issues…
      </p>
    )
  }

  if (items.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        No interview technical issues reported yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const highlighted = highlightId === item.id
        return (
          <div
            key={item.id}
            id={`technical-issue-${item.id}`}
            className="rounded-2xl border p-4"
            style={{
              borderColor: highlighted ? 'var(--accent-primary)' : 'var(--card-border)',
              background: 'var(--card-bg)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {item.interviewRole ?? 'Interview'}
                {item.interviewDifficulty ? ` · ${item.interviewDifficulty}` : ''}
              </p>
              <span
                className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  borderColor: 'var(--card-border)',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-secondary)',
                }}
              >
                {TECHNICAL_FAILURE_STATUS_LABELS[item.status]}
              </span>
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {TECHNICAL_FAILURE_CATEGORY_LABELS[item.failureCategory]}
            </p>
            <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Submitted {formatDate(item.submittedAt)}
              {item.resolvedAt ? ` · Resolved ${formatDate(item.resolvedAt)}` : ''}
            </p>
            <p className="mt-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Interview credit: {item.creditRestoration}
              {item.serviceRecoveryGranted ? ' · Complimentary credit added' : ''}
            </p>
          </div>
        )
      })}
    </div>
  )
}
