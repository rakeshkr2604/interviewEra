'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

export function AdminTopBar() {
  return (
    <header
      className="flex flex-col gap-4 border-b px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6"
      style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <span className="shrink-0 font-semibold" style={{ color: 'var(--text-primary)' }}>
          InterviewEra Campus
        </span>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link
            href="/admin/dashboard"
            className="transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            Dashboard
          </Link>
          <Link
            href="/admin/bulk-invite"
            className="transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            Invite Students
          </Link>
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <ThemeToggle />
        <Link
          href="/dashboard"
          className="text-sm transition-opacity hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          Student view
        </Link>
      </div>
    </header>
  )
}
