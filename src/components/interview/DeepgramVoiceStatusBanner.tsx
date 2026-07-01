'use client'

import type { CSSProperties } from 'react'
import {
  IE_ALERT_BANNER_CLASS,
  IE_ALERT_ERROR_STYLE,
  IE_ALERT_WARNING_STYLE,
} from '@/lib/theme/component-classes'
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

  const toneStyle: CSSProperties =
    uiState === 'retrying' || uiState === 'reconnecting'
      ? IE_ALERT_WARNING_STYLE
      : errorMessage || uiState === 'unavailable' || uiState === 'circuit_open'
        ? IE_ALERT_ERROR_STYLE
        : {
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--bg-secondary) 90%, transparent)',
            color: 'var(--text-secondary)',
          }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${IE_ALERT_BANNER_CLASS} text-xs`}
      style={toneStyle}
    >
      <p className="font-semibold">{statusLabel(uiState)}</p>
      {(message || errorMessage) && (
        <p className="mt-1 leading-relaxed">{errorMessage ?? message}</p>
      )}
      {showActions && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onRetryVoice}
            className="min-h-[44px] flex-1 rounded-lg bg-(--accent-primary) px-3 py-2 text-xs font-semibold text-white"
          >
            Retry Voice
          </button>
          <button
            type="button"
            onClick={onSwitchToText}
            className="min-h-[44px] flex-1 rounded-lg border border-(--card-border) bg-white px-3 py-2 text-xs font-semibold text-(--text-secondary)"
          >
            Switch to Type Mode
          </button>
        </div>
      )}
    </div>
  )
}
