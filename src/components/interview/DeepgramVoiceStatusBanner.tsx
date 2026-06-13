'use client'

import type { VoiceConnectionState } from '@/lib/voice/deepgram-health'

interface DeepgramVoiceStatusBannerProps {
  uiState: VoiceConnectionState
  message: string | null
  errorMessage: string | null
  onRetryVoice: () => void
  onSwitchToText: () => void
  showActions?: boolean
}

function statusLabel(state: VoiceConnectionState): string {
  switch (state) {
    case 'connecting':
      return 'Connecting…'
    case 'reconnecting':
      return 'Reconnecting…'
    case 'retrying':
      return 'Retrying…'
    case 'rate_limited':
      return 'Voice service busy'
    case 'unavailable':
      return 'Voice service unavailable'
    case 'circuit_open':
      return 'Voice paused'
    case 'connected':
      return 'Listening'
    default:
      return 'Voice'
  }
}

export function DeepgramVoiceStatusBanner({
  uiState,
  message,
  errorMessage,
  onRetryVoice,
  onSwitchToText,
  showActions = false,
}: DeepgramVoiceStatusBannerProps) {
  const visible =
    uiState !== 'idle' &&
    uiState !== 'connected' &&
    (message != null || errorMessage != null || showActions)

  if (!visible && !errorMessage) return null

  const tone =
    uiState === 'retrying' || uiState === 'reconnecting'
      ? 'border-amber-300/80 bg-amber-50/90 text-amber-950'
      : errorMessage || uiState === 'unavailable' || uiState === 'circuit_open'
        ? 'border-red-300/80 bg-red-50/90 text-red-900'
        : 'border-(--card-border) bg-(--bg-secondary) text-(--text-secondary)'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-lg border px-3 py-2 text-xs ${tone}`}
    >
      <p className="font-semibold">{statusLabel(uiState)}</p>
      {(message || errorMessage) && (
        <p className="mt-1 leading-relaxed">{errorMessage ?? message}</p>
      )}
      {showActions && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onRetryVoice}
            className="flex-1 rounded-lg bg-(--accent-primary) px-3 py-1.5 text-xs font-semibold text-white"
          >
            Retry Voice
          </button>
          <button
            type="button"
            onClick={onSwitchToText}
            className="flex-1 rounded-lg border border-(--card-border) bg-white px-3 py-1.5 text-xs font-semibold text-(--text-secondary)"
          >
            Switch to Type Mode
          </button>
        </div>
      )}
    </div>
  )
}
