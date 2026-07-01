'use client'

import {
  IE_ALERT_WARNING_STYLE,
  IE_FOCUS_VISIBLE,
} from '@/lib/theme/component-classes'

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
      aria-describedby="startup-timeout-body"
      className="dashboard-premium-card mx-auto mt-4 max-w-md space-y-3 border-2 p-4 text-left"
      style={IE_ALERT_WARNING_STYLE}
    >
      <h2 id="startup-timeout-title" className="text-sm font-semibold">
        We could not start your interview
      </h2>
      <p id="startup-timeout-body" className="text-xs leading-relaxed opacity-90">
        {elapsedSeconds != null
          ? `Startup did not complete within ${elapsedSeconds}s. `
          : ''}
        Retry, reconnect to question generation, or continue by typing your answers.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onRetry}
          className={`min-h-[44px] flex-1 rounded-lg bg-(--accent-primary) px-3 py-2 text-xs font-semibold text-white hover:bg-(--accent-hover) ${IE_FOCUS_VISIBLE}`}
        >
          Retry
        </button>
        <button
          type="button"
          onClick={onReconnect}
          className={`min-h-[44px] flex-1 rounded-lg border border-(--card-border) bg-white px-3 py-2 text-xs font-semibold text-(--text-primary) ${IE_FOCUS_VISIBLE}`}
        >
          Reconnect
        </button>
        <button
          type="button"
          onClick={onSwitchToTyping}
          className={`min-h-[44px] flex-1 rounded-lg border border-(--card-border) bg-white px-3 py-2 text-xs font-semibold text-(--text-secondary) ${IE_FOCUS_VISIBLE}`}
        >
          Switch to Typing
        </button>
      </div>
    </div>
  )
}
