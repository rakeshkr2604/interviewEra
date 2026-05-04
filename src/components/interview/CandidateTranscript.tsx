'use client'
import { Mic, MicOff } from 'lucide-react'

interface CandidateTranscriptProps {
  transcript: string
  interimTranscript: string
  isListening: boolean
  isSupported: boolean
  error: string | null
  permissionState: 'unknown' | 'granted' | 'prompt' | 'denied' | 'requesting'
  onToggle: () => void
  onRetry: () => void
}

export function CandidateTranscript({
  transcript,
  interimTranscript,
  isListening,
  isSupported,
  error,
  permissionState,
  onToggle,
  onRetry,
}: CandidateTranscriptProps) {
  return (
    <div className="w-full min-w-0 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-(--text-secondary)">
          Your Answer
        </span>
        <button
          onClick={onToggle}
          disabled={!isSupported || permissionState === 'requesting'}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs
                      font-semibold transition-colors duration-200
                      disabled:opacity-50
                      ${isListening
                        ? 'bg-(--accent-danger)/15 text-(--accent-danger)'
                        : 'bg-(--bg-tertiary) text-(--text-secondary)'
                      }`}
        >
          {isListening ? <Mic size={12} className="animate-pulse" /> : <MicOff size={12} />}
          {permissionState === 'requesting'
            ? 'Requesting permission...'
            : isListening
              ? 'Listening...'
              : permissionState === 'denied'
                ? 'Permission denied'
                : 'Click mic to enable'}
        </button>
      </div>
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>{error}</span>
          <button
            type="button"
            className="font-semibold underline"
            onClick={onRetry}
            disabled={!isSupported}
          >
            Retry
          </button>
        </div>
      )}
      <div
        className="min-h-[120px] max-h-[min(50vh,520px)] w-full max-w-full overflow-y-auto rounded-xl border border-(--card-border)
                      bg-(--card-bg) p-4 text-sm leading-relaxed whitespace-pre-wrap break-words text-(--text-primary)"
      >
        {transcript}
        {interimTranscript && (
          <span className="text-(--text-muted) italic"> {interimTranscript}</span>
        )}
        {!transcript && !interimTranscript && (
          <span className="text-(--text-muted)">
            {isListening
              ? 'Listening...'
              : isSupported
                ? 'Click mic to start speaking'
                : 'Speech recognition not supported'}
          </span>
        )}
      </div>
    </div>
  )
}
