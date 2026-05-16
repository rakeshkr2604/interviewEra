'use client';

import { useEffect } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center"
      style={{ color: 'var(--text-primary)' }}
    >
      <p
        className="mb-2 text-xs font-semibold uppercase tracking-[0.12em]"
        style={{ color: 'var(--accent-danger)' }}
      >
        Something went wrong
      </p>
      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {error.message || 'An unexpected error occurred'}
      </h2>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        This error has been logged. You can try again or refresh the page.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
        style={{ background: 'var(--accent-primary)' }}
      >
        Try again
      </button>
    </div>
  );
}
