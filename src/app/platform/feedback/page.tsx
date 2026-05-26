import { privatePageMetadata } from '@/lib/seo/metadata'
import { createServiceClient } from '@/lib/supabase/server'
import { RetryFeedbackButton } from '@/components/platform/RetryFeedbackButton'
import { CheckCircle2, AlertCircle, Clock, Mail } from 'lucide-react'

export const metadata = privatePageMetadata({
  title: 'Feedback Inbox',
  description: 'Review and manage user feedback submissions.',
  path: '/platform/feedback',
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackRow {
  id: string
  name: string | null
  email: string | null
  rating: number
  severity: string | null
  email_status: string
  email_attempts: number
  last_email_error: string | null
  created_at: string
  liked_text: string | null
  bugs_text: string | null
  confusion_text: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatIST(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function SeverityBadge({ severity }: { severity: string | null }) {
  const s = severity ?? 'low'
  const styles: Record<string, { bg: string; fg: string }> = {
    critical: { bg: '#fecaca', fg: '#7f1d1d' },
    high:     { bg: '#fee2e2', fg: '#b91c1c' },
    medium:   { bg: '#fef3c7', fg: '#b45309' },
    low:      { bg: '#dcfce7', fg: '#15803d' },
  }
  const { bg, fg } = styles[s] ?? styles.low
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: bg, color: fg }}
    >
      {s}
    </span>
  )
}

function EmailStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    sent:     { label: 'Sent',     color: '#16a34a' },
    failed:   { label: 'Failed',   color: '#dc2626' },
    pending:  { label: 'Pending',  color: '#d97706' },
    retrying: { label: 'Retrying', color: '#7c3aed' },
  }
  const { label, color } = map[status] ?? { label: status, color: 'var(--text-muted)' }
  return (
    <span className="text-xs font-semibold" style={{ color }}>
      {label}
    </span>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm" title={`${rating}/5`} aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(rating)}
      <span style={{ color: 'var(--card-border)' }}>{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatChip({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  valueColor?: string
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border p-4"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: 'color-mix(in srgb, var(--accent-primary) 12%, var(--bg-secondary))' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        <p
          className="text-xl font-bold tabular-nums leading-tight"
          style={{ color: valueColor ?? 'var(--text-primary)' }}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PlatformFeedbackPage() {
  const svc = createServiceClient()

  const { data: rows } = await svc
    .from('feedbacks')
    .select(
      'id, name, email, rating, severity, email_status, email_attempts, ' +
        'last_email_error, created_at, liked_text, bugs_text, confusion_text',
    )
    .order('created_at', { ascending: false })
    .limit(100)

  const feedbacks = (rows ?? []) as unknown as FeedbackRow[]

  const totalCount   = feedbacks.length
  const sentCount    = feedbacks.filter((r) => r.email_status === 'sent').length
  const failedCount  = feedbacks.filter((r) => r.email_status === 'failed').length
  const pendingCount = feedbacks.filter((r) => r.email_status === 'pending').length

  const failedRows   = feedbacks.filter((r) => r.email_status === 'failed')
  const otherRows    = feedbacks.filter((r) => r.email_status !== 'failed')

  // Failed rows first, then the rest newest-first (already sorted by created_at desc).
  const orderedRows  = [...failedRows, ...otherRows]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Feedback Inbox
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            All user submissions · most recent 100 shown
          </p>
        </div>
        <RetryFeedbackButton failedCount={failedCount} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip
          icon={<Mail className="size-4" style={{ color: 'var(--accent-primary)' }} />}
          label="Total"
          value={totalCount}
        />
        <StatChip
          icon={<CheckCircle2 className="size-4 text-emerald-500" />}
          label="Emails sent"
          value={sentCount}
          valueColor="#16a34a"
        />
        <StatChip
          icon={<AlertCircle className="size-4 text-red-500" />}
          label="Failed"
          value={failedCount}
          valueColor={failedCount > 0 ? '#dc2626' : undefined}
        />
        <StatChip
          icon={<Clock className="size-4 text-amber-500" />}
          label="Pending"
          value={pendingCount}
          valueColor={pendingCount > 0 ? '#d97706' : undefined}
        />
      </div>

      {/* Table */}
      {orderedRows.length === 0 ? (
        <div
          className="rounded-2xl border py-16 text-center text-sm"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
        >
          No feedback submissions yet.
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-2xl border"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
                >
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3 max-w-xs">Summary</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 whitespace-nowrap">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
                {orderedRows.map((row) => {
                  const summary =
                    [row.liked_text, row.bugs_text, row.confusion_text]
                      .find((t) => t?.trim())
                      ?.slice(0, 120) ?? '—'
                  const isFailed = row.email_status === 'failed'

                  return (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-[color:var(--bg-secondary)]"
                      style={{
                        borderColor: 'var(--card-border)',
                        background: isFailed
                          ? 'color-mix(in srgb, #dc2626 4%, var(--card-bg))'
                          : undefined,
                      }}
                    >
                      {/* User */}
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {row.name || '—'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {row.email}
                        </p>
                      </td>

                      {/* Rating */}
                      <td className="px-4 py-3">
                        <Stars rating={row.rating} />
                      </td>

                      {/* Severity */}
                      <td className="px-4 py-3">
                        <SeverityBadge severity={row.severity} />
                      </td>

                      {/* Summary */}
                      <td
                        className="max-w-xs px-4 py-3 text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <span className="line-clamp-2">{summary}</span>
                      </td>

                      {/* Email status */}
                      <td className="px-4 py-3">
                        <EmailStatusPill status={row.email_status} />
                        {isFailed && row.email_attempts > 0 && (
                          <p
                            className="mt-0.5 text-[10px]"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {row.email_attempts} attempt{row.email_attempts === 1 ? '' : 's'}
                          </p>
                        )}
                        {isFailed && row.last_email_error && (
                          <p
                            className="mt-0.5 max-w-[160px] truncate text-[10px]"
                            style={{ color: '#dc2626' }}
                            title={row.last_email_error}
                          >
                            {row.last_email_error}
                          </p>
                        )}
                      </td>

                      {/* Date */}
                      <td
                        className="whitespace-nowrap px-4 py-3 text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {formatIST(row.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
