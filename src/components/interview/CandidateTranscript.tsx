'use client'
import { useEffect, useRef } from 'react'
import { Mic, MicOff } from 'lucide-react'
import type { SpeechRecognitionState } from '@/hooks/useSpeechRecognition'
// Route-scoped: waveform / thinking-bar styles load only with the interview session.
import './interview-effects.css'

interface CandidateTranscriptProps {
  transcript: string
  interimTranscript: string
  /**
   * Backwards-compat "any non-idle" flag. Used for control-flow / button
   * style only. The "Listening…" label and the audio bars are gated on
   * `recognitionState === 'active'` instead — see SpeechRecognitionState.
   */
  isListening: boolean
  /**
   * Tri-state lifecycle from useSpeechRecognition.
   *  - 'idle'     → no session running
   *  - 'starting' → onstart fired but no transcript event yet (show "Starting mic…")
   *  - 'active'   → at least one transcript event observed (show "Listening…")
   *
   * Optional for back-compat with any caller that hasn't been threaded
   * through yet — when undefined we fall back to `isListening`.
   */
  recognitionState?: SpeechRecognitionState
  isSupported: boolean
  error: string | null
  permissionState: 'unknown' | 'granted' | 'prompt' | 'denied' | 'requesting'
  onToggle: () => void
  onRetry: () => void
}

// Heights for 8 bars — vary heights so it looks like a real waveform, not a comb
const WAVEFORM_HEIGHTS = [0.45, 0.75, 0.55, 1, 0.65, 0.4, 0.85, 0.55]

export function CandidateTranscript({
  transcript,
  interimTranscript,
  isListening,
  recognitionState,
  isSupported,
  error,
  permissionState,
  onToggle,
  onRetry,
}: CandidateTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Sticky auto-scroll: keep the newest words visible as speech streams in
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [transcript, interimTranscript])

  const hasContent = Boolean(transcript || interimTranscript)
  // "Active" = transcript pipeline verified (first event received).
  // When the caller does not pass `recognitionState` we fall back to the
  // legacy boolean so this component keeps working in pre-tri-state callers.
  const active     = recognitionState ? recognitionState === 'active' : isListening
  const starting   = recognitionState === 'starting'
  const showBars   = active && !hasContent

  return (
    <div className="w-full min-w-0 space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-(--text-secondary)">Your Answer</span>
          {/* Live audio bars — only shown while mic is active + silent */}
          {showBars && (
            <div className="flex items-end gap-[2px]" style={{ height: 14 }}>
              {WAVEFORM_HEIGHTS.map((h, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-(--accent-primary)/70 ie-audio-bar"
                  style={{ height: `${h * 100}%`, animationDelay: `${i * 95}ms` }}
                />
              ))}
            </div>
          )}
        </div>

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
            ? 'Requesting permission…'
            : active
              ? 'Listening…'
              : starting
                ? 'Starting mic…'
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
        ref={scrollRef}
        className="min-h-[120px] max-h-[min(50vh,520px)] w-full max-w-full overflow-y-auto rounded-xl
                   border border-(--card-border) bg-(--card-bg) p-4 text-sm leading-relaxed
                   whitespace-pre-wrap break-words text-(--text-primary)"
      >
        {hasContent ? (
          <>
            {transcript}
            {interimTranscript && (
              <span className="text-(--accent-primary)/60 italic">
                {' '}{interimTranscript}
                {/* blinking cursor marks live dictation edge */}
                <span
                  className="ml-0.5 inline-block h-[1em] w-px align-middle
                             bg-(--accent-primary)/80 animate-pulse"
                />
              </span>
            )}
          </>
        ) : (
          <span className="text-(--text-muted)">
            {active
              ? 'Start speaking — your words will appear here'
              : starting
                ? 'Connecting microphone…'
                : isSupported
                  ? 'Click the mic button to start speaking'
                  : 'Speech recognition not supported in this browser'}
          </span>
        )}
      </div>
    </div>
  )
}
