'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RetryResultRow } from '@/app/api/admin/feedback-retry/route'

interface RetryResult {
  retried: number
  sent: number
  failed: number
  rows: RetryResultRow[]
}

export function RetryFeedbackButton({ failedCount }: { failedCount: number }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RetryResult | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function handleRetry() {
    setLoading(true)
    setResult(null)
    setErr(null)

    try {
      const res = await fetch('/api/admin/feedback-retry', { method: 'POST' })
      const data = (await res.json()) as RetryResult & { error?: string }
      if (!res.ok) {
        setErr(data.error ?? 'Something went wrong.')
      } else {
        setResult(data)
      }
    } catch {
      setErr('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const disabled = loading || failedCount === 0

  return (
    <div className="space-y-3">
      <button
        onClick={handleRetry}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-sm font-semibold text-white transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        style={{
          background: disabled
            ? 'var(--text-muted)'
            : 'linear-gradient(135deg, var(--accent-primary), #7c3aed)',
          boxShadow: disabled
            ? 'none'
            : '0 4px 14px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
        }}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="size-4" aria-hidden />
        )}
        {loading ? 'Retrying…' : failedCount === 0 ? 'No failed emails' : `Retry ${failedCount} failed email${failedCount === 1 ? '' : 's'}`}
      </button>

      {err && (
        <p className="flex items-center gap-1.5 text-sm" style={{ color: '#ef4444' }}>
          <XCircle className="size-4 shrink-0" aria-hidden />
          {err}
        </p>
      )}

      {result && (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{
            borderColor: result.failed === 0 ? '#bbf7d0' : '#fde68a',
            background: result.failed === 0
              ? 'color-mix(in srgb, #16a34a 8%, var(--card-bg))'
              : 'color-mix(in srgb, #d97706 8%, var(--card-bg))',
          }}
        >
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {result.retried === 0
              ? 'No failed emails to retry.'
              : `Retried ${result.retried} email${result.retried === 1 ? '' : 's'} — ${result.sent} sent, ${result.failed} still failed.`}
          </p>

          {result.rows.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {result.rows.map((row) => (
                <li key={row.id} className="flex items-center gap-2">
                  {row.ok ? (
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" aria-hidden />
                  ) : (
                    <XCircle className="size-3.5 shrink-0" style={{ color: '#ef4444' }} aria-hidden />
                  )}
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {row.name || row.email}
                    </span>
                    {row.name && (
                      <span className="ml-1 text-xs">({row.email})</span>
                    )}
                    {!row.ok && (
                      <span className="ml-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        — {row.attempts_before + 1} attempt{row.attempts_before + 1 === 1 ? '' : 's'} total
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
