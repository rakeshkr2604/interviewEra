'use client'

import { User, Video, VideoOff } from 'lucide-react'
import { useCandidateCamera } from '@/hooks/useCandidateCamera'
import { IE_FOCUS_VISIBLE } from '@/lib/theme/component-classes'

interface CandidatePreviewProps {
  /** Request webcam while the candidate is answering. */
  cameraActive: boolean
  /** True when voice input is confirmed live (transcript path or Deepgram WS open). */
  voiceLive: boolean
  micArmed: boolean
  userMicMuted: boolean
  questionLabel?: string
  /** Candidate-facing camera on/off toggle, rendered below the preview. Omit to hide the control. */
  cameraEnabled?: boolean
  onToggleCamera?: () => void
}

export function CandidatePreview({
  cameraActive,
  voiceLive,
  micArmed,
  userMicMuted,
  questionLabel,
  cameraEnabled,
  onToggleCamera,
}: CandidatePreviewProps) {
  const { videoRef, status } = useCandidateCamera({ active: cameraActive })
  const showLive = status === 'active'
  const liveMic = voiceLive && micArmed && !userMicMuted

  return (
    <div className="session-flush-panel dashboard-premium-card flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-(--card-border) px-2 py-2 sm:px-3 sm:py-2.5">
        <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-(--accent-primary)/25 bg-(--accent-primary)/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-(--accent-primary) sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-[0.16em]">
          <span
            className={`h-1.5 w-1.5 rounded-full bg-(--accent-primary) ${
              liveMic ? 'animate-pulse' : ''
            }`}
          />
          You
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {questionLabel ? (
            <span className="ie-timer-secondary shrink-0 tabular-nums sm:text-[11px]">
              {questionLabel}
            </span>
          ) : null}
          {onToggleCamera ? (
            <button
              type="button"
              onClick={onToggleCamera}
              title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
              aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
              className={`flex h-6 w-6 items-center justify-center rounded-lg border text-(--text-muted) transition-colors hover:text-(--text-primary) ${IE_FOCUS_VISIBLE}`}
              style={{ borderColor: 'var(--card-border)' }}
            >
              {cameraEnabled ? <VideoOff className="size-3" /> : <Video className="size-3" />}
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-(--bg-secondary)">
        {showLive ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full -scale-x-100 object-cover object-[center_28%] lg:scale-x-100"
            aria-label="Your camera preview"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-4 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full border border-(--card-border) bg-(--card-bg) shadow-sm sm:h-20 sm:w-20"
              aria-hidden
            >
              <User className="h-8 w-8 text-(--text-muted) sm:h-10 sm:w-10" strokeWidth={1.5} />
            </div>
            <p className="max-w-[16rem] text-xs leading-relaxed text-(--text-muted)">
              {status === 'starting'
                ? 'Starting camera…'
                : status === 'denied'
                  ? 'Camera blocked — enable in browser settings to see yourself'
                  : status === 'unavailable'
                    ? 'Camera not available in this browser'
                    : cameraActive
                      ? 'Your preview appears here while you answer'
                      : 'Your turn starts after the interviewer finishes'}
            </p>
          </div>
        )}

        {liveMic && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
            <span className="ie-status-pulse h-1.5 w-1.5 rounded-full bg-(--accent-success) animate-pulse" />
            <span className="text-xs font-medium text-white">Listening</span>
          </div>
        )}
      </div>

      <p className="hidden shrink-0 border-t border-(--card-border)/60 px-4 py-2 text-[11px] text-(--text-secondary) lg:block">
        Candidate: You
      </p>
    </div>
  )
}
