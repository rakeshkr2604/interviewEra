'use client'

interface InterviewStartupRecoveryPanelProps {
  onRetry: () => void
  onReconnect: () => void
  onSwitchToTyping: () => void
  /** Shown when recovery was triggered by a slow-path watchdog (optional). */
  elapsedSeconds?: number
}

export function InterviewStartupRecoveryPanel({
  onRetry,
  onReconnect,
  onSwitchToTyping,
  elapsedSeconds,
}: InterviewStartupRecoveryPanelProps) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="startup-timeout-title"
      className="dashboard-premium-card mx-auto mt-4 max-w-md space-y-3 border border-amber-300/80 bg-amber-50/90 p-4 text-left"
    >
      <h2 id="startup-timeout-title" className="text-sm font-semibold text-amber-950">
        We could not start your interview
      </h2>
      <p className="text-xs leading-relaxed text-amber-900/90">
        {elapsedSeconds != null
          ? `Startup did not complete within ${elapsedSeconds}s. `
          : ''}
        Retry, reconnect to question generation, or continue by typing your answers.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onRetry}
          className="flex-1 rounded-lg bg-(--accent-primary) px-3 py-2 text-xs font-semibold text-white hover:bg-(--accent-hover)"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={onReconnect}
          className="flex-1 rounded-lg border border-(--card-border) bg-white px-3 py-2 text-xs font-semibold text-(--text-primary)"
        >
          Reconnect
        </button>
        <button
          type="button"
          onClick={onSwitchToTyping}
          className="flex-1 rounded-lg border border-(--card-border) bg-white px-3 py-2 text-xs font-semibold text-(--text-secondary)"
        >
          Switch to Typing
        </button>
      </div>
    </div>
  )
}
