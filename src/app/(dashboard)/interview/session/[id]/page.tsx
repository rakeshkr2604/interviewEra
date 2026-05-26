'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { AvatarPlayer } from '@/components/avatar/AvatarPlayer'
import { CaptionDisplay } from '@/components/avatar/CaptionDisplay'
import { CandidateTranscript } from '@/components/interview/CandidateTranscript'
import { TimerCircle } from '@/components/interview/TimerCircle'
import { FillerWordBadge } from '@/components/interview/FillerWordBadge'
import { useAvatarSync } from '@/hooks/useAvatarSync'
import { useTimer } from '@/hooks/useTimer'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useMicrophone } from '@/hooks/useMicrophone'
import { useVoicePlayer } from '@/hooks/useVoicePlayer'
import { useAutoGrowTextarea } from '@/hooks/useAutoGrowTextarea'
import { analyzeFillerWords } from '@/hooks/useFillerDetection'
import type { FillerAnalysis } from '@/hooks/useFillerDetection'
import type { InterviewQuestion, AnswerRecord } from '@/types/interview.types'
import { StreamingSTT } from '@/lib/voice/stt-client'
import { fetchSTTToken } from '@/lib/voice/stt-token'
import type { VoiceMetadata } from '@/lib/interview/interview-orchestrator'
import type { InterviewerTone } from '@/lib/voice/tts-client'
import { api } from '@/services/api'
import { Mic, MicOff, SkipForward, RotateCcw, Send, X, Radio } from 'lucide-react'
import { getInterviewerById } from '@/lib/config/interviewers'
import type { InterviewerId } from '@/lib/config/interviewers'
import { readAnswerStyle } from '@/lib/settings/client-preferences'
import {
  TierUnlockCelebrationDialog,
  type TierCelebrationPayload,
} from '@/components/retention/TierUnlockCelebrationDialog'
import type { InterviewCompleteRetentionPayload } from '@/lib/retention/interview-complete-retention'
import { storeSessionContext, patchSessionContext } from '@/lib/feedback/collect-context'

const TIME_PER_QUESTION = 60
/** Typed answers get longer; voice keeps {@link TIME_PER_QUESTION} */
const TEXT_ANSWER_TIME_MULTIPLIER = 2
const MAX_SKIPS = 2

const THINKING_BAR_HEIGHTS = [0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.4, 0.7, 1, 0.6, 0.9]

/** Cycles through analysis messages while the interviewer "thinks" — eliminates dead spinner. */
function useThinkingMessage(active: boolean, interviewerName: string): string {
  const msgs = useMemo(() => [
    `${interviewerName} is reviewing what you said…`,
    'Analyzing depth and structure…',
    'Checking for key concepts…',
    `${interviewerName} is forming a response…`,
  ], [interviewerName])

  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setIdx(i => (i + 1) % msgs.length), 1800)
    return () => clearInterval(t)
  }, [active, msgs.length])
  // When not active: always show the first message so next activation opens fresh
  return active ? msgs[idx] : msgs[0]
}

interface InterviewData {
  interviewId: string
  interviewerId: InterviewerId
  role: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  answeredCount: number
  currentQuestionIndex: number
  questions: InterviewQuestion[]
  creditsLeft?: number
}

type SessionPhase =
  | 'loading'
  | 'avatar_speaking'
  | 'candidate_answering'
  | 'submitting'
  | 'feedback'
  | 'completed'

export default function InterviewSessionPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const interviewId = params.id

  // ─── Interview Data ───────────────────────────────────────
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<SessionPhase>('loading')
  const [skipCount, setSkipCount] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [lastFeedback, setLastFeedback] = useState<string>('')
  const [lastFillerAnalysis, setLastFillerAnalysis] = useState<FillerAnalysis | null>(null)
  const [answerStartTime, setAnswerStartTime] = useState<number>(0)
  const [fetchError, setFetchError] = useState('')
  const [spokenText, setSpokenText] = useState('')
  const [manualAnswer, setManualAnswer] = useState('')
  const [inputMode, setInputMode] = useState<'voice' | 'text' | 'deepgram'>('voice')
  /** Matches TimerCircle denominator for the active answering phase */
  const [answerTimeBudget, setAnswerTimeBudget] = useState(TIME_PER_QUESTION)
  const [celebration, setCelebration] = useState<TierCelebrationPayload | null>(null)
  // ─── Deepgram + ElevenLabs state ──────────────────────────
  const [dgTranscript, setDgTranscript] = useState('')
  const [dgInterim, setDgInterim] = useState('')
  const [dgError, setDgError] = useState<string | null>(null)
  const [dgRecordingSeconds, setDgRecordingSeconds] = useState(0)
  // Voice tone from last processAnswer response; drives ElevenLabs on next question
  const [lastVoiceMeta, setLastVoiceMeta] = useState<VoiceMetadata | null>(null)
  // Orchestrator follow-up: when set, the NEXT interviewer turn is this probing
  // question (asked in-place, not a new static slot) instead of questions[i+1].
  const [pendingFollowUp, setPendingFollowUp] = useState<{
    text: string
    tone: InterviewerTone
  } | null>(null)
  // Max 1 follow-up per static question — keeps interview length bounded.
  const followUpForIndexRef = useRef<number>(-1)
  const dgSttRef = useRef<StreamingSTT | null>(null)
  const dgMicCleanupRef = useRef<(() => void) | null>(null)
  // Ref so the VAD callback can read the current phase without a stale closure
  const phaseRef = useRef<SessionPhase>('loading')

  const resolvedInterviewerId = interviewData?.interviewerId ?? null
  const resolvedInterviewer = getInterviewerById(resolvedInterviewerId)
  const interviewerDisplayName = resolvedInterviewer?.name ?? 'The interviewer'
  const thinkingMessage = useThinkingMessage(phase === 'submitting', interviewerDisplayName)

  // ─── Avatar + TTS ─────────────────────────────────────────
  const { isSpeaking, currentWordIndex, speechError, speakQuestion, stopSpeaking } =
    useAvatarSync(resolvedInterviewerId)

  // ─── ElevenLabs TTS (Deepgram mode) ───────────────────────
  const resolvedGender = resolvedInterviewer?.gender === 'male' ? 'male' : 'female'
  const { isPlaying: elIsPlaying, speak: elSpeak, stop: elStop } = useVoicePlayer(resolvedGender)

  // ─── Deepgram Microphone (Deepgram mode) ──────────────────
  const { isRecording: dgIsRecording, startRecording: dgStartRecording, stopRecording: dgStopRecording } =
    useMicrophone()

  // ─── Timer ────────────────────────────────────────────────
  const { timeLeft, start: startTimer, stop: stopTimer, reset: resetTimer } =
    useTimer(TIME_PER_QUESTION)

  // ─── Speech Recognition ───────────────────────────────────
  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported: isMicSupported,
    error: micError,
    permissionState,
    startListening,
    retryPermission,
    stopListening,
    resetTranscript,
    getMergedTranscript,
    hasRecentSpeech,
  } = useSpeechRecognition()
  const useManualInput = inputMode === 'text' || (inputMode !== 'deepgram' && (!isMicSupported || permissionState === 'denied' || Boolean(micError)))

  const useManualInputRef = useRef(useManualInput)
  useManualInputRef.current = useManualInput

  // Keep phaseRef in sync so Deepgram VAD callback reads current phase
  useEffect(() => { phaseRef.current = phase }, [phase])

  useEffect(() => {
    if (inputMode !== 'deepgram' && (!isMicSupported || permissionState === 'denied' || Boolean(micError))) {
      setInputMode('text')
    }
  }, [isMicSupported, permissionState, micError, inputMode])

  // Deepgram recording duration counter (debug + UI)
  useEffect(() => {
    if (!dgIsRecording) { setDgRecordingSeconds(0); return }
    const iv = setInterval(() => setDgRecordingSeconds(s => s + 1), 1000)
    return () => clearInterval(iv)
  }, [dgIsRecording])

  // Display-only merge of finalized + interim. The submit handler does NOT
  // read this — it calls getMergedTranscript() directly so it sees the
  // latest refs (no stale-closure race with the last interim).
  const answerText = inputMode === 'deepgram'
    ? dgTranscript.trim()
    : useManualInput
      ? manualAnswer.trim()
      : (transcript + ' ' + interimTranscript).trim()

  const manualAnswerGrowEnabled = phase === 'candidate_answering' && useManualInput
  const manualAnswerRef = useAutoGrowTextarea(manualAnswer, manualAnswerGrowEnabled)

  // ─── Load interview data ───────────────────────────────────
  useEffect(() => {
    const loadInterview = async () => {
      try {
        const result = await api.get<InterviewData>(`/api/interview/${interviewId}`)
        if (!result.data.interviewerId) {
          setFetchError('Interviewer configuration is missing for this interview.')
          return
        }
        setInterviewData(result.data)
        const restoredIndex = Math.min(
          result.data.currentQuestionIndex ?? result.data.answeredCount ?? 0,
          Math.max(0, result.data.questions.length - 1)
        )
        setCurrentIndex(restoredIndex)
        setPhase('avatar_speaking')
        // Persist session context so the feedback form can include it automatically.
        const firstQ = result.data.questions[0]
        storeSessionContext({
          session_id: result.data.interviewId,
          interview_role: result.data.role,
          interview_type:
            firstQ?.category === 'technical'
              ? 'technical'
              : firstQ?.category === 'behavioral' || firstQ?.category === 'situational'
                ? 'hr_behavioral'
                : 'mixed',
          difficulty_level: result.data.difficulty,
          session_started_at: Date.now(),
        })
      } catch {
        setFetchError('Failed to load interview. Please go back and try again.')
      }
    }
    loadInterview()
  }, [interviewId])

  // ─── Current question ref ──────────────────────────────────
  const currentQuestion = interviewData?.questions[currentIndex]

  const celebrationDialog = (
    <TierUnlockCelebrationDialog
      key={celebration ? `${celebration.newTier}-${celebration.reportHref}` : 'idle'}
      open={celebration !== null}
      onOpenChange={(open) => {
        if (!open) {
          const href = celebration?.reportHref
          setCelebration(null)
          if (href) router.push(href)
        }
      }}
      data={celebration}
    />
  )

  // ─── Complete Interview (defined first — used by Next/Skip) ─
  const handleCompleteInterview = useCallback(async () => {
    setPhase('completed')
    // Record session end time so feedback form can compute accurate duration.
    patchSessionContext({ session_ended_at: Date.now() })
    try {
      const result = await api.post<{
        reportId?: string
        error?: string
        retention?: InterviewCompleteRetentionPayload | null
      }>('/api/interview/complete', { interviewId })
      const reportId = result.data.reportId
      if (!reportId) {
        setFetchError(result.data.error ?? 'Report generation failed. Please try again.')
        setPhase('feedback')
        return
      }
      const href = `/report/${reportId}`
      const retention = result.data.retention ?? null
      if (
        typeof window !== 'undefined' &&
        retention &&
        typeof retention.streak === 'number'
      ) {
        window.dispatchEvent(
          new CustomEvent('ie-streak-updated', { detail: { streak: retention.streak } }),
        )
      }
      if (
        retention?.tierUnlocked &&
        typeof retention.newTier === 'number' &&
        retention.newTier != null
      ) {
        setCelebration({
          newTier: retention.newTier,
          newBadges: [...(retention.newBadges ?? [])],
          reportHref: href,
          progressHint: retention.progress ?? null,
          nextTierNumber: retention.nextTierNumber ?? null,
          nextTierProgressPercent: retention.nextTierProgressPercent ?? 0,
        })
        return
      }
      router.push(href)
    } catch {
      setFetchError('Report generation failed. Please try again.')
      setPhase('feedback')
    }
  }, [interviewId, router])

  // ─── Deepgram STT helpers ─────────────────────────────────
  // Ref so startDgListening's VAD callback can call handleSubmitAnswer without
  // a forward-reference (handleSubmitAnswer is declared after startDgListening).
  const handleSubmitAnswerRef = useRef<() => Promise<void>>(() => Promise.resolve())
  // Same forward-reference pattern: the auto-flow effect calls handleNextQuestion
  // which is declared further down.
  const handleNextQuestionRef = useRef<() => void>(() => {})

  const stopDgListening = useCallback(() => {
    dgSttRef.current?.stop()
    dgMicCleanupRef.current?.()
    dgMicCleanupRef.current = null
    dgStopRecording()
  }, [dgStopRecording])

  const startDgListening = useCallback(async () => {
    setDgError(null)
    setDgTranscript('')
    setDgInterim('')

    let token: string
    try {
      token = await fetchSTTToken(interviewId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start voice recording.'
      setDgError(msg)
      return
    }

    const stt = new StreamingSTT(token)
    dgSttRef.current = stt

    await stt.start({
      onPartial: (chunk) => {
        if (chunk.isFinal) {
          setDgTranscript(prev => prev + chunk.text + ' ')
          setDgInterim('')
        } else {
          setDgInterim(chunk.text)
        }
      },
      onFinal: () => {
        // VAD detected end of utterance — auto-submit if still answering.
        // Called through ref to avoid a forward-declaration error.
        if (phaseRef.current === 'candidate_answering') {
          queueMicrotask(() => { void handleSubmitAnswerRef.current() })
        }
        stopDgListening()
      },
      onError: (err) => {
        console.error('[DG STT]', err)
        setDgError(err.message)
        stopDgListening()
      },
    })

    const cleanup = await dgStartRecording((data) => stt.sendAudio(data))
    dgMicCleanupRef.current = cleanup
  }, [dgStartRecording, stopDgListening, interviewId])

  // Cleanup Deepgram on unmount
  useEffect(() => {
    return () => {
      dgSttRef.current?.stop()
      dgMicCleanupRef.current?.()
    }
  }, [])

  // ─── Speak current question when phase = avatar_speaking ──
  useEffect(() => {
    if (phase !== 'avatar_speaking' || !currentQuestion) return

    // A pending orchestrator follow-up takes precedence over the static question:
    // it's a contextual probe on the SAME question the candidate just answered.
    const intro = pendingFollowUp
      ? pendingFollowUp.text
      : currentIndex === 0
        ? `Let us begin. Question ${currentIndex + 1}: ${currentQuestion.question_text}`
        : `Question ${currentIndex + 1}: ${currentQuestion.question_text}`

    setSpokenText(intro)

    const onTTSComplete = () => {
      setTimeout(() => {
        const manual = useManualInputRef.current
        const budget = manual ? TIME_PER_QUESTION * TEXT_ANSWER_TIME_MULTIPLIER : TIME_PER_QUESTION
        setAnswerTimeBudget(budget)
        setPhase('candidate_answering')
        setAnswerStartTime(Date.now())
        resetTimer(budget)
        startTimer()
        // Continuous conversation: the mic auto-activates the moment the
        // interviewer finishes — the candidate never re-enables it manually.
        if (inputMode === 'deepgram') {
          void startDgListening()
        } else if (!useManualInputRef.current && isMicSupported) {
          // Web Speech mode — start listening immediately so the UI shows
          // "Listening…" before the candidate says anything (not after).
          void startListening()
        }
      }, 500)
    }

    if (inputMode === 'deepgram') {
      // ElevenLabs TTS: follow-up tone wins; else last answer's metadata; else neutral
      const tone: InterviewerTone =
        pendingFollowUp?.tone ?? lastVoiceMeta?.tone ?? 'neutral'
      void elSpeak(intro, tone, onTTSComplete)
    } else {
      speakQuestion(intro, onTTSComplete)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIndex, pendingFollowUp])

  // ─── Submit Answer ────────────────────────────────────────
  const handleSubmitAnswer = useCallback(async () => {
    if (phaseRef.current !== 'candidate_answering') return

    // Read the merged transcript BEFORE stopping the mic. getMergedTranscript()
    // reads from refs, so we get whatever the recognizer has produced up to
    // this microtask — including interim that hasn't been finalized yet.
    const durationSeconds = Math.round((Date.now() - answerStartTime) / 1000)
    const submittedText = inputMode === 'deepgram'
      ? dgTranscript.trim()
      : useManualInput
        ? manualAnswer.trim()
        : getMergedTranscript()

    // Empty-payload guard — block submission with explicit UI feedback rather
    // than sending "[No answer provided]" silently. The user can keep talking.
    if (!submittedText) {
      console.log('[speech] submit_blocked', { reason: 'empty_payload' })
      setShowEmptyWarning(true)
      return
    }

    console.log('[speech] submitted', { payload_length: submittedText.length, durationSeconds, mode: inputMode })

    setPhase('submitting')
    setShowEmptyWarning(false)
    stopTimer()
    stopListening()
    stopSpeaking()
    elStop()
    stopDgListening()

    const finalTranscript = submittedText
    const fillerAnalysis = analyzeFillerWords(finalTranscript, durationSeconds)

    // Only allow one orchestrator-driven follow-up per static question so the
    // interview length stays bounded (no infinite probe loops).
    const followUpAllowed = followUpForIndexRef.current !== currentIndex

    try {
      // Run scoring (evaluate + persist) and the orchestrator (the intelligence
      // authority — drives follow-ups, tone, memory) in parallel. The orchestrator
      // runs for ALL input modes, not just Deepgram: probing is the core product.
      const [result, orchestratorResult] = await Promise.all([
        api.post('/api/interview/answer', {
          questionId: currentQuestion?.id,
          answerText: finalTranscript,
          interviewId,
          answerMode: inputMode === 'text' ? 'text' : 'voice',
          answerStyle: readAnswerStyle(),
          durationSeconds,
        }),
        // process-answer returns { type, text, voice_metadata }. Orchestrator
        // failure is non-fatal — interview falls back to the static next question.
        currentQuestion && interviewData
          ? fetch('/api/interview/process-answer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                interview_id: interviewId,
                interviewer_id: interviewData.interviewerId,
                question: currentQuestion.question_text,
                answer: finalTranscript,
                context: {
                  role: interviewData.role,
                  difficulty: interviewData.difficulty,
                  focus_areas: [currentQuestion.category ?? 'general'],
                  interview_style: currentQuestion.category === 'technical' ? 'technical' : 'behavioral',
                },
              }),
            })
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
          : Promise.resolve(null),
      ])

      if (orchestratorResult?.voice_metadata) {
        setLastVoiceMeta(orchestratorResult.voice_metadata as VoiceMetadata)
      }

      // If the orchestrator decided this answer needs probing, queue its follow-up
      // as the NEXT interviewer turn (asked in-place on the same question).
      if (
        followUpAllowed &&
        orchestratorResult?.type === 'followup' &&
        typeof orchestratorResult?.text === 'string' &&
        orchestratorResult.text.trim()
      ) {
        const meta = orchestratorResult.voice_metadata as VoiceMetadata | undefined
        setPendingFollowUp({
          text: orchestratorResult.text as string,
          tone: meta?.tone ?? 'neutral',
        })
        followUpForIndexRef.current = currentIndex
      } else {
        setPendingFollowUp(null)
      }

      const record: AnswerRecord = {
        questionId: currentQuestion?.id || '',
        transcript: finalTranscript,
        durationSeconds,
        fillerAnalysis,
        submittedAt: new Date().toISOString(),
      }

      setAnswers(prev => [...prev, record])
      setLastFeedback(result.data.feedback || '')
      setLastFillerAnalysis(fillerAnalysis)
      setPhase('feedback')
    } catch {
      setLastFeedback('Unable to evaluate this answer. Moving to next question.')
      setLastFillerAnalysis(fillerAnalysis)
      setPhase('feedback')
    }
  }, [
    inputMode,
    useManualInput,
    manualAnswer,
    dgTranscript,
    getMergedTranscript,
    currentIndex,
    currentQuestion,
    interviewData,
    interviewId,
    answerStartTime,
    stopTimer,
    stopListening,
    stopSpeaking,
    elStop,
    stopDgListening,
  ])

  // Keep ref current so startDgListening's onFinal callback always calls the
  // latest version of handleSubmitAnswer (avoids stale closure + forward-ref issue).
  useEffect(() => { handleSubmitAnswerRef.current = handleSubmitAnswer }, [handleSubmitAnswer])

  // ─── Timer runs out → auto submit ─────────────────────────
  useEffect(() => {
    if (timeLeft === 0 && phase === 'candidate_answering') {
      void handleSubmitAnswer()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase])

  // ─── Auto-flow: a pending follow-up advances itself ───────
  // No button click for follow-ups — after a brief natural pause the
  // interviewer just asks the probe. Static question→question still uses
  // the explicit Next button (user keeps control over pacing/review).
  useEffect(() => {
    if (phase !== 'feedback' || !pendingFollowUp) return
    const t = setTimeout(() => {
      handleNextQuestionRef.current()
    }, 1500)
    return () => clearTimeout(t)
  }, [phase, pendingFollowUp])

  // ─── Empty-submit warning ─────────────────────────────────
  const [showEmptyWarning, setShowEmptyWarning] = useState(false)
  // Auto-dismiss once the user starts speaking again
  useEffect(() => {
    if (showEmptyWarning && answerText) setShowEmptyWarning(false)
  }, [showEmptyWarning, answerText])

  // ─── Safety fallback: surface a manual escape if the candidate is in
  // candidate_answering and no speech has been observed for SILENCE_WINDOW.
  // Polls hasRecentSpeech (ref-based, no React state lag) every 2s rather
  // than relying on a single wall-clock timer that misses ongoing speech.
  const SILENCE_WINDOW_MS = 8000
  const [showStuckEscape, setShowStuckEscape] = useState(false)
  useEffect(() => {
    setShowStuckEscape(false)
    if (phase !== 'candidate_answering') return
    if (inputMode === 'deepgram') {
      // Deepgram has its own VAD — keep the legacy 15s heuristic for that mode
      const t = setTimeout(() => setShowStuckEscape(true), 15000)
      return () => clearTimeout(t)
    }
    // Web Speech mode: check actual mic activity, not wall-clock
    const iv = setInterval(() => {
      if (!hasRecentSpeech(SILENCE_WINDOW_MS) && !answerText) {
        setShowStuckEscape(true)
      }
    }, 2000)
    return () => clearInterval(iv)
  }, [phase, currentIndex, pendingFollowUp, answerText, inputMode, hasRecentSpeech])

  // ─── Next Question ────────────────────────────────────────
  const handleNextQuestion = useCallback(() => {
    resetTranscript()
    setManualAnswer('')
    setDgTranscript('')
    setDgInterim('')
    setLastFeedback('')
    setLastFillerAnalysis(null)

    if (!interviewData) return

    // A follow-up is queued → ask it in-place on the SAME question index.
    // Re-entering avatar_speaking with pendingFollowUp set makes the speak
    // effect read the follow-up text instead of advancing the static playlist.
    if (pendingFollowUp) {
      setPhase('avatar_speaking')
      return
    }

    const isLast = currentIndex >= interviewData.questions.length - 1

    if (isLast) {
      handleCompleteInterview()
      return
    }

    setCurrentIndex(prev => prev + 1)
    setPhase('avatar_speaking')
  }, [currentIndex, interviewData, pendingFollowUp, resetTranscript, handleCompleteInterview])

  // Keep the ref current for the auto-flow effect (forward-reference).
  useEffect(() => { handleNextQuestionRef.current = handleNextQuestion }, [handleNextQuestion])

  // ─── Skip Question ────────────────────────────────────────
  const handleSkip = useCallback(() => {
    if (skipCount >= MAX_SKIPS || phase !== 'candidate_answering') return
    setSkipCount(prev => prev + 1)
    stopTimer()
    stopListening()
    elStop()
    stopDgListening()
    resetTranscript()
    setManualAnswer('')
    setDgTranscript('')
    setDgInterim('')
    setLastFeedback('')
    setLastFillerAnalysis(null)
    // Skipping abandons the question — discard any queued follow-up so it
    // doesn't leak into the next static question.
    setPendingFollowUp(null)

    if (!interviewData) return
    const isLast = currentIndex >= interviewData.questions.length - 1
    if (isLast) { handleCompleteInterview(); return }
    setCurrentIndex(prev => prev + 1)
    setPhase('avatar_speaking')
  }, [skipCount, phase, currentIndex, interviewData, stopTimer, stopListening, elStop, stopDgListening, resetTranscript, handleCompleteInterview])

  // ─── Retry (re-speak current question) ───────────────────
  const handleRetry = useCallback(() => {
    if (phase !== 'candidate_answering') return
    stopListening()
    elStop()
    stopDgListening()
    resetTranscript()
    setManualAnswer('')
    setDgTranscript('')
    setDgInterim('')
    stopTimer()
    const budget = useManualInputRef.current
      ? TIME_PER_QUESTION * TEXT_ANSWER_TIME_MULTIPLIER
      : TIME_PER_QUESTION
    resetTimer(budget)
    setAnswerTimeBudget(budget)
    setPhase('avatar_speaking')
  }, [phase, stopListening, elStop, stopDgListening, resetTranscript, stopTimer, resetTimer])

  // ─── Toggle Mic ───────────────────────────────────────────
  const handleToggleMic = async () => {
    if (phase !== 'candidate_answering') return
    if (!isMicSupported) return
    if (isListening) {
      stopListening()
      return
    }
    await startListening()
  }

  const handleTryVoiceAgain = async () => {
    if (!isMicSupported) return
    const ok = await retryPermission()
    if (ok) {
      setInputMode('voice')
    }
  }

  // ─── Loading / Error States ───────────────────────────────
  if (fetchError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4"
           style={{ background: 'var(--page-gradient)' }}>
        <div className="dashboard-premium-card max-w-md p-8 text-center">
          <p className="text-(--accent-danger) font-semibold">{fetchError}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-xl bg-(--accent-primary) px-6 py-2
                       text-sm font-semibold text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'loading' || !interviewData || !currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center"
           style={{ background: 'var(--page-gradient)' }}>
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full
                          border-2 border-(--accent-primary) border-t-transparent" />
          <p className="text-(--text-secondary) text-sm">Preparing your interview...</p>
        </div>
      </div>
    )
  }

  if (phase === 'completed') {
    return (
      <>
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: 'var(--page-gradient)' }}
        >
          <div className="text-center space-y-3">
            <div
              className="mx-auto h-10 w-10 animate-spin rounded-full
                          border-2 border-(--accent-success) border-t-transparent"
            />
            <p className="text-(--text-secondary) text-sm">Generating your report...</p>
          </div>
        </div>
        {celebrationDialog}
      </>
    )
  }

  const totalQuestions = interviewData.questions.length
  const progressPct = Math.round((currentIndex / totalQuestions) * 100)

  return (
    <>
      <div
        className="min-h-screen px-4 py-6 sm:px-6 lg:px-10"
        style={{ background: 'var(--page-gradient)' }}
      >
      <div className="mx-auto w-full max-w-[min(100%,1600px)]">

        {/* ── Top Bar ── */}
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest
                          text-(--text-muted)">
              INTERVIEW SESSION
            </p>
            <h1 className="text-xl font-bold text-(--text-primary)">
              Focus Mode
            </h1>
            <p className="text-xs text-(--text-secondary)">
              Mode: {interviewData.questions[0]?.category === 'technical' ? 'Technical' : 'HR'}&nbsp;·&nbsp;
              Skips used: {skipCount} / {MAX_SKIPS}
            </p>
          </div>

          {/* Top progress bar + Exit */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block w-48">
              <div className="flex justify-between text-xs text-(--text-muted) mb-1">
                <span>Question {currentIndex + 1} of {totalQuestions}</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-(--bg-tertiary)">
                <div
                  className="h-full rounded-full bg-(--accent-primary) transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Exit this interview? Your progress on this question will be lost.')) {
                  router.push('/dashboard');
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-red-50 hover:border-red-300 hover:text-red-600"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
              aria-label="Exit interview"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Exit
            </button>
          </div>
        </div>

        {/* ── Main Layout: Left (Avatar) + Right (Answer) ── */}
        <div className="grid min-w-0 gap-4 lg:grid-cols-[min(380px,100%)_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]">

          {/* ── LEFT: Avatar Panel ── */}
          <div className="space-y-3">

            {/* Avatar Video */}
            <div className="dashboard-premium-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-(--card-border) px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-primary)/25 bg-(--accent-primary)/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-(--accent-primary)">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--accent-primary)" />
                    AI INTERVIEWER
                  </span>
                  {isSpeaking && (
                    <span className="flex items-center gap-1 rounded-full
                                     bg-(--accent-primary)/15 px-2 py-0.5
                                     text-[10px] font-semibold text-(--accent-primary)">
                      <span className="h-1.5 w-1.5 rounded-full bg-(--accent-primary)
                                       animate-pulse" />
                      Speaking
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-(--text-secondary)">
                  {progressPct}%
                </span>
              </div>

              <AvatarPlayer
                interviewerId={resolvedInterviewerId as InterviewerId}
                isSpeaking={isSpeaking}
                className="aspect-[4/3] w-full bg-(--bg-secondary)"
              />
            </div>
            <div className="text-xs text-(--text-secondary)">
              Interviewer: {resolvedInterviewer?.name ?? 'Priya'}
            </div>

            {/* Avatar Caption — shown while TTS is active */}
            {isSpeaking && currentQuestion && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CaptionDisplay
                  fullText={spokenText || currentQuestion.question_text}
                  currentWordIndex={currentWordIndex}
                />
              </motion.div>
            )}

            {/* When not speaking: show question text statically */}
            {!isSpeaking && (
              <div className="dashboard-premium-card p-4 text-sm
                              leading-relaxed text-(--text-primary)">
                <p className="text-[10px] font-semibold uppercase tracking-widest
                               text-(--text-muted) mb-2">
                  Current Question
                </p>
                {currentQuestion.question_text}
              </div>
            )}

            {/* Interview Progress Panel */}
            <div className="dashboard-premium-card space-y-3 p-4">
              <div className="flex items-center justify-between text-xs
                              text-(--text-secondary) font-semibold uppercase tracking-widest">
                <span>PROGRESS</span>
                <span>{currentIndex + 1}/{totalQuestions}</span>
              </div>

              {/* Timer — only show during candidate_answering */}
              <div className="flex items-center justify-center py-2">
                {phase === 'candidate_answering' ? (
                  <TimerCircle
                    timeLeft={timeLeft}
                    totalTime={answerTimeBudget}
                    size={96}
                  />
                ) : (
                  <div className="h-24 w-24 flex items-center justify-center
                                  rounded-full border-2 border-(--bg-tertiary)">
                    <span className="text-xs text-(--text-muted) text-center leading-tight px-2">
                      {phase === 'avatar_speaking' ? 'Preparing…'
                       : phase === 'submitting' ? 'Scoring…'
                       : phase === 'feedback' ? 'Done'
                       : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div>
                  <p className="text-2xl font-bold text-(--text-primary)">
                    {currentIndex + 1}
                  </p>
                  <p className="text-(--text-muted) uppercase tracking-wider text-[10px]">
                    Current
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-(--text-primary)">
                    {totalQuestions}
                  </p>
                  <p className="text-(--text-muted) uppercase tracking-wider text-[10px]">
                    Total
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Answer Panel (min-w-0 so 1fr column + textarea fill width) ── */}
          <div className="flex min-w-0 flex-col space-y-3">

            {/* Candidate transcript / answer area */}
            <div className="dashboard-premium-card flex min-h-0 w-full min-w-0 flex-1 flex-col space-y-3 p-5">

              {phase === 'candidate_answering' && inputMode === 'deepgram' && (
                <div className="w-full min-w-0 space-y-3">
                  {/* ElevenLabs speaking indicator */}
                  {elIsPlaying && (
                    <div className="flex items-center gap-2 rounded-lg bg-(--accent-primary)/10 px-3 py-2">
                      <Radio size={14} className="animate-pulse text-(--accent-primary)" />
                      <span className="text-xs font-semibold text-(--accent-primary)">
                        Interviewer speaking…
                      </span>
                    </div>
                  )}
                  {/* Deepgram live transcript */}
                  <div className="min-h-[100px] rounded-xl border border-(--card-border) bg-(--bg-secondary) p-4">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                      {dgIsRecording
                        ? `Live transcript · ${dgRecordingSeconds}s`
                        : 'Your answer'}
                    </p>
                    {dgTranscript || dgInterim ? (
                      <p className="text-sm leading-relaxed text-(--text-primary)">
                        {dgTranscript}
                        {dgInterim && (
                          <span className="italic text-(--text-secondary)"> {dgInterim}</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-(--text-muted)">
                        {dgIsRecording ? 'Listening…' : 'Waiting for microphone…'}
                      </p>
                    )}
                  </div>
                  {dgError && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{dgError}</p>
                  )}
                  {/* Tone badge from last answer */}
                  {lastVoiceMeta && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-(--text-muted)">Interviewer tone:</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        lastVoiceMeta.tone === 'encouraging'
                          ? 'bg-green-100 text-green-700'
                          : lastVoiceMeta.tone === 'challenging'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-(--bg-tertiary) text-(--text-secondary)'
                      }`}>
                        {lastVoiceMeta.tone === 'encouraging' ? 'Warm & Encouraging'
                          : lastVoiceMeta.tone === 'challenging' ? 'Assertive'
                          : 'Professional'}
                      </span>
                      <span className="text-[10px] text-(--text-muted)">
                        · Rapport {lastVoiceMeta.rapportLevel}/10
                      </span>
                    </div>
                  )}
                </div>
              )}

              {phase === 'candidate_answering' && !useManualInput && inputMode !== 'deepgram' && (
                <div className="w-full min-w-0">
                  <CandidateTranscript
                    transcript={transcript}
                    interimTranscript={interimTranscript}
                    isListening={isListening}
                    isSupported={isMicSupported}
                    error={micError}
                    permissionState={permissionState}
                    onToggle={() => { void handleToggleMic() }}
                    onRetry={() => { void retryPermission() }}
                  />
                </div>
              )}

              {phase === 'candidate_answering' && useManualInput && (
                <div className="flex w-full min-w-0 flex-col space-y-2">
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {isMicSupported
                      ? 'Microphone unavailable right now. Please type your answer.'
                      : 'Speech input not supported. Please type your answer.'}
                  </p>
                  {isMicSupported && (
                    <button
                      type="button"
                      onClick={() => { void handleTryVoiceAgain() }}
                      className="rounded-lg border border-(--card-border) px-3 py-1.5 text-xs font-semibold text-(--text-primary) hover:bg-(--bg-secondary)"
                    >
                      Try voice again
                    </button>
                  )}
                  <textarea
                    ref={manualAnswerRef}
                    value={manualAnswer}
                    onChange={(event) => setManualAnswer(event.target.value)}
                    placeholder="Type your answer here..."
                    className="box-border block min-h-[120px] min-w-0 w-full max-w-full resize-none overflow-y-auto rounded-xl border border-(--card-border) bg-(--card-bg) p-3 text-sm leading-relaxed text-(--text-primary) outline-none focus:border-(--accent-primary)"
                  />
                </div>
              )}

              {phase === 'avatar_speaking' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col gap-4 p-1"
                >
                  {/* Live indicator */}
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--accent-primary)/40" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-(--accent-primary)" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-(--text-secondary)">
                      {interviewerDisplayName} is speaking
                    </span>
                  </div>

                  {/* Question text preview — read-along while audio plays */}
                  <div className="rounded-xl border border-(--card-border)/60
                                  bg-(--bg-secondary)/50 p-4 text-sm leading-relaxed
                                  text-(--text-primary)/75">
                    {spokenText || currentQuestion.question_text}
                  </div>

                  <p className="text-center text-xs text-(--text-muted)">
                    Your timer starts once the question is read
                  </p>
                </motion.div>
              )}

              {phase === 'submitting' && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    {/* Waveform bars — audio-analysis feel, not a spinner */}
                    <div className="flex items-end gap-[3px]" style={{ height: 32 }}>
                      {THINKING_BAR_HEIGHTS.map((h, i) => (
                        <span
                          key={i}
                          className="w-[4px] rounded-full bg-(--accent-primary)/75 ie-thinking-bar"
                          style={{ height: `${h * 100}%`, animationDelay: `${i * 80}ms` }}
                        />
                      ))}
                    </div>
                    {/* Animated message swap — feels like reasoning, not frozen */}
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={thinkingMessage}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.25 }}
                        className="text-sm text-(--text-secondary)"
                      >
                        {thinkingMessage}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* FEEDBACK Phase */}
              {phase === 'feedback' && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Your answer — quiet recap, not an exam panel */}
                    <p className="text-sm italic leading-relaxed text-(--text-muted)">
                      “{answers[answers.length - 1]?.transcript || 'No answer recorded'}”
                    </p>

                    {/* The interviewer's reaction — framed as them speaking,
                        not an automated grading card. */}
                    {lastFeedback && (
                      <div className="flex gap-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center
                                        justify-center rounded-full
                                        bg-(--accent-primary)/15 text-xs font-bold
                                        text-(--accent-primary)">
                          {interviewerDisplayName.charAt(0)}
                        </div>
                        <p className="text-sm leading-relaxed text-(--text-primary)">
                          {lastFeedback}
                        </p>
                      </div>
                    )}

                    {/* Filler word badge */}
                    {lastFillerAnalysis && lastFillerAnalysis.count > 0 && (
                      <FillerWordBadge analysis={lastFillerAnalysis} />
                    )}

                    {/* Follow-up auto-flows (no click). Static questions keep
                        the explicit Next button so the user controls pacing. */}
                    {pendingFollowUp ? (
                      <div className="flex items-center justify-center gap-2 rounded-xl
                                      bg-(--accent-primary)/10 py-3 text-sm font-semibold
                                      text-(--accent-primary)">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full
                                         bg-(--accent-primary)" />
                        {interviewerDisplayName} is following up…
                      </div>
                    ) : (
                      <button
                        onClick={handleNextQuestion}
                        className="w-full rounded-xl bg-(--accent-primary) py-3
                                   text-sm font-semibold text-white
                                   hover:bg-(--accent-hover) transition-colors duration-200"
                      >
                        {currentIndex >= totalQuestions - 1
                          ? 'Finish Interview →'
                          : `Next Question (${currentIndex + 1}/${totalQuestions}) →`}
                      </button>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* ── Empty-payload warning ── */}
            {phase === 'candidate_answering' && showEmptyWarning && (
              <div className="dashboard-premium-card mb-3 w-full min-w-0 border border-amber-300 bg-amber-50/70 p-3">
                <p className="text-xs font-semibold text-amber-800">
                  We didn&apos;t catch your answer yet. Please speak (or type) before submitting.
                </p>
              </div>
            )}

            {/* ── Safety escape: auto-flow can never strand the user ── */}
            {phase === 'candidate_answering' && showStuckEscape && (
              <div className="dashboard-premium-card mb-3 w-full min-w-0 p-4">
                <p className="mb-2 text-xs text-(--text-secondary)">
                  Mic not picking you up? You can submit what you have, or continue.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { void handleSubmitAnswer() }}
                    className="flex-1 rounded-lg bg-(--accent-primary) py-2 text-xs
                               font-semibold text-white hover:bg-(--accent-hover)"
                  >
                    Submit my answer now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (inputMode === 'deepgram') { void startDgListening() }
                      setShowStuckEscape(false)
                    }}
                    className="rounded-lg border border-(--card-border) bg-(--bg-secondary)
                               px-3 py-2 text-xs font-semibold text-(--text-secondary)
                               hover:text-(--text-primary)"
                  >
                    Retry mic
                  </button>
                </div>
              </div>
            )}

            {/* ── Control Bar ── */}
            <div className="dashboard-premium-card w-full min-w-0 p-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => {
                    if (window.confirm('Restart this interview? Your progress will be lost.')) {
                      router.back()
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-(--text-muted)
                             hover:text-(--text-secondary) transition-colors duration-200"
                >
                  <RotateCcw size={12} />
                  Restart Interview
                </button>
                <div className="flex items-center gap-1.5 text-xs text-(--text-muted)">
                  {inputMode === 'deepgram'
                    ? dgIsRecording
                      ? <><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> Recording · {dgRecordingSeconds}s</>
                      : <><Radio size={12} /> AI Voice</>
                    : isListening
                      ? <><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> Listening…</>
                      : <><MicOff size={12} /> {isMicSupported ? 'Mic off' : 'Type to answer'}</>
                  }
                </div>
              </div>

              {micError && (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {micError}
                </p>
              )}
              {speechError && (
                <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {speechError}
                </p>
              )}

              <div className="flex items-center gap-3">
                {/* Mode cycle: voice → deepgram → text */}
                <button
                  type="button"
                  onClick={() => setInputMode((m) => m === 'voice' ? 'deepgram' : m === 'deepgram' ? 'text' : 'voice')}
                  className="rounded-xl border border-(--card-border) bg-(--bg-secondary) px-3 py-2 text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary)"
                  title="Cycle input mode: Voice → AI Voice → Type"
                >
                  {inputMode === 'deepgram' ? 'AI Voice' : inputMode === 'text' ? 'Type' : 'Voice'}
                </button>
                {/* Mic toggle — hidden in deepgram mode (auto-managed) */}
                {inputMode !== 'deepgram' && (
                  <button
                    onClick={() => { void handleToggleMic() }}
                    disabled={
                      phase !== 'candidate_answering' ||
                      !isMicSupported ||
                      useManualInput ||
                      permissionState === 'requesting'
                    }
                    className={`flex h-12 w-12 items-center justify-center rounded-xl
                                 border transition-all duration-200
                                 disabled:opacity-40 disabled:cursor-not-allowed
                                 ${isListening
                                   ? 'border-(--accent-danger)/40 bg-(--accent-danger)/10 text-(--accent-danger)'
                                   : 'border-(--card-border) bg-(--bg-secondary) text-(--text-secondary)'
                                 }`}
                  >
                    {isListening ? <Mic size={18} className="animate-pulse" /> : <MicOff size={18} />}
                  </button>
                )}
                {/* Deepgram: manual mic toggle for when VAD doesn't auto-start */}
                {inputMode === 'deepgram' && (
                  <button
                    onClick={() => {
                      if (phase !== 'candidate_answering') return
                      if (dgIsRecording) { stopDgListening() } else { void startDgListening() }
                    }}
                    disabled={phase !== 'candidate_answering' || elIsPlaying}
                    className={`flex h-12 w-12 items-center justify-center rounded-xl
                                 border transition-all duration-200
                                 disabled:opacity-40 disabled:cursor-not-allowed
                                 ${dgIsRecording
                                   ? 'border-(--accent-danger)/40 bg-(--accent-danger)/10 text-(--accent-danger)'
                                   : 'border-(--card-border) bg-(--bg-secondary) text-(--text-secondary)'
                                 }`}
                    title={dgIsRecording ? 'Stop recording' : 'Start Deepgram recording'}
                  >
                    {dgIsRecording ? <Mic size={18} className="animate-pulse" /> : <Mic size={18} />}
                  </button>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmitAnswer}
                  disabled={phase !== 'candidate_answering'}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl
                             py-3 text-sm font-semibold text-white transition-all duration-200
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: phase === 'candidate_answering'
                      ? 'linear-gradient(135deg, #6366F1, #818CF8)'
                      : 'var(--bg-tertiary)',
                  }}
                >
                  <Send size={16} />
                  Submit Answer
                </button>

                {/* Retry — re-hear question */}
                <button
                  onClick={handleRetry}
                  disabled={phase !== 'candidate_answering'}
                  className="flex h-12 w-12 items-center justify-center rounded-xl
                             border border-(--card-border) bg-(--bg-secondary)
                             text-(--text-secondary) transition-colors duration-200
                             hover:text-(--text-primary)
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Re-hear question"
                >
                  <RotateCcw size={16} />
                </button>

                {/* Skip */}
                <button
                  onClick={handleSkip}
                  disabled={phase !== 'candidate_answering' || skipCount >= MAX_SKIPS}
                  className="flex h-12 w-12 items-center justify-center rounded-xl
                             border border-(--card-border) bg-(--bg-secondary)
                             text-(--text-secondary) transition-colors duration-200
                             hover:text-(--text-primary)
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  title={`Skip (${MAX_SKIPS - skipCount} remaining)`}
                >
                  <SkipForward size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    {celebrationDialog}
    </>
  )
}
