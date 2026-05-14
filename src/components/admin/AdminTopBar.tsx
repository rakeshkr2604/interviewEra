'use client'

import Link from 'next/link'
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

export function AdminTopBar() {
  return (
    <header
      className="flex flex-col gap-4 border-b px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6"
      style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <span className="inline-flex shrink-0 items-baseline gap-1.5">
          <BrandWordmarkSplit />
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Campus
          </span>
        </span>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link
            href="/college/dashboard"
            className="transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            Dashboard
          </Link>
          <Link
            href="/college/dashboard/students"
            className="transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            Students
          </Link>
          <Link
            href="/college/dashboard/students"
            className="transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            Invite Students
          </Link>
          <Link
            href="/college/dashboard/deadlines"
            className="transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            Deadlines
          </Link>
          <Link
            href="/college/dashboard/analytics"
            className="transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            Analytics
          </Link>
          <Link
            href="/college/dashboard/settings"
            className="transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            Settings
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
