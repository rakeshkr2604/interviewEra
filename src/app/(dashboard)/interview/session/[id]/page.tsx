'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
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
import { useAutoGrowTextarea } from '@/hooks/useAutoGrowTextarea'
import { analyzeFillerWords } from '@/hooks/useFillerDetection'
import type { FillerAnalysis } from '@/hooks/useFillerDetection'
import type { InterviewQuestion, AnswerRecord } from '@/types/interview.types'
import { api } from '@/services/api'
import { Mic, MicOff, SkipForward, RotateCcw, Send, X } from 'lucide-react'
import { getInterviewerById } from '@/lib/config/interviewers'
import type { InterviewerId } from '@/lib/config/interviewers'
import { readAnswerStyle } from '@/lib/settings/client-preferences'
import {
  TierUnlockCelebrationDialog,
  type TierCelebrationPayload,
} from '@/components/retention/TierUnlockCelebrationDialog'
import type { InterviewCompleteRetentionPayload } from '@/lib/retention/interview-complete-retention'

const TIME_PER_QUESTION = 60
/** Typed answers get longer; voice keeps {@link TIME_PER_QUESTION} */
const TEXT_ANSWER_TIME_MULTIPLIER = 2
const MAX_SKIPS = 2

interface InterviewData {
  interviewId: string
  interviewerId: InterviewerId
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
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')
  /** Matches TimerCircle denominator for the active answering phase */
  const [answerTimeBudget, setAnswerTimeBudget] = useState(TIME_PER_QUESTION)
  const [celebration, setCelebration] = useState<TierCelebrationPayload | null>(null)
  const resolvedInterviewerId = interviewData?.interviewerId ?? null
  const resolvedInterviewer = getInterviewerById(resolvedInterviewerId)

  // ─── Avatar + TTS ─────────────────────────────────────────
  const { isSpeaking, currentWordIndex, speechError, speakQuestion, stopSpeaking } =
    useAvatarSync(resolvedInterviewerId)

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
  } = useSpeechRecognition()
  const useManualInput = inputMode === 'text' || !isMicSupported || permissionState === 'denied' || Boolean(micError)

  const useManualInputRef = useRef(useManualInput)
  useManualInputRef.current = useManualInput

  useEffect(() => {
    if (!isMicSupported || permissionState === 'denied' || Boolean(micError)) {
      setInputMode('text')
    }
  }, [isMicSupported, permissionState, micError])

  const answerText = useManualInput
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

  // ─── Speak current question when phase = avatar_speaking ──
  useEffect(() => {
    if (phase !== 'avatar_speaking' || !currentQuestion) return

    const intro = currentIndex === 0
      ? `Let us begin. Question ${currentIndex + 1}: ${currentQuestion.question_text}`
      : `Question ${currentIndex + 1}: ${currentQuestion.question_text}`

    setSpokenText(intro)
    speakQuestion(intro, () => {
      // TTS complete → 500ms pause → start timer + mic
      setTimeout(() => {
        const manual = useManualInputRef.current
        const budget = manual ? TIME_PER_QUESTION * TEXT_ANSWER_TIME_MULTIPLIER : TIME_PER_QUESTION
        setAnswerTimeBudget(budget)
        setPhase('candidate_answering')
        setAnswerStartTime(Date.now())
        resetTimer(budget)
        startTimer()
      }, 500)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIndex])

  // ─── Submit Answer ────────────────────────────────────────
  const handleSubmitAnswer = useCallback(async () => {
    if (phase !== 'candidate_answering') return
    setPhase('submitting')
    stopTimer()
    stopListening()
    stopSpeaking()

    const durationSeconds = Math.round((Date.now() - answerStartTime) / 1000)
    const finalTranscript = answerText || '[No answer provided]'
    const fillerAnalysis = analyzeFillerWords(finalTranscript, durationSeconds)

    try {
      const result = await api.post('/api/interview/answer', {
        questionId: currentQuestion?.id,
        answerText: finalTranscript,
        interviewId,
        answerMode: useManualInput ? 'text' : 'voice',
        answerStyle: readAnswerStyle(),
      })

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
      // Still record the answer locally even if API fails
      setLastFeedback('Unable to evaluate this answer. Moving to next question.')
      setLastFillerAnalysis(fillerAnalysis)
      setPhase('feedback')
    }
  }, [
    phase,
    answerText,
    currentQuestion,
    interviewId,
    answerStartTime,
    useManualInput,
    stopTimer,
    stopListening,
    stopSpeaking,
  ])

  // ─── Timer runs out → auto submit ─────────────────────────
  useEffect(() => {
    if (timeLeft === 0 && phase === 'candidate_answering') {
      handleSubmitAnswer()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase])

  // ─── Next Question ────────────────────────────────────────
  const handleNextQuestion = useCallback(() => {
    resetTranscript()
    setManualAnswer('')
    setLastFeedback('')
    setLastFillerAnalysis(null)

    if (!interviewData) return
    const isLast = currentIndex >= interviewData.questions.length - 1

    if (isLast) {
      handleCompleteInterview()
      return
    }

    setCurrentIndex(prev => prev + 1)
    setPhase('avatar_speaking')
  }, [currentIndex, interviewData, resetTranscript, handleCompleteInterview])

  // ─── Skip Question ────────────────────────────────────────
  const handleSkip = useCallback(() => {
    if (skipCount >= MAX_SKIPS || phase !== 'candidate_answering') return
    setSkipCount(prev => prev + 1)
    stopTimer()
    stopListening()
    resetTranscript()
    setManualAnswer('')
    setLastFeedback('')
    setLastFillerAnalysis(null)

    if (!interviewData) return
    const isLast = currentIndex >= interviewData.questions.length - 1
    if (isLast) { handleCompleteInterview(); return }
    setCurrentIndex(prev => prev + 1)
    setPhase('avatar_speaking')
  }, [skipCount, phase, currentIndex, interviewData, stopTimer, stopListening, resetTranscript, handleCompleteInterview])

  // ─── Retry (re-speak current question) ───────────────────
  const handleRetry = useCallback(() => {
    if (phase !== 'candidate_answering') return
    stopListening()
    resetTranscript()
    setManualAnswer('')
    stopTimer()
    const budget = useManualInputRef.current
      ? TIME_PER_QUESTION * TEXT_ANSWER_TIME_MULTIPLIER
      : TIME_PER_QUESTION
    resetTimer(budget)
    setAnswerTimeBudget(budget)
    setPhase('avatar_speaking')
  }, [phase, stopListening, resetTranscript, stopTimer, resetTimer])

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
                    <span className="text-xs text-(--text-muted)">
                      {phase === 'avatar_speaking' ? 'Listening...'
                       : phase === 'feedback' ? 'Review'
                       : phase === 'submitting' ? 'Saving...' : ''}
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

              {phase === 'candidate_answering' && !useManualInput && (
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
                <div className="flex-1 flex items-center justify-center
                                text-center text-(--text-secondary)">
                  <div className="space-y-2">
                    <div className="text-3xl">🎙️</div>
                    <p className="text-sm font-medium">
                      Listen carefully to the question
                    </p>
                    <p className="text-xs text-(--text-muted)">
                      Timer starts after the question is read
                    </p>
                  </div>
                </div>
              )}

              {phase === 'submitting' && (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div className="space-y-3">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full
                                    border-2 border-(--accent-primary)
                                    border-t-transparent" />
                    <p className="text-sm text-(--text-secondary)">
                      AI is evaluating your answer...
                    </p>
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
                    {/* Your answer recap */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest
                                    text-(--text-muted) mb-2">
                        Your Answer
                      </p>
                      <p className="text-sm text-(--text-secondary) leading-relaxed
                                    rounded-xl bg-(--bg-secondary) p-3">
                        {answers[answers.length - 1]?.transcript || 'No answer recorded'}
                      </p>
                    </div>

                    {/* AI Feedback */}
                    {lastFeedback && (
                      <div className="rounded-xl border border-(--accent-success)/25
                                      bg-(--accent-success)/10 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-widest
                                      text-(--accent-success) mb-1">
                          AI Feedback
                        </p>
                        <p className="text-sm text-(--text-primary) leading-relaxed">
                          {lastFeedback}
                        </p>
                      </div>
                    )}

                    {/* Filler word badge */}
                    {lastFillerAnalysis && lastFillerAnalysis.count > 0 && (
                      <FillerWordBadge analysis={lastFillerAnalysis} />
                    )}

                    {/* Next button */}
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
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

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
                  {isListening
                    ? <><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> Listening...</>
                    : <><MicOff size={12} /> {isMicSupported ? 'Mic Off' : 'Speech unsupported'}</>
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
                {isMicSupported && (
                  <button
                    type="button"
                    onClick={() => setInputMode((mode) => (mode === 'voice' ? 'text' : 'voice'))}
                    className="rounded-xl border border-(--card-border) bg-(--bg-secondary) px-3 py-2 text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary)"
                  >
                    {useManualInput ? 'Use Voice' : 'Use Text'}
                  </button>
                )}
                {/* Mic toggle */}
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
