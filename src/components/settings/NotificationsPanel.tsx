'use client'

import { useState } from 'react'
import { SettingsSwitch } from '@/components/settings/SettingsSwitch'
import { CommunityNotificationsStrip } from '@/components/community/CommunityNotificationsStrip'
import type { NotificationPreferences } from '@/lib/settings/notification-preferences'

type RowProps = {
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}

function NotifRow({ title, description, checked, disabled, onChange }: RowProps) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl border px-4 py-2.5 transition-colors hover:border-[var(--accent-primary)]/25"
      style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      </div>
      <SettingsSwitch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={title}
      />
    </div>
  )
}

export function NotificationsPanel({
  initialPrefs,
  weeklyImprovementSummaryInitiallyOn,
}: {
  initialPrefs: NotificationPreferences
  weeklyImprovementSummaryInitiallyOn: boolean
}) {
  const [prefs, setPrefs] = useState(initialPrefs)
  const [weekly, setWeekly] = useState(weeklyImprovementSummaryInitiallyOn)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [status, setStatus] = useState<{ tone: 'ok' | 'err'; message: string } | null>(null)

  const patch = async (body: Record<string, boolean>, rollback: () => void) => {
    setBusyKey(JSON.stringify(body))
    setStatus(null)
    try {
      const res = await fetch('/api/account/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as {
        notification_preferences?: NotificationPreferences
        weeklyImprovementSummary?: boolean
        error?: string
      }
      if (!res.ok) {
        rollback()
        setStatus({ tone: 'err', message: data.error ?? 'Could not save preferences.' })
        return
      }
      if (data.notification_preferences) setPrefs(data.notification_preferences)
      if (typeof data.weeklyImprovementSummary === 'boolean') {
        setWeekly(data.weeklyImprovementSummary)
      }
      setStatus({ tone: 'ok', message: 'Preferences saved.' })
      window.setTimeout(() => setStatus(null), 2200)
    } catch {
      rollback()
      setStatus({ tone: 'err', message: 'Network error. Try again.' })
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-2.5">
      <NotifRow
        title="Interview reminders"
        description="Nudges before scheduled or in-progress practice sessions (email when available)."
        checked={prefs.interviewReminders}
        disabled={busyKey !== null}
        onChange={(next) => {
          const prev = prefs.interviewReminders
          setPrefs((p) => ({ ...p, interviewReminders: next }))
          void patch({ interviewReminders: next }, () =>
            setPrefs((p) => ({ ...p, interviewReminders: prev })),
          )
        }}
      />
      <NotifRow
        title="Performance reports"
        description="Emails when a new score report is ready or weekly rollups of your progress."
        checked={prefs.performanceReports}
        disabled={busyKey !== null}
        onChange={(next) => {
          const prev = prefs.performanceReports
          setPrefs((p) => ({ ...p, performanceReports: next }))
          void patch({ performanceReports: next }, () =>
            setPrefs((p) => ({ ...p, performanceReports: prev })),
          )
        }}
      />
      <NotifRow
        title="Product updates"
        description="What's new in InterviewEra — features, fixes, and quality improvements."
        checked={prefs.productUpdates}
        disabled={busyKey !== null}
        onChange={(next) => {
          const prev = prefs.productUpdates
          setPrefs((p) => ({ ...p, productUpdates: next }))
          void patch({ productUpdates: next }, () => setPrefs((p) => ({ ...p, productUpdates: prev })))
        }}
      />
      <NotifRow
        title="Marketing emails"
        description="Occasional tips, offers, and partner content. Low volume."
        checked={prefs.marketingEmails}
        disabled={busyKey !== null}
        onChange={(next) => {
          const prev = prefs.marketingEmails
          setPrefs((p) => ({ ...p, marketingEmails: next }))
          void patch({ marketingEmails: next }, () => setPrefs((p) => ({ ...p, marketingEmails: prev })))
        }}
      />
      <NotifRow
        title="Weekly improvement summary"
        description="Digest of your practice stats and suggested focus areas."
        checked={weekly}
        disabled={busyKey !== null}
        onChange={(next) => {
          const prev = weekly
          setWeekly(next)
          void patch({ weeklyImprovementSummary: next }, () => setWeekly(prev))
        }}
      />

      <CommunityNotificationsStrip />

      {status ? (
        <p
          role="status"
          className={`text-xs font-medium ${status.tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
        >
          {status.message}
        </p>
      ) : null}
    </div>
  )
}
