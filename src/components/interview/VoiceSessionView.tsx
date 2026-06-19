'use client'

/**
 * Thin, voice-first interview view over the VoiceSessionOrchestrator
 * (via useVoiceSession). It renders state — it does NOT own audio/STT/TTS or
 * any conversation logic; the orchestrator is the single authority.
 *
 * NOT wired into a live route yet — mount it from a flagged/parallel page to
 * smoke-test before the legacy session page is retired.
 */
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, Loader2, AlertTriangle, Play } from 'lucide-react'
import { TimerCircle } from '@/components/interview/TimerCircle'
import { useVoiceSession } from '@/hooks/useVoiceSession'
import { readAnswerStyle } from '@/lib/settings/client-preferences'
import type { StaticQuestion } from '@/lib/voice/conversation/http-conversation-engine'
import type { TTSOptions } from '@/lib/voice/tts-client'

export interface VoiceSessionViewProps {
  interviewId: string
  role: string
  difficulty: string
  interviewerId: string | null
  interviewerName: string
  voice: TTSOptions['voice']
  tone: TTSOptions['tone']
  questions: StaticQuestion[]
  /** Avatar loop video (e.g. /avatars/female/female-ai.mp4). */
  videoSrc: string
  answerTimeoutMs?: number
}

const DEFAULT_ANSWER_MS = 60_000

export function VoiceSessionView(props: VoiceSessionViewProps) {
  const router = useRouter()
  const totalSeconds = Math.round((props.answerTimeoutMs ?? DEFAULT_ANSWER_MS) / 1000)

  const { view, start, submit, recover } = useVoiceSession({
    interviewId: props.interviewId,
    interviewerId: props.interviewerId,
    role: props.role,
    difficulty: props.difficulty,
    questions: props.questions,
    voice: props.voice,
    tone: props.tone,
    answerTimeoutMs: props.answerTimeoutMs,
    getAnswerStyle: () => readAnswerStyle(),
  })

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const isSpeaking = view.state === 'interviewer_speaking'
  const isListening = view.state === 'listening'
  const isProcessing = view.state === 'processing_answer' || view.state === 'generating_response'

  // Cosmetic countdown mirroring the orchestrator's authoritative answer timer.
  // setState happens only inside callbacks (rAF/interval), never in the effect
  // body; when not listening the display is derived at render time.
  const [remaining, setRemaining] = useState(totalSeconds)
  useEffect(() => {
    if (!isListening) return
    const deadline = Date.now() + totalSeconds * 1000
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    const raf = requestAnimationFrame(tick)
    const id = setInterval(tick, 250)
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(id)
    }
  }, [isListening, view.questionIndex, view.isFollowUp, totalSeconds])
  const timeLeft = isListening ? remaining : totalSeconds

  // Keep the avatar loop running while speaking.
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (isSpeaking) void el.play().catch(() => {})
    else el.pause()
  }, [isSpeaking])

  // Redirect to the report once complete.
  useEffect(() => {
    if (view.state === 'completed' && view.reportId) {
      router.push(`/report/${view.reportId}`)
    }
  }, [view.state, view.reportId, router])

  const liveTranscript = [view.transcript, view.interimTranscript].filter(Boolean).join(' ').trim()

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col gap-6 px-4 py-8 text-[var(--text-primary)]">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{props.role}</p>
          <h1 className="text-lg font-semibold">{props.interviewerName}</h1>
        </div>
        {view.ttsDegraded && (
          <span className="rounded-full bg-[var(--accent-warning)]/15 px-3 py-1 text-xs text-[var(--accent-warning)]">
            Voice degraded — using fallback audio
          </span>
        )}
      </header>

      <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-secondary)] aspect-video">
        <video
          ref={videoRef}
          src={props.videoSrc}
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <p className="text-sm font-medium text-white">
            {isSpeaking ? 'Interviewer is speaking…' : isListening ? 'Listening…' : ' '}
          </p>
          {(isSpeaking || isListening) && view.questionText && (
            <p className="mt-1 text-white/90">{view.questionText}</p>
          )}
        </div>
      </div>

      {!view.started && (
        <button
          type="button"
          onClick={start}
          className="mx-auto flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-6 py-3 font-semibold text-white"
        >
          <Play size={18} /> Start interview
        </button>
      )}

      {view.state === 'error' && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--accent-danger)]/40 bg-[var(--accent-danger)]/10 p-4 text-center">
          <AlertTriangle className="text-[var(--accent-danger)]" />
          <p className="text-sm">{view.error ?? 'Something went wrong.'}</p>
          <button
            type="button"
            onClick={recover}
            className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Retry question
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)]">
          <Loader2 className="animate-spin" size={18} /> Evaluating your answer…
        </div>
      )}

      {isListening && (
        <div className="flex flex-col items-center gap-4">
          <TimerCircle timeLeft={timeLeft} totalTime={totalSeconds} />
          <div className="min-h-[64px] w-full rounded-xl bg-[var(--bg-secondary)] p-4 text-sm">
            {liveTranscript || (
              <span className="text-[var(--text-secondary)]">Start speaking your answer…</span>
            )}
          </div>
          <button
            type="button"
            onClick={submit}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-6 py-3 font-semibold text-white"
          >
            <Mic size={18} /> Submit answer
          </button>
        </div>
      )}

      {view.state === 'completed' && (
        <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)]">
          <Loader2 className="animate-spin" size={18} /> Finishing up…
        </div>
      )}
    </div>
  )
}
