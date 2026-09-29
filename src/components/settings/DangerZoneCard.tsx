'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DestructiveConfirmDialog } from '@/components/settings/DestructiveConfirmDialog'
import { cn } from '@/lib/utils'

export function DangerZoneCard() {
  const router = useRouter()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [historyPhrase, setHistoryPhrase] = useState('')
  const [accountPhrase, setAccountPhrase] = useState('')
  const [busy, setBusy] = useState<'history' | 'account' | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [accountError, setAccountError] = useState<string | null>(null)

  const openHistory = () => {
    setHistoryOpen(true)
    setHistoryError(null)
    setHistoryPhrase('')
  }

  const openAccount = () => {
    setAccountOpen(true)
    setAccountError(null)
    setAccountPhrase('')
  }

  const deleteHistory = async () => {
    setBusy('history')
    setHistoryError(null)
    try {
      const res = await fetch('/api/account/delete-interview-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE MY HISTORY' }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setHistoryError(data.error ?? 'Could not delete history.')
        return
      }
      setHistoryOpen(false)
      setHistoryPhrase('')
      router.refresh()
    } catch {
      setHistoryError('Network error. Try again.')
    } finally {
      setBusy(null)
    }
  }

  const deleteAccount = async () => {
    setBusy('account')
    setAccountError(null)
    try {
      const res = await fetch('/api/account/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setAccountError(data.error ?? 'Could not delete account.')
        return
      }
      setAccountOpen(false)
      router.replace('/login')
    } catch {
      setAccountError('Network error. Try again.')
      setBusy(null)
    }
  }

  return (
    <>
      <div
        className={cn(
          'dashboard-premium-card relative overflow-hidden px-5 py-5 sm:px-6 sm:py-5',
          'border-destructive/30',
        )}
        style={{
          background: 'color-mix(in srgb, var(--destructive) 5%, var(--card-bg))',
          boxShadow:
            'var(--card-shadow), inset 0 1px 0 0 color-mix(in srgb, var(--destructive) 18%, transparent)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-destructive/5 via-destructive/70 to-destructive/5"
          aria-hidden
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 border-destructive/20 bg-background/90 text-destructive shadow-sm"
            aria-hidden
          >
            <AlertTriangle className="size-6" strokeWidth={1.75} />
          </span>

          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-destructive sm:text-[11px]">
                Danger zone
              </p>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Irreversible actions
              </h2>
              <p
                className="mt-1.5 max-w-prose text-sm leading-relaxed sm:text-[15px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                Deleting data here cannot be undone. We remove personal data from active systems within a reasonable
                period; limited billing records may be retained where the law requires (for example GST rules in India).
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
              <div
                className="flex flex-1 flex-col gap-2 rounded-2xl border-2 p-3.5 sm:min-w-[240px] sm:max-w-sm"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
                }}
              >
                <p className="text-sm font-semibold text-foreground">Interview history only</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Removes interviews, answers, and reports. Keeps your login, plan, and uploaded resume metadata as
                  configured.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="mt-1 w-full border-destructive/35 text-destructive hover:bg-destructive/10 sm:w-auto"
                  onClick={openHistory}
                >
                  Delete all interview history
                </Button>
              </div>

              <div
                className="flex flex-1 flex-col gap-2 rounded-2xl border-2 p-3.5 sm:min-w-[240px] sm:max-w-sm"
                style={{
                  borderColor: 'color-mix(in srgb, var(--destructive) 22%, var(--card-border))',
                  background: 'color-mix(in srgb, var(--destructive) 6%, var(--card-bg))',
                }}
              >
                <p className="text-sm font-semibold text-foreground">Full account</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Permanently closes your profile and access. Export data first if you need a backup.
                </p>
                <Button
                  type="button"
                  size="default"
                  className="mt-1 w-full bg-destructive font-semibold text-white shadow-md hover:bg-destructive/90 hover:text-white sm:w-auto"
                  onClick={openAccount}
                >
                  Delete account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DestructiveConfirmDialog
        open={historyOpen}
        onOpenChange={(open) => {
          setHistoryOpen(open)
          if (!open) {
            setHistoryError(null)
            setHistoryPhrase('')
          }
        }}
        title="Delete all interview history?"
        description="All interviews, answers, evaluations, and reports linked to your account will be permanently removed. Your login and current plan are not changed."
        phraseExact="DELETE MY HISTORY"
        phraseLabel="Required phrase"
        confirmLabel="Delete history"
        busyLabel="Deleting…"
        inputValue={historyPhrase}
        onInputChange={setHistoryPhrase}
        inputAriaLabel="delete-history-confirmation"
        error={historyError}
        busy={busy === 'history'}
        onConfirm={() => void deleteHistory()}
      />

      <DestructiveConfirmDialog
        open={accountOpen}
        onOpenChange={(open) => {
          setAccountOpen(open)
          if (!open) {
            setAccountError(null)
            setAccountPhrase('')
          }
        }}
        title="Delete your account?"
        description="This removes your profile, resumes, interviews, and access. If you use a paid plan, contact support after deletion if you need a final invoice or tax document."
        phraseExact="DELETE MY ACCOUNT"
        phraseLabel="Required phrase"
        confirmLabel="Delete my account"
        busyLabel="Deleting…"
        inputValue={accountPhrase}
        onInputChange={setAccountPhrase}
        inputAriaLabel="delete-account-confirmation"
        error={accountError}
        busy={busy === 'account'}
        onConfirm={() => void deleteAccount()}
      />
    </>
  )
}
