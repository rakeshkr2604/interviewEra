'use client'

import { User } from 'lucide-react'
import { useCandidateCamera } from '@/hooks/useCandidateCamera'

interface CandidatePreviewProps {
  /** Request webcam while the candidate is answering. */
  cameraActive: boolean
  isListening: boolean
  micArmed: boolean
  userMicMuted: boolean
  questionLabel?: string
}

export function CandidatePreview({
  cameraActive,
  isListening,
  micArmed,
  userMicMuted,
  questionLabel,
}: CandidatePreviewProps) {
  const { videoRef, status } = useCandidateCamera({ active: cameraActive })
  const showLive = status === 'active'
  const liveMic = isListening && micArmed && !userMicMuted

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
        {questionLabel ? (
          <span className="shrink-0 text-[10px] font-semibold tabular-nums text-(--text-secondary) sm:text-xs">
            {questionLabel}
          </span>
        ) : null}
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-(--bg-secondary)">
        {showLive ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full -scale-x-100 object-cover object-[center_22%] lg:scale-x-100 lg:object-contain lg:object-center"
            aria-label="Your camera preview"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full border border-(--card-border) bg-(--card-bg) shadow-sm"
              aria-hidden
            >
              <User className="h-10 w-10 text-(--text-muted)" strokeWidth={1.5} />
            </div>
            <p className="max-w-[14rem] text-xs leading-relaxed text-(--text-muted)">
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
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--accent-success)" />
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
