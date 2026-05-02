'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[marketing] Unhandled error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Something went wrong
      </p>
      <p className="mt-2 mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
        We hit an unexpected error loading this page.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'var(--accent-primary)' }}
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border-2 px-5 py-2.5 text-sm font-semibold"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
