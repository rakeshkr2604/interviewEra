'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Copy, Check } from 'lucide-react'

export function AccountManagementPanel({
  displayName,
  email,
  joinedAt,
  accountId,
}: {
  displayName: string | null
  email: string
  joinedAt: string
  accountId: string
}) {
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<{ tone: 'ok' | 'err'; message: string } | null>(null)

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(accountId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setExportStatus({ tone: 'err', message: 'Could not copy to clipboard.' })
      window.setTimeout(() => setExportStatus(null), 3000)
    }
  }

  const downloadExport = async () => {
    setExporting(true)
    setExportStatus(null)
    try {
      const res = await fetch('/api/account/export')
      if (!res.ok) {
        setExportStatus({ tone: 'err', message: 'Export failed. Try again later.' })
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `interviewera-export-${accountId.slice(0, 8)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportStatus({ tone: 'ok', message: 'Download started.' })
      window.setTimeout(() => setExportStatus(null), 3000)
    } catch {
      setExportStatus({ tone: 'err', message: 'Network error during export.' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div
          className="rounded-xl border px-4 py-3"
          style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
        >
          <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Full name
          </dt>
          <dd className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {displayName?.trim() || '—'}
          </dd>
        </div>
        <div
          className="rounded-xl border px-4 py-3"
          style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
        >
          <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Email
          </dt>
          <dd className="mt-1 text-sm font-semibold break-all" style={{ color: 'var(--text-primary)' }}>
            {email}
          </dd>
        </div>
        <div
          className="rounded-xl border px-4 py-3 sm:col-span-2"
          style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
        >
          <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Joined
          </dt>
          <dd className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {new Date(joinedAt).toLocaleDateString('en-IN', {
              dateStyle: 'long',
              timeZone: 'Asia/Kolkata',
            })}
          </dd>
        </div>
        <div
          className="rounded-xl border px-4 py-3 sm:col-span-2"
          style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
        >
          <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Account ID
          </dt>
          <dd className="mt-2 flex flex-wrap items-center gap-2">
            <code
              className="block max-w-full truncate rounded-md border border-[var(--card-border)] bg-[var(--bg-primary)] px-2 py-1 text-xs sm:max-w-md"
              style={{ color: 'var(--text-primary)' }}
            >
              {accountId}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1"
              onClick={() => void copyId()}
              aria-label="Copy account ID"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={exporting} onClick={() => void downloadExport()}>
          {exporting ? 'Preparing…' : 'Export interview data'}
        </Button>
        <Link
          href="/history"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Download reports (PDF)
        </Link>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        Open any completed interview from history and use export to PDF where your plan allows. A full JSON export includes questions, answers, and scores.
      </p>
      {exportStatus ? (
        <p
          role="status"
          className={cn(
            'text-xs font-medium',
            exportStatus.tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
          )}
        >
          {exportStatus.message}
        </p>
      ) : null}
    </div>
  )
}
