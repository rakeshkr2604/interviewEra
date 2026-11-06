'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProfilePhotoEditor } from '@/components/settings/ProfilePhotoEditor'
import { resolveOAuthPictureUrl } from '@/lib/profile/user-display'
import { formatPhoneDisplay } from '@/lib/utils/phone-format'
import { cn } from '@/lib/utils'
import { Copy, Check } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export function AccountManagementPanel({
  authUser,
  displayName,
  email,
  phone,
  joinedAt,
  accountId,
  initialAvatarPath,
}: {
  authUser: User
  displayName: string | null
  email: string
  phone: string | null
  joinedAt: string
  accountId: string
  initialAvatarPath: string | null
}) {
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<{ tone: 'ok' | 'err'; message: string } | null>(null)
  const [nameDraft, setNameDraft] = useState(displayName ?? '')
  const [savedName, setSavedName] = useState(displayName ?? '')
  const [savingName, setSavingName] = useState(false)
  const [nameStatus, setNameStatus] = useState<{ tone: 'ok' | 'err'; message: string } | null>(null)
  const [phoneDraft, setPhoneDraft] = useState(formatPhoneDisplay(phone ?? ''))
  const [savedPhone, setSavedPhone] = useState(formatPhoneDisplay(phone ?? ''))
  const [savingPhone, setSavingPhone] = useState(false)
  const [phoneStatus, setPhoneStatus] = useState<{ tone: 'ok' | 'err'; message: string } | null>(null)
  const [avatarPath, setAvatarPath] = useState(initialAvatarPath)

  const oauthPictureUrl = resolveOAuthPictureUrl(authUser.user_metadata)

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

  const saveName = async () => {
    setSavingName(true)
    setNameStatus(null)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameDraft.trim() }),
      })
      const data = (await res.json().catch(() => null)) as { error?: string; name?: string } | null
      if (!res.ok) {
        setNameStatus({ tone: 'err', message: data?.error ?? 'Could not update name.' })
        return
      }
      const next = data?.name ?? nameDraft.trim()
      setSavedName(next)
      setNameDraft(next)
      setNameStatus({ tone: 'ok', message: 'Name updated.' })
      window.setTimeout(() => setNameStatus(null), 3000)
    } catch {
      setNameStatus({ tone: 'err', message: 'Network error. Try again.' })
    } finally {
      setSavingName(false)
    }
  }

  const savePhone = async () => {
    setSavingPhone(true)
    setPhoneStatus(null)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneDraft.trim() }),
      })
      const data = (await res.json().catch(() => null)) as { error?: string; phoneNumber?: string } | null
      if (!res.ok) {
        setPhoneStatus({ tone: 'err', message: data?.error ?? 'Could not update phone number.' })
        return
      }
      const next = data?.phoneNumber ?? phoneDraft.trim()
      setSavedPhone(next)
      setPhoneDraft(next)
      setPhoneStatus({ tone: 'ok', message: 'Phone number updated.' })
      window.setTimeout(() => setPhoneStatus(null), 3000)
    } catch {
      setPhoneStatus({ tone: 'err', message: 'Network error. Try again.' })
    } finally {
      setSavingPhone(false)
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

  const nameDirty = nameDraft.trim() !== savedName.trim()
  const phoneDirty = phoneDraft.trim() !== savedPhone.trim()
  const phoneDigitCount = phoneDraft.replace(/[^0-9]/g, '').length

  return (
    <div className="space-y-6">
      <ProfilePhotoEditor
        name={savedName || displayName}
        email={email}
        initialAvatarPath={avatarPath}
        oauthPictureUrl={oauthPictureUrl}
        onAvatarPathChange={setAvatarPath}
      />

      <div
        className="h-px w-full"
        style={{ background: 'var(--card-border)' }}
        aria-hidden
      />

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Display name
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Used in greetings, reports, and your interview sessions.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <Input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            maxLength={50}
            autoComplete="name"
            placeholder="Your name"
            className="sm:max-w-xs"
          />
          <Button
            type="button"
            size="sm"
            disabled={!nameDirty || savingName || nameDraft.trim().length < 2}
            onClick={() => void saveName()}
          >
            {savingName ? 'Saving…' : 'Save name'}
          </Button>
        </div>
        {nameStatus ? (
          <p
            role="status"
            className={cn(
              'text-xs font-medium',
              nameStatus.tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
            )}
          >
            {nameStatus.message}
          </p>
        ) : null}
      </div>

      <div
        className="h-px w-full"
        style={{ background: 'var(--card-border)' }}
        aria-hidden
      />

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Phone number{' '}
            <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
              (optional)
            </span>
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Used to reach you about your interview preparation — never shared publicly.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <Input
            type="tel"
            value={phoneDraft}
            onChange={(e) => setPhoneDraft(e.target.value)}
            onBlur={(e) => setPhoneDraft(formatPhoneDisplay(e.target.value))}
            maxLength={20}
            autoComplete="tel"
            placeholder="Not added yet"
            className="sm:max-w-xs"
          />
          <Button
            type="button"
            size="sm"
            disabled={!phoneDirty || savingPhone || phoneDigitCount < 7}
            onClick={() => void savePhone()}
          >
            {savingPhone ? 'Saving…' : 'Save phone'}
          </Button>
        </div>
        {phoneStatus ? (
          <p
            role="status"
            className={cn(
              'text-xs font-medium',
              phoneStatus.tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
            )}
          >
            {phoneStatus.message}
          </p>
        ) : null}
      </div>

      <div
        className="h-px w-full"
        style={{ background: 'var(--card-border)' }}
        aria-hidden
      />

      <dl className="grid gap-3 sm:grid-cols-2">
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
          className="rounded-xl border px-4 py-3"
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
