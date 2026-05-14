'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard] Unhandled error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Something went wrong
      </p>
      <p className="mt-2 mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
        An unexpected error occurred. Your data is safe — please try again.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent-primary)' }}
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-xl border-2 px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
            color: 'var(--text-primary)',
          }}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
