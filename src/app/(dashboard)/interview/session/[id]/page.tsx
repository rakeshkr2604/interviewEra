import Link from 'next/link'
import { SCRIPT_INTERVIEW_START_PATH } from '@/lib/interview/default-interview-start-path'

/**
 * Legacy V1 dual-agent session UI retired.
 * Historical bookmarks land here; guide users to dashboard or script start.
 */
export default function LegacySessionRetiredPage() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold tracking-tight">
        This interview engine has been retired
      </h1>
      <p className="text-sm text-muted-foreground">
        The previous live session experience is no longer available. Start a new
        practice interview with the current engine, or return to your dashboard.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href={SCRIPT_INTERVIEW_START_PATH}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Start new interview
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border px-4 py-2 text-sm font-medium"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  )
}
