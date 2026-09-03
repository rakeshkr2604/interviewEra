import Link from 'next/link'
import { Bot, ArrowLeft } from 'lucide-react'

export default function CoachAccessRestricted({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-4 text-center">
      <div
        className="mx-auto flex max-w-md flex-col items-center rounded-2xl border p-8 shadow-sm"
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
        }}
      >
        <div
          className="mb-4 flex size-14 items-center justify-center rounded-2xl border"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-primary) 25%, transparent)',
            background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          <Bot className="size-7" />
        </div>

        <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          AI Interview Coach (Private Preview)
        </h1>

        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {message ||
            'AI Interview Coach is currently in private preview. If you have been invited to test this feature, please verify you are signed in with your authorized email address.'}
        </p>

        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{
              borderColor: 'var(--card-border)',
              color: 'var(--text-primary)',
            }}
          >
            <ArrowLeft className="size-4" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
