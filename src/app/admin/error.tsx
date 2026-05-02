'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin] Unhandled error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Admin error
      </p>
      <p className="mt-2 mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {error.message || 'An unexpected error occurred in the admin panel.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'var(--accent-primary)' }}
        >
          Retry
        </button>
        <Link
          href="/admin/dashboard"
          className="rounded-xl border-2 px-5 py-2.5 text-sm font-semibold"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
        >
          Back to admin
        </Link>
      </div>
    </div>
  )
}
