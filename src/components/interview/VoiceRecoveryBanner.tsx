'use client'

import {
  IE_ALERT_BANNER_CLASS,
  IE_ALERT_ERROR_STYLE,
  IE_FOCUS_VISIBLE,
} from '@/lib/theme/component-classes'
import type { VoiceRecoveryPhase, SavedVoiceMode } from '@/lib/voice/voice-recovery'

interface VoiceRecoveryBannerProps {
  phase: VoiceRecoveryPhase
  savedMode: SavedVoiceMode
  error: string | null
  resuming: boolean
  onResumeVoice: () => void
  onContinueTyping: () => void
  onRetry?: () => void
}

export function VoiceRecoveryBanner({
  phase,
  savedMode,
  error,
  resuming,
  onResumeVoice,
  onContinueTyping,
  onRetry,
}: VoiceRecoveryBannerProps) {
  if (phase === 'idle') return null

  const modeLabel = savedMode === 'deepgram' ? 'AI Voice' : 'Voice'

  return (
    <div
      role="alertdialog"
      aria-labelledby="voice-recovery-title"
      aria-describedby="voice-recovery-body"
      className="dashboard-premium-card mb-3 w-full min-w-0 space-y-3 border-2 border-(--accent-primary)/25 bg-(--accent-primary)/5 p-4"
    >
      <h2 id="voice-recovery-title" className="text-sm font-semibold text-(--text-primary)">
        Resume Voice Interview
      </h2>
      <p id="voice-recovery-body" className="mt-1.5 text-xs leading-relaxed text-(--text-secondary)">
        Your interview was restored successfully. Voice access must be re-enabled after a page refresh.
        {savedMode === 'deepgram'
          ? ' Your previous answer text is preserved — tap Resume Voice to reconnect AI Voice.'
          : ' Your previous answer text is preserved — tap Resume Voice to turn the microphone back on.'}
      </p>

      {error ? (
        <p
          className={IE_ALERT_BANNER_CLASS}
          style={IE_ALERT_ERROR_STYLE}
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onResumeVoice}
          disabled={resuming}
          className={`min-h-[44px] flex-1 rounded-lg bg-(--accent-primary) px-4 py-2.5 text-sm font-semibold text-white hover:bg-(--accent-hover) disabled:opacity-60 ${IE_FOCUS_VISIBLE}`}
        >
          {resuming ? 'Reconnecting…' : `Resume ${modeLabel}`}
        </button>
        {phase === 'failed' && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={resuming}
            className={`min-h-[44px] rounded-lg border border-(--card-border) bg-(--bg-secondary) px-4 py-2.5 text-sm font-semibold text-(--text-secondary) hover:text-(--text-primary) disabled:opacity-60 ${IE_FOCUS_VISIBLE}`}
          >
            Retry
          </button>
        ) : null}
        <button
          type="button"
          onClick={onContinueTyping}
          disabled={resuming}
          className={`min-h-[44px] flex-1 rounded-lg border border-(--card-border) bg-(--bg-secondary) px-4 py-2.5 text-sm font-semibold text-(--text-secondary) hover:text-(--text-primary) disabled:opacity-60 ${IE_FOCUS_VISIBLE}`}
        >
          Continue with Typing
        </button>
      </div>
    </div>
  )
}
