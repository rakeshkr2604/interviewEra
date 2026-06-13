'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { AvatarPlayer } from '@/components/avatar/AvatarPlayer'
import { CaptionDisplay } from '@/components/avatar/CaptionDisplay'
import { CandidateTranscript } from '@/components/interview/CandidateTranscript'
import { CandidatePreview } from '@/components/interview/CandidatePreview'
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
import { DeepgramSessionController } from '@/lib/voice/deepgram-session-controller'
import type { VoiceConnectionState } from '@/lib/voice/deepgram-health'
import { DeepgramVoiceStatusBanner } from '@/components/interview/DeepgramVoiceStatusBanner'
import { getSpeechSynthesisProbeError, resolvePreferredVoiceInputMode } from '@/lib/voice/browser-capabilities'
import { useInterviewKeyboardViewport } from '@/hooks/useInterviewKeyboardViewport'
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
import { lifecycleLog, lifecycleWarn, voiceDebug, interviewStartupLog, interviewLog } from '@/lib/voice/lifecycle-log'
import { interviewFlowLog } from '@/lib/voice/interview-flow-log'
import type { RuntimePhase } from '@/lib/interview/runtime-phase'
import { progressRingLabel } from '@/lib/interview/runtime-phase'
import { useInterviewSessionController } from '@/hooks/useInterviewSessionController'
import { useInterviewAudio } from '@/hooks/useInterviewAudio'
import { useInterviewAvatarSpeaking } from '@/hooks/useInterviewAvatarSpeaking'
import { useInterviewPwaLifecycle } from '@/hooks/useInterviewPwaLifecycle'
import { useInterviewVoiceUi } from '@/hooks/useInterviewVoiceUi'
import type { AvatarAnsweringReason } from '@/lib/voice/avatar-completion'
import { trackAvatarTelemetry } from '@/lib/voice/avatar-telemetry'
import { trackMicTelemetry } from '@/lib/voice/mic-telemetry'
import type { SttTelemetryCallback } from '@/lib/voice/stt-telemetry'
import { releaseAudioForMicCapture, resumeSharedInterviewAudioContext } from '@/lib/voice/audio-gesture'
import { installInterviewDebug } from '@/lib/voice/interview-debug'
import { useInterviewMicSession } from '@/hooks/useInterviewMicSession'
import { useInterviewPrepare } from '@/hooks/useInterviewPrepare'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import { trackMockInterviewCompletedGa4 } from '@/lib/analytics/funnel-ga4-bridge'
import type { FunnelCompleteGa4Payload } from '@/lib/analytics/funnel-ga4-bridge'
import { trackProductEventClient } from '@/lib/analytics/product-events'
import { useInterviewTelemetry } from '@/hooks/useInterviewTelemetry'
import { useInterviewRecovery } from '@/hooks/useInterviewRecovery'
import { useInterviewDraft } from '@/hooks/useInterviewDraft'
import { useVoiceInterviewRecovery } from '@/hooks/useVoiceInterviewRecovery'
import { VoiceRecoveryBanner } from '@/components/interview/VoiceRecoveryBanner'
import { InterviewStartupRecoveryPanel } from '@/components/interview/InterviewStartupRecoveryPanel'
import { InterviewQuestionGenLoading } from '@/components/interview/InterviewQuestionGenLoading'
import { useInterviewStartupReliability } from '@/hooks/useInterviewStartupReliability'
import {
  getStartupLoadingExplanation,
  getStartupSubtext,
} from '@/lib/telemetry/startup-reliability-policy'
import type { StartupStage } from '@/lib/telemetry/interview-startup-telemetry'
import type { InterviewDraft, DraftPhase } from '@/lib/session/interview-draft'

const TIME_PER_QUESTION = 60
/** Typed answers get longer; voice keeps {@link TIME_PER_QUESTION} */
const TEXT_ANSWER_TIME_MULTIPLIER = 2
const MAX_SKIPS = 2

const THINKING_BAR_HEIGHTS = [0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.4, 0.7, 1, 0.6, 0.9]

/**
 * Builds the text spoken by the interviewer at the start of each question.
 *
 * Q0 — formal introduction + first question. Tells the candidate who they're
 *   speaking to, how many questions there are, and sets a calm expectation.
 * Q1+ — a short, varied transition phrase followed by the question text.
 *   Phrases cycle deterministically (index % pool) so consecutive questions
 *   never sound identical, but require zero AI calls and add zero latency.
 */
function buildSessionIntro(
  index: number,
  questionText: string,
  interviewerName: string,
  role: string,
  totalQuestions: number,
): string {
  if (index === 0) {
    const name = interviewerName && interviewerName !== 'The interviewer'
      ? interviewerName
      : 'your interviewer today'
    return (
      `Hi, welcome. I'm ${name}. ` +
      `We have ${totalQuestions} question${totalQuestions === 1 ? '' : 's'} for a ${role} role today. ` +
      `Answer each one naturally — as you would in a real interview. ` +
      `Alright, here we go. ${questionText}`
    )
  }

  // Rotate through short, professional transitions so the interview
  // doesn't start each question with the same robotic prefix.
  const transitions = [
    'Let\'s continue.',
    'Moving on.',
    'Alright.',
    'Let me ask you this —',
    'Next question.',
    'Right. Now —',
    'Let\'s shift topics.',
  ]
  const t = transitions[index % transitions.length]
  return `${t} ${questionText}`
}

/**
 * Cycles through contextual messages during the `loading` phase so the
 * candidate sees meaningful progress rather than a bare spinner.
 * Messages rotate every 3s, which is slow enough to feel informative and
 * fast enough to signal that something is actually happening.
 */
function useLoadingMessage(active: boolean, generating?: boolean): string {
  const msgs = generating
    ? [
        'Preparing your interview…',
        'Generating personalized questions…',
        'Almost ready…',
        'Finalizing your session…',
      ]
    : [
        'Preparing your interview…',
        'Loading your questions…',
        'Setting up the session…',
        'Almost ready…',
      ]
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (!active) { setIdx(0); return }
    const t = setInterval(() => setIdx(i => (i + 1) % msgs.length), 3000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
  return active ? msgs[idx] : msgs[0]
}

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
  preparing?: boolean
}

type PrepareContext = Pick<InterviewData, 'role' | 'interviewerId' | 'difficulty'>

/**
 * Deterministic interview-startup state machine.
 *
 * Lives strictly inside `phase === 'loading'`. Each transition is gated on a
 * readiness signal — no state may be skipped, no transition may run before
 * its predecessor has been entered. When the machine reaches `interview_ready`
 * the page hands off to the runtime phase (`awaiting_audio_unlock` or `avatar_speaking`).
 *
 * The runtime composite "listening_active" is NOT a startup step — it is
 * derived from `phase === 'candidate_answering'` + (`webSpeechActive` or
 * `dgListening`) from Phase 2 of the realtime stabilization pass.
 */
type StartupStep =
  | 'fetching_interview'   // GET /api/interview/[id] in flight
  | 'questions_ready'      // interview + questions hydrated
  | 'initializing_audio'   // priming TTS / audio context (Phase 4 fills in actual probe)
  | 'speech_ready'         // TTS engine verified
  | 'interview_ready'      // gate cleared; phase transitions to avatar_speaking

export default function InterviewSessionPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const interviewId = params.id
  const { ensureQuestionsReady } = useInterviewPrepare()
  const [questionGenActive, setQuestionGenActive] = useState(false)
  const [prepareContext, setPrepareContext] = useState<PrepareContext | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  // ─── Interview Data ───────────────────────────────────────
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<RuntimePhase>('loading')
  // Deterministic startup state machine. Drives the gated transition from
  // mount → fetch interview → audio init → first-question playback. Each
  // setter call below MUST verify its predecessor before advancing.
  const [startupStep, setStartupStep] = useState<StartupStep>('fetching_interview')
  // `audioReady` is the readiness signal for `initializing_audio →
  // speech_ready`. Phase 3 sets it true via a placeholder microtask (the
  // pipeline is structurally validated); Phase 4 of this stabilization pass
  // replaces the placeholder with real TTS/AudioContext probes and surfaces
  // failures explicitly.
  const [audioReady, setAudioReady] = useState(false)
  // Surface audio-init failures distinctly from generic fetchError so the
  // recovery UI can offer a "Retry audio" CTA without forcing a full reload.
  const [audioInitError, setAudioInitError] = useState<string | null>(null)
  const [skipCount, setSkipCount] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [lastFeedback, setLastFeedback] = useState<string>('')
  const [lastFillerAnalysis, setLastFillerAnalysis] = useState<FillerAnalysis | null>(null)
  const [answerStartTime, setAnswerStartTime] = useState<number>(0)
  const [fetchError, setFetchError] = useState('')
  const [manualAnswer, setManualAnswer] = useState('')
  const [showEmptyWarning, setShowEmptyWarning] = useState(false)
  const [inputMode, setInputMode] = useState<'voice' | 'text' | 'deepgram'>(() => {
    if (typeof window === 'undefined') return 'voice'
    return resolvePreferredVoiceInputMode()
  })

  const { track } = useInterviewTelemetry({ interviewId, questionIndex: currentIndex, phase })
  const telemetryCtx = useMemo(
    () => ({
      interviewId: interviewId ?? '',
      questionIndex: currentIndex,
      phase,
    }),
    [interviewId, currentIndex, phase],
  )
  const voiceRecovery = useVoiceInterviewRecovery(interviewId, track, telemetryCtx)
  /** Matches TimerCircle denominator for the active answering phase */
  const [answerTimeBudget, setAnswerTimeBudget] = useState(TIME_PER_QUESTION)
  const [celebration, setCelebration] = useState<TierCelebrationPayload | null>(null)
  // ─── Deepgram + ElevenLabs state ──────────────────────────
  const [dgTranscript, setDgTranscript] = useState('')
  const [dgInterim, setDgInterim] = useState('')
  const [dgError, setDgError] = useState<string | null>(null)
  const [dgVoiceUiState, setDgVoiceUiState] = useState<VoiceConnectionState>('idle')
  const [dgVoiceUiMessage, setDgVoiceUiMessage] = useState<string | null>(null)
  const [dgVoiceShowActions, setDgVoiceShowActions] = useState(false)
  const [dgRecordingSeconds, setDgRecordingSeconds] = useState(0)
  // dgWsOpen — Deepgram WebSocket has reached OPEN state. UI must NOT render
  // "Listening…" until this is true even if the mic stream (dgIsRecording)
  // already came up. Set by the StreamingSTT.onOpen callback, cleared in
  // stopDgListening. Combined with dgIsRecording into `dgListening` below
  // — that composite is the only flag the UI uses for "Listening…" gates.
  const [dgWsOpen, setDgWsOpen] = useState(false)
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
  const dgControllerRef = useRef<DeepgramSessionController | null>(null)
  const dgMicCleanupRef = useRef<(() => void) | null>(null)
  // Ref so the VAD callback can read the current phase without a stale closure
  const phaseRef = useRef<RuntimePhase>('loading')
  // Lifecycle guards (added in realtime stabilization pass)
  // mountedRef: any async callback (api.post, setTimeout, awaits) that writes
  //   state must bail when this is false. Set to false in unmount cleanup.
  const mountedRef = useRef<boolean>(true)
  // submitInFlightRef: single-source-of-truth that an evaluation request is
  //   already running. The Submit button, the Deepgram VAD onFinal callback
  //   and the timer-out effect can all race to call handleSubmitAnswer; only
  //   the first wins, and the others become silent no-ops.
  const submitInFlightRef = useRef<boolean>(false)
  // dgStartInFlightRef: prevents overlapping startDgListening calls. The
  //   "post-TTS auto-start" and the explicit deepgram mic toggle button can
  //   both fire the same start within a tick — second caller bails.
  const dgStartInFlightRef = useRef<boolean>(false)
  const dgTranscriptRef = useRef('')
  const dgInterimRef = useRef('')
  // Transcript watchdog: auto-submit if text exists but no request leaves the client.
  const transcriptWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mockInterviewStartedRef = useRef(false)

  const resolvedInterviewerId = interviewData?.interviewerId ?? null
  const resolvedInterviewer = getInterviewerById(resolvedInterviewerId)
  const interviewerDisplayName = resolvedInterviewer?.name ?? 'The interviewer'
  const thinkingMessage = useThinkingMessage(phase === 'submitting', interviewerDisplayName)
  const loadingMessage = useLoadingMessage(phase === 'loading', questionGenActive)

  // ─── Avatar + TTS ─────────────────────────────────────────
  const { isSpeaking, currentWordIndex, speechError, speakQuestion, stopSpeaking } =
    useAvatarSync(resolvedInterviewerId)

  // ─── ElevenLabs TTS (Deepgram mode) ───────────────────────
  const resolvedGender = resolvedInterviewer?.gender === 'male' ? 'male' : 'female'
  const {
    isPlaying: elIsPlaying,
    playbackProgress: elPlaybackProgress,
    error: elTtsError,
    speak: elSpeak,
    stop: elStop,
  } = useVoicePlayer(resolvedGender)

  const avatarReadyLoggedRef = useRef(false)
  useEffect(() => {
    if (avatarReadyLoggedRef.current) return
    if (
      phase !== 'avatar_speaking' &&
      phase !== 'awaiting_audio_unlock'
    ) return
    if (!interviewData) return
    avatarReadyLoggedRef.current = true
    interviewStartupLog('avatar_ready', { interviewerId: resolvedInterviewerId })
    interviewFlowLog('avatar', 'avatar_surface_ready', {
      interviewId,
      interviewerId: resolvedInterviewerId,
    })
  }, [phase, interviewData, resolvedInterviewerId, interviewId])

  // ─── Deepgram Microphone (Deepgram mode) ──────────────────
  const { isRecording: dgIsRecording, startRecording: dgStartRecording, stopRecording: dgStopRecording } =
    useMicrophone()

  // ─── Timer ────────────────────────────────────────────────
  const { timeLeft, start: startTimer, stop: stopTimer, reset: resetTimer } =
    useTimer(TIME_PER_QUESTION)
  /** One-shot guard: answer clock starts only after input readiness per mode. */
  const answerTimerArmedRef = useRef(false)
  const [answerTimerArmed, setAnswerTimerArmed] = useState(false)
  const answerTimeBudgetRef = useRef(TIME_PER_QUESTION)

  useEffect(() => {
    answerTimeBudgetRef.current = answerTimeBudget
  }, [answerTimeBudget])

  const armAnswerTimer = useCallback(
    (trigger: string, opts?: { remaining?: number; budget?: number }) => {
      if (answerTimerArmedRef.current) return
      if (phaseRef.current !== 'candidate_answering') return

      answerTimerArmedRef.current = true
      setAnswerTimerArmed(true)

      const budget = opts?.budget ?? answerTimeBudgetRef.current
      if (opts?.remaining != null) {
        resetTimer(opts.remaining)
        setAnswerStartTime(Date.now() - (budget - opts.remaining) * 1000)
      } else {
        setAnswerStartTime(Date.now())
      }

      startTimer()

      interviewFlowLog('timer', 'timer_started', {
        interviewId,
        questionIndex: currentIndex,
        budgetSeconds: budget,
        mode: inputMode,
        gated: true,
        trigger,
      })
      interviewStartupLog('timer_started', {
        questionIndex: currentIndex,
        budgetSeconds: budget,
        mode: inputMode,
        gated: true,
        trigger,
      })
      track('TIMER', 'timer_started', {
        budgetSeconds: budget,
        mode: inputMode,
        gated: true,
        trigger,
      })
    },
    [currentIndex, inputMode, interviewId, resetTimer, startTimer, track],
  )

  const interviewDataRef = useRef(interviewData)
  useEffect(() => {
    interviewDataRef.current = interviewData
  }, [interviewData])

  const startupMarkRef = useRef<(stage: StartupStage, extra?: Record<string, unknown>) => void>(() => {})

  const startupReliability = useInterviewStartupReliability({
    interviewId: interviewId ?? '',
    phase,
    startupStep,
    inputMode,
    questionGenActive,
    track,
    telemetryCtx,
    onRetryLoad: () => {
      setFetchError('')
      setAudioInitError(null)
      setAudioReady(false)
      setStartupStep('fetching_interview')
      setPhase('loading')
      setInterviewData(null)
      setQuestionGenActive(false)
      setPrepareContext(null)
      setReloadNonce((n) => n + 1)
    },
    onReconnectPrepare: async () => {
      setFetchError('')
      setAudioInitError(null)
      setAudioReady(false)
      setStartupStep('fetching_interview')
      setPhase('loading')
      setInterviewData(null)
      setQuestionGenActive(true)
      startupMarkRef.current('session_create_started', { source: 'reconnect' })
      try {
        const prep = await ensureQuestionsReady(interviewId)
        if (!prep.ok) {
          startupMarkRef.current('session_create_failed', { error: prep.error, source: 'reconnect' })
          setFetchError(prep.error)
          return
        }
        startupMarkRef.current('session_create_success', { source: 'reconnect' })
      } catch (err) {
        startupMarkRef.current('session_create_failed', {
          error: err instanceof Error ? err.message : String(err),
          source: 'reconnect',
        })
        setFetchError('Reconnect failed. Please try again.')
      } finally {
        setQuestionGenActive(false)
        setReloadNonce((n) => n + 1)
      }
    },
    onSwitchToTyping: () => {
      setInputMode('text')
      const data = interviewDataRef.current
      if (data?.questions?.length) {
        setStartupStep('interview_ready')
        const budget = TIME_PER_QUESTION * TEXT_ANSWER_TIME_MULTIPLIER
        setAnswerTimeBudget(budget)
        setPhase('candidate_answering')
        phaseRef.current = 'candidate_answering'
        answerTimerArmedRef.current = false
        setAnswerTimerArmed(false)
        resetTimer(budget)
        armAnswerTimer('startup_switch_to_typing')
      }
    },
  })

  useEffect(() => {
    startupMarkRef.current = startupReliability.mark
  }, [startupReliability.mark])

  const {
    mark: startupMark,
    handleRetry: handleStartupRetry,
    handleReconnect: handleStartupReconnect,
    handleSwitchToTyping: handleStartupSwitchToTyping,
    markFirstQuestionReceived,
  } = startupReliability

  // ─── Speech Recognition ───────────────────────────────────
  const micKeepArmedRef = useRef(false)
  /** User chose AI Voice after Web Speech failed — do not auto-revert to browser STT. */
  const webSpeechFallbackLockedRef = useRef(false)
  const sttTelemetryRef = useRef<SttTelemetryCallback | null>(null)
  const onSttTelemetry = useCallback<SttTelemetryCallback>((event, data) => {
    sttTelemetryRef.current?.(event, data)
  }, [])
  const prepareForMicCapture = useCallback(async () => {
    try { stopSpeaking() } catch { /* */ }
    try { elStop() } catch { /* */ }
    await releaseAudioForMicCapture()
  }, [stopSpeaking, elStop])
  const handleSwitchToAiVoiceRef = useRef<(source: string) => Promise<void>>(async () => {})
  const onWebSpeechStalled = useCallback((payload: { noSpeechStreak: number }) => {
    track('VOICE', 'web_speech_stalled', { streak: payload.noSpeechStreak })
    // Mid-answer: keep Web Speech running; user can switch via "Use AI Voice" manually.
    if (phaseRef.current === 'candidate_answering') return
    void handleSwitchToAiVoiceRef.current('web_speech_stalled')
  }, [track])
  const [userMicMuted, setUserMicMuted] = useState(false)
  const userMicMutedRef = useRef(false)
  useEffect(() => {
    userMicMutedRef.current = userMicMuted
  }, [userMicMuted])

  const {
    transcript,
    interimTranscript,
    recognitionState,
    isListening,
    isSupported: isMicSupported,
    error: micError,
    permissionState,
    startListening,
    startListeningFromUserGesture,
    retryPermission,
    stopListening,
    restartListening,
    clearStormBudgetForAnswer,
    recognitionFailed,
    clearRecognitionFailure,
    resetTranscript,
    restoreTranscript,
    getMergedTranscript,
  } = useSpeechRecognition({
    keepArmedDuringAnswerRef: micKeepArmedRef,
    onSttTelemetry,
    prepareForMicCapture,
    onWebSpeechStalled,
  })
  // The ONLY state that may surface "Listening…" in the Deepgram path.
  // Requires: local mic stream is up AND the Deepgram WebSocket is OPEN.
  const dgListening = dgIsRecording && dgWsOpen
  const useManualInput =
    inputMode === 'text' ||
    voiceRecovery.isBlockingMic ||
    !isMicSupported ||
    permissionState === 'denied'

  const micArmed =
    phase === 'candidate_answering' &&
    (inputMode === 'voice' || inputMode === 'deepgram') &&
    !voiceRecovery.isBlockingMic &&
    !userMicMuted &&
    permissionState !== 'denied' &&
    (inputMode === 'deepgram' || isMicSupported)

  useEffect(() => {
    micKeepArmedRef.current = micArmed
  }, [micArmed])

  const useManualInputRef = useRef(useManualInput)
  useManualInputRef.current = useManualInput

  // Keep phaseRef in sync so Deepgram VAD callback reads current phase
  useEffect(() => { phaseRef.current = phase }, [phase])

  useEffect(() => {
    sttTelemetryRef.current = (event, data) => {
      track('VOICE', event, data, { critical: true })
    }
  }, [track])
  // Destructure for stable callback identities (each is a useCallback) so the
  // persistence / reconcile / unload-guard effects don't re-run every render.
  const {
    persist: persistDraft,
    clear: clearDraft,
    reconcile: reconcileDraft,
    setUnloadGuard: setDraftUnloadGuard,
  } = useInterviewDraft(interviewId)
  // Holds a reconciled draft between the load fetch and the startup→runtime
  // handoff, so a refresh restores the in-progress answer (transcript + timer)
  // instead of restarting the question from the server's answeredCount.
  const pendingRestoreRef = useRef<InterviewDraft | null>(null)

  // ── Stale-closure-proof mirrors (audit P1 #5: watchdog stale closures) ──
  // The mic-startup watchdog reads these via refs so its 5s deadline is measured
  // from phase entry yet always evaluates the LATEST recognition/permission
  // state — no false text-mode flip from a stale closure, no missed recovery.
  const recognitionStateRef = useRef(recognitionState)
  const permissionStateRef = useRef(permissionState)
  const micErrorRef = useRef(micError)
  const isListeningRef = useRef(isListening)
  recognitionStateRef.current = recognitionState
  permissionStateRef.current = permissionState
  micErrorRef.current = micError
  isListeningRef.current = isListening

  useEffect(() => {
    dgTranscriptRef.current = dgTranscript
  }, [dgTranscript])

  useEffect(() => {
    dgInterimRef.current = dgInterim
  }, [dgInterim])

  const keyboardBottomInset = useInterviewKeyboardViewport(
    phase === 'candidate_answering' && useManualInput,
  )

  useEffect(() => {
    if (voiceRecovery.isActive) return
    if (webSpeechFallbackLockedRef.current) return
    if (permissionState === 'denied') {
      if (inputMode !== 'text') setInputMode('text')
      return
    }
    const preferred = resolvePreferredVoiceInputMode()
    if (inputMode === 'deepgram' && preferred === 'voice') {
      setInputMode('voice')
    } else if (inputMode !== preferred && preferred !== 'deepgram') {
      setInputMode(preferred)
    }
  }, [isMicSupported, permissionState, inputMode, voiceRecovery.isActive])

  // Deepgram recording duration counter (debug + UI)
  useEffect(() => {
    if (!dgIsRecording) { setDgRecordingSeconds(0); return }
    const iv = setInterval(() => setDgRecordingSeconds(s => s + 1), 1000)
    return () => clearInterval(iv)
  }, [dgIsRecording])

  // Display-only merge of finalized + interim. Submit eligibility uses the same
  // authoritative union as resolveSubmittedText() so the button state always
  // matches what the user sees in the answer panel.
  const answerText = inputMode === 'deepgram'
    ? (dgTranscript.trim() || dgInterim.trim())
    : useManualInput
      ? manualAnswer.trim()
      : (getMergedTranscript().trim() || (transcript + ' ' + interimTranscript).trim())

  const manualAnswerGrowEnabled = phase === 'candidate_answering' && useManualInput
  const manualAnswerRef = useAutoGrowTextarea(manualAnswer, manualAnswerGrowEnabled)

  // Authoritative answer text for submit — unions voice refs, manual input, and
  // the display mirror so a mic-error fallback to text mode cannot discard a
  // voice transcript that never reached manualAnswer state.
  const resolveSubmittedText = useCallback((): string => {
    if (inputMode === 'deepgram') {
      return (dgTranscript.trim() || dgInterim.trim())
    }
    const voice = getMergedTranscript().trim()
    const manual = manualAnswer.trim()
    const display = useManualInput
      ? manual
      : (transcript + ' ' + interimTranscript).trim()
    return voice || manual || display
  }, [
    inputMode,
    dgTranscript,
    dgInterim,
    getMergedTranscript,
    manualAnswer,
    useManualInput,
    transcript,
    interimTranscript,
  ])

  // When mic errors force manual UI, copy any voice transcript into the textarea
  // so submit and the user see the same payload.
  useEffect(() => {
    if (!useManualInput) return
    const voice = getMergedTranscript().trim()
    if (voice && !manualAnswer.trim()) {
      setManualAnswer(voice)
    }
  }, [
    useManualInput,
    inputMode,
    getMergedTranscript,
    manualAnswer,
    transcript,
    interimTranscript,
  ])

  // ─── Load interview data ───────────────────────────────────
  useEffect(() => {
    // React StrictMode (dev) performs a mount → unmount → remount cycle on
    // initial render. The shared `mountedRef` is set to `false` by the unmount
    // cleanup and is never reset by the remount because `useRef` preserves the
    // same object across the cycle. Resetting it to `true` HERE — at the top
    // of the effect body — ensures the second (real) invocation sees a valid
    // `mounted` flag and does not bail out of the async callback path
    // prematurely. Without this line the machine is stuck at
    // `fetching_interview` forever in development (and on any fast-refresh).
    mountedRef.current = true
    interviewStartupLog('session_loaded', { interviewId })
    const loadInterview = async () => {
      // Hard deadline: if the interview data fetch stalls (slow DB, cold
      // serverless function, network issue) the candidate sees a clear error
      // rather than an infinite loading spinner.
      let timedOut = false
      const loadTimeoutId = window.setTimeout(() => {
        timedOut = true
        if (mountedRef.current) {
          setFetchError(
            'Interview session took too long to load. Please go back and try again.',
          )
        }
      }, 15_000)

      try {
        let result = await api.get<InterviewData & { preparing?: boolean }>(`/api/interview/${interviewId}`)
        window.clearTimeout(loadTimeoutId)
        if (timedOut || !mountedRef.current) return
        if (!result.data.interviewerId) {
          setFetchError('Interviewer configuration is missing for this interview.')
          return
        }

        if (!result.data.questions?.length || result.data.preparing) {
          setPrepareContext({
            role: result.data.role,
            interviewerId: result.data.interviewerId,
            difficulty: result.data.difficulty,
          })
          setQuestionGenActive(true)
          trackProductEventClient('interview_generation_started', { interviewId })
          startupMarkRef.current('session_create_started', { source: 'question_prepare' })
          const prep = await ensureQuestionsReady(interviewId)
          if (timedOut || !mountedRef.current) return
          if (!prep.ok) {
            startupMarkRef.current('session_create_failed', { error: prep.error, source: 'question_prepare' })
            setFetchError(prep.error)
            setQuestionGenActive(false)
            return
          }
          startupMarkRef.current('session_create_success', { source: 'question_prepare' })
          result = await api.get<InterviewData>(`/api/interview/${interviewId}`)
          trackProductEventClient('interview_generation_completed', { interviewId })
          setQuestionGenActive(false)
        }

        if (!result.data.questions || result.data.questions.length === 0) {
          setFetchError('Interview has no questions. Please go back and try again.')
          return
        }
        setInterviewData(result.data)
        const restoredIndex = Math.min(
          result.data.currentQuestionIndex ?? result.data.answeredCount ?? 0,
          Math.max(0, result.data.questions.length - 1)
        )
        setCurrentIndex(restoredIndex)
        interviewStartupLog('question_loaded', {
          interviewId,
          questionCount: result.data.questions.length,
          restoredIndex,
        })
        track('INTERVIEW_FLOW', 'interview_loaded', {
          questionCount: result.data.questions.length,
          restoredIndex,
        })
        // ── Refresh recovery (audit P0) ──────────────────────────────────────
        // If a refresh interrupted an in-progress answer for THIS question,
        // stage the draft so the startup→runtime handoff restores the
        // transcript + timer instead of restarting the question. Reconciliation
        // discards drafts the server has already moved past (answer submitted
        // before the refresh) so an answered question is never replayed.
        const reconciliation = reconcileDraft(restoredIndex)
        if (reconciliation.action === 'restore') {
          pendingRestoreRef.current = reconciliation.draft
          track('INTERVIEW_FLOW', 'draft_restore_staged', {
            restoredIndex,
            draftPhase: reconciliation.draft.phase,
            transcriptLen: reconciliation.draft.transcript.length,
            timerRemaining: reconciliation.draft.timerRemaining,
          })
        } else if (reconciliation.reason !== 'no_draft') {
          track('INTERVIEW_FLOW', 'draft_discarded', {
            reason: reconciliation.reason,
            restoredIndex,
          })
        }
        // GATED TRANSITION 1 → 2: only advance when interview + non-empty
        // questions are present. The next step (audio init) is driven by its
        // own useEffect watching this state value.
        setStartupStep('questions_ready')
        markFirstQuestionReceived({
          questionCount: result.data.questions.length,
          restoredIndex,
        })
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
      } catch (err) {
        window.clearTimeout(loadTimeoutId)
        if (timedOut || !mountedRef.current) return
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('Unauthorized') || msg.includes('"401"') || msg.includes('status 401')) {
          router.push(`/login?next=/interview/session/${interviewId}`)
          return
        }
        setFetchError('Failed to load interview. Please go back and try again.')
      }
    }
    loadInterview()
    // Runs once per interview. `ensureQuestionsReady`, `reconcileDraft` and
    // `track` are all stable callbacks (no identity churn), so excluding them
    // keeps this a single-shot load without re-fetching on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId, reloadNonce, router])

  // ─── Startup state machine: questions_ready → initializing_audio ────────────
  // Single-shot transition. Guarded on:
  //  - startupStep === 'questions_ready' (predecessor reached)
  //  - interviewData hydrated (defensive — predecessor cannot enter without it)
  //  - phase still 'loading' (runtime hasn't started)
  useEffect(() => {
    if (startupStep !== 'questions_ready') return
    if (!interviewData) return
    if (phase !== 'loading') return
    setStartupStep('initializing_audio')
  }, [startupStep, interviewData, phase])

  // ─── Startup state machine: initializing_audio → speech_ready ──────────────
  // Real audio-pipeline readiness probe. Verifies the APIs the runtime needs
  // BEFORE the avatar tries to speak. Failures surface via setAudioInitError
  // which holds the machine in `initializing_audio` and renders the
  // "Retry audio setup" CTA on the loading screen.
  //
  // What is verified:
  //   1. window + speechSynthesis (only if browser-TTS path)
  //   2. At least one voice present (waits up to 2s for the async
  //      `voiceschanged` event Chrome fires on first paint)
  //   3. AudioContext constructor exists (needed for both paths; ElevenLabs
  //      uses Web Audio for decoded playback, browser TTS uses it for the
  //      gesture-warmed context that prevents autoplay-policy failures)
  //
  // What is NOT done here (deliberate):
  //   - Actually creating an AudioContext — that would consume an autoplay
  //     gesture allowance the runtime needs. Creation happens in the first
  //     speak() call. The probe only verifies the API exists.
  //   - Calling /api/tts HEAD — adds a 200–500ms network hop on every load
  //     for marginal extra confidence. The runtime speak path already
  //     handles 429/502 responses and falls back to browser TTS in Phase 5.
  useEffect(() => {
    if (startupStep !== 'initializing_audio') return
    let cancelled = false
    const probeAudio = async () => {
      startupMarkRef.current('audio_unlock_started', { source: 'tts_probe' })
      try {
        if (typeof window === 'undefined') {
          throw new Error('Audio pipeline unavailable in this environment')
        }
        if (inputMode !== 'deepgram') {
          if (!('speechSynthesis' in window)) {
            throw new Error(getSpeechSynthesisProbeError())
          }
          let voices = window.speechSynthesis.getVoices()
          if (voices.length === 0) {
            // Chrome populates voices asynchronously on first call. Wait up
            // to 2s for the `voiceschanged` event; abort the wait on
            // unmount or cancellation so we never setState into a dead tree.
            await new Promise<void>((resolve) => {
              let settled = false
              const settle = () => {
                if (settled) return
                settled = true
                window.speechSynthesis.removeEventListener('voiceschanged', settle)
                clearTimeout(timeout)
                resolve()
              }
              const timeout = setTimeout(settle, 2000)
              window.speechSynthesis.addEventListener('voiceschanged', settle)
            })
            if (cancelled || !mountedRef.current) return
            voices = window.speechSynthesis.getVoices()
          }
          // Empty voices after the wait is NOT fatal — Safari lazy-loads on
          // first speak. We only warn so logs surface a degraded pipeline.
          if (voices.length === 0) {
            console.warn('[startup] No TTS voices populated yet; first speak may bootstrap them')
          }
        }
        // Web Audio is required for both modes (ElevenLabs decoded playback +
        // any gesture-warmed context the runtime may want later).
        const AudioCtxCtor =
          (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
          (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AudioCtxCtor) {
          throw new Error('Web Audio is not supported in this browser')
        }
        if (cancelled || !mountedRef.current) return
        interviewStartupLog('tts_ready', { mode: inputMode })
        startupMarkRef.current('audio_unlock_success', { source: 'tts_probe', mode: inputMode })
        setAudioReady(true)
      } catch (err) {
        if (cancelled || !mountedRef.current) return
        const message = err instanceof Error ? err.message : 'Audio init failed'
        console.error('[startup] Audio probe failed:', message)
        interviewStartupLog('tts_probe_failed', { error: message, mode: inputMode })
        startupMarkRef.current('audio_unlock_failed', { error: message, mode: inputMode })
        setAudioInitError(message)
      }
    }
    void probeAudio()
    return () => { cancelled = true }
  }, [startupStep, inputMode])

  // ─── Startup state machine: initializing_audio → speech_ready (gate) ───────
  // Listens for the audioReady signal flipped by the probe above. The gate is
  // separate from the probe so failure handling (audioInitError) can hold the
  // machine in `initializing_audio` until the user retries.
  useEffect(() => {
    if (startupStep !== 'initializing_audio') return
    if (!audioReady) return
    if (audioInitError) return
    setStartupStep('speech_ready')
  }, [startupStep, audioReady, audioInitError])

  // ─── Startup state machine: speech_ready → interview_ready → runtime ───────
  // Final gate. Once speech_ready is entered we immediately advance to
  // interview_ready and hand off to the runtime phase (avatar_speaking).
  // Both transitions in one effect because there is no asynchronous work
  // between them — interview_ready is purely a sentinel state so the loading
  // screen can render "Ready to start" briefly before the avatar speaks.
  useEffect(() => {
    if (startupStep !== 'speech_ready') return
    if (phase !== 'loading') return
    setStartupStep('interview_ready')

    // ── Refresh restore (audit P0) ──────────────────────────────────────────
    // A reconciled draft for the current question replays the in-progress
    // answer directly into candidate_answering — restoring transcript and
    // timer instead of re-speaking. We surface the recovered text in the
    // editable answer field (works on every platform, avoids an iOS TTS
    // re-gesture the refresh just invalidated).
    const restore = pendingRestoreRef.current
    if (restore && restore.questionIndex === currentIndex) {
      pendingRestoreRef.current = null
      const budget = restore.timerBudget > 0 ? restore.timerBudget : TIME_PER_QUESTION
      const hasSavedAnswer = restore.transcript.trim().length > 0
      const remaining =
        !hasSavedAnswer && restore.timerRemaining <= 5
          ? budget
          : restore.timerRemaining > 0
            ? Math.min(restore.timerRemaining, budget)
            : budget
      const voiceRecoveryActive = voiceRecovery.beginFromDraft(restore, currentIndex)
      const modeForSession = resolvePreferredVoiceInputMode()
      if (voiceRecoveryActive) {
        setInputMode(modeForSession)
        if (modeForSession === 'deepgram') {
          setDgTranscript(restore.transcript)
          setDgInterim('')
        } else {
          restoreTranscript(restore.transcript)
        }
        setManualAnswer(restore.transcript)
      } else {
        setInputMode('text')
        setManualAnswer(restore.transcript)
      }
      setSkipCount(restore.skipCount)
      setPendingFollowUp(
        restore.pendingFollowUp
          ? { text: restore.pendingFollowUp.text, tone: restore.pendingFollowUp.tone as InterviewerTone }
          : null,
      )
      setAnswerTimeBudget(budget)
      resetTimer(remaining)
      setPhase('candidate_answering')
      phaseRef.current = 'candidate_answering'
      micKeepArmedRef.current =
        (restore.inputMode === 'voice' || restore.inputMode === 'deepgram') &&
        !voiceRecovery.isBlockingMic &&
        permissionState !== 'denied' &&
        (restore.inputMode === 'deepgram' || isMicSupported)
      setUserMicMuted(false)
      answerTimerArmedRef.current = false
      setAnswerTimerArmed(false)
      armAnswerTimer('draft_restore', { remaining, budget })
      track('INTERVIEW_FLOW', 'draft_restored', {
        questionIndex: currentIndex,
        transcriptLen: restore.transcript.length,
        timerRemaining: remaining,
        budget,
        inputMode: restore.inputMode,
        voiceRecovery: voiceRecoveryActive,
      })
      if (voiceRecoveryActive) {
        clearStormBudgetForAnswer()
      }
      return
    }

    setPhase(
      interviewAudio.needsUnlock && !interviewAudio.isUnlocked
        ? 'awaiting_audio_unlock'
        : 'avatar_speaking',
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startupStep, phase, currentIndex])

  // ─── Funnel: mock_interview_started (once per session) ─────
  useEffect(() => {
    if (phase === 'loading' || phase === 'completed') return
    if (mockInterviewStartedRef.current) return
    if (!interviewId || !interviewData) return

    mockInterviewStartedRef.current = true

    void (async () => {
      let userId: string | undefined
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        userId = user?.id
      } catch {
        /* best-effort */
      }

      trackFunnelEvent('mock_interview_started', {
        userId,
        interviewId,
        role: interviewData.role,
        source: 'live_session',
      })
    })()
  }, [phase, interviewId, interviewData])

  // ─── Current question ref ──────────────────────────────────
  const currentQuestion = interviewData?.questions[currentIndex]
  const totalQuestions = interviewData?.questions.length ?? 0

  const interviewAudio = useInterviewAudio(interviewId)
  const { goToInterviewerTurn } = useInterviewSessionController({
    interviewId,
    questionIndex: currentIndex,
    audioUnlocked: interviewAudio.isUnlocked,
    setPhase,
    stopTimer,
  })
  const startDgListeningRef = useRef<
    (opts?: { preserveTranscript?: boolean; isRefresh?: boolean }) => Promise<unknown>
  >(async () => {})
  const startListeningRef = useRef<() => Promise<unknown>>(async () => {})

  const enterAnsweringPhase = useCallback(
    (reason: AvatarAnsweringReason) => {
      const allowed: AvatarAnsweringReason[] = [
        'audio_completed',
        'user_continue',
        'voice_disabled',
      ]
      if (!allowed.includes(reason)) {
        lifecycleWarn('session', 'enter_answering_rejected', { reason })
        return
      }
      if (!mountedRef.current) return
      if (phaseRef.current !== 'avatar_finished') {
        lifecycleLog('session', 'enter_answering_skipped', { phase: phaseRef.current })
        return
      }
      const manual = useManualInputRef.current
      const budget = manual ? TIME_PER_QUESTION * TEXT_ANSWER_TIME_MULTIPLIER : TIME_PER_QUESTION
      setAnswerTimeBudget(budget)
      setPhase('candidate_answering')
      // Sync refs immediately — startListening runs in the same tick before
      // React effects update phaseRef / micKeepArmedRef (root cause of stuck mic).
      phaseRef.current = 'candidate_answering'
      micKeepArmedRef.current =
        (inputMode === 'voice' || inputMode === 'deepgram') &&
        !voiceRecovery.isBlockingMic &&
        permissionState !== 'denied' &&
        (inputMode === 'deepgram' || isMicSupported)
      setUserMicMuted(false)
      clearStormBudgetForAnswer()
      answerTimerArmedRef.current = false
      setAnswerTimerArmed(false)
      resetTimer(budget)
      interviewStartupLog('answering_phase_entered', {
        questionIndex: currentIndex,
        budgetSeconds: budget,
        mode: inputMode,
        timerArmed: false,
        avatarReason: reason,
      })
      voiceDebug('question_transitioned', {
        mode: inputMode,
        question_index: currentIndex,
        has_follow_up: !!pendingFollowUp,
      })
      if (inputMode === 'deepgram' && resolvePreferredVoiceInputMode() === 'deepgram') {
        voiceDebug('start_listening_triggered', { source: 'post_avatar_finished', mode: 'deepgram' })
        interviewStartupLog('listening_started', { mode: 'deepgram', source: 'post_avatar_finished' })
        trackMicTelemetry('mic_started', telemetryCtx, { mode: 'deepgram' })
        void startDgListeningRef.current()
      } else if (
        inputMode === 'voice' &&
        isMicSupported &&
        !useManualInputRef.current &&
        permissionState !== 'denied'
      ) {
        voiceDebug('start_listening_triggered', { source: 'post_avatar_finished', mode: 'voice' })
        interviewStartupLog('listening_started', { mode: 'voice', source: 'post_avatar_finished' })
        trackMicTelemetry('mic_started', telemetryCtx, { mode: 'web_speech' })
        clearStormBudgetForAnswer()
        clearRecognitionFailure()
        void startListeningRef.current()
      } else {
        interviewStartupLog('listening_skipped', {
          mode: inputMode,
          reason: 'await_user_mic_tap',
          useManualInput: useManualInputRef.current,
          micSupported: isMicSupported,
        })
      }
    },
    [
      currentIndex,
      inputMode,
      isMicSupported,
      pendingFollowUp,
      resetTimer,
      clearStormBudgetForAnswer,
      permissionState,
      voiceRecovery.isBlockingMic,
      clearRecognitionFailure,
      telemetryCtx,
    ],
  )

  // Fresh interviewer turn — never carry mute state from the previous answer.
  useEffect(() => {
    if (
      phase === 'avatar_speaking' ||
      phase === 'awaiting_audio_unlock' ||
      phase === 'avatar_finished'
    ) {
      setUserMicMuted(false)
    }
  }, [phase, currentIndex])

  useEffect(() => {
    if (phase === 'candidate_answering' && permissionState === 'denied') {
      trackMicTelemetry('mic_permission_lost', telemetryCtx, { inputMode })
    }
  }, [phase, permissionState, telemetryCtx, inputMode])

  const micSession = useInterviewMicSession({
    phase,
    phaseRef,
    questionIndex: currentIndex,
    inputMode,
    userMicMutedRef,
    isMicSupported,
    permissionState,
    recognitionState,
    dgListening,
    telemetryCtx,
    startListening,
    restartListening,
    startDgListening: () => startDgListeningRef.current(),
  })

  const micFailed = micSession.micFailed || recognitionFailed

  // Web Speech: show "Listening…" only after transcript pipeline is confirmed.
  const webSpeechActive = isListening && recognitionState === 'active'

  // Gate answer timer on input readiness (audit: timer gating fix).
  useEffect(() => {
    if (phase !== 'candidate_answering') return
    if (inputMode !== 'voice' || useManualInput) return
    if (!webSpeechActive) return
    armAnswerTimer('web_speech_active')
  }, [phase, inputMode, useManualInput, webSpeechActive, armAnswerTimer])

  // Start countdown once the mic session opens (onstart), even before first word.
  useEffect(() => {
    if (phase !== 'candidate_answering') return
    if (inputMode !== 'voice' || useManualInput) return
    if (!isListening || userMicMuted) return
    armAnswerTimer('web_speech_onstart')
  }, [phase, inputMode, useManualInput, isListening, userMicMuted, armAnswerTimer])

  useEffect(() => {
    if (phase !== 'candidate_answering') return
    if (inputMode !== 'deepgram') return
    if (!dgListening) return
    armAnswerTimer('dg_listening')
  }, [phase, inputMode, dgListening, armAnswerTimer])

  useEffect(() => {
    if (phase === 'candidate_answering') return
    answerTimerArmedRef.current = false
    setAnswerTimerArmed(false)
  }, [phase])

  const handleManualAnswerEngage = useCallback(() => {
    if (phaseRef.current !== 'candidate_answering') return
    if (!useManualInputRef.current) return
    armAnswerTimer('text_input')
  }, [armAnswerTimer])

  const onStartupTtsEvent = useCallback(
    (event: 'tts_started' | 'tts_completed' | 'tts_failed', extra?: Record<string, unknown>) => {
      startupMarkRef.current(event, extra)
    },
    [],
  )

  const avatarSpeaking = useInterviewAvatarSpeaking({
    phase,
    setPhase,
    phaseRef,
    mountedRef,
    currentIndex,
    currentQuestion,
    interviewRole: interviewData?.role ?? '',
    totalQuestions,
    interviewerDisplayName,
    pendingFollowUp,
    inputMode,
    audioUnlocked: interviewAudio.isUnlocked,
    telemetryCtx,
    buildIntro: buildSessionIntro,
    speakQuestion,
    stopSpeaking,
    elSpeak,
    elStop,
    isSpeaking,
    elIsPlaying,
    currentWordIndex,
    lastVoiceMeta,
    onAvatarFinished: enterAnsweringPhase,
    onStartupTtsEvent,
  })

  const handleUnlockAudioGesture = useCallback(() => {
    startupMark('audio_unlock_started', { source: 'gesture_tap' })
    interviewAudio.unlock()
    startupMark('audio_unlock_success', { source: 'gesture_tap' })
    trackAvatarTelemetry('avatar_unlock_success', telemetryCtx, { mode: inputMode })
    track('INTERVIEW_FLOW', 'tts_gesture_unlocked', { mode: inputMode })
    if (phase === 'awaiting_audio_unlock' || phase === 'avatar_speaking') {
      setPhase('avatar_speaking')
    }
  }, [interviewAudio, phase, inputMode, startupMark, track, telemetryCtx])

  const {
    spokenText,
    awaitingAudioTap,
    showPlaybackRecovery,
    playbackFailureMessage,
    continueWithoutAudio,
    retryAudio,
    audioActuallyStarted,
    speakingProgressPct,
    avatarHeaderLabel,
  } = avatarSpeaking

  const audioActuallyStartedRef = useRef(false)
  const retryAudioRef = useRef(retryAudio)
  audioActuallyStartedRef.current = audioActuallyStarted
  retryAudioRef.current = retryAudio

  const captionWordIndex = useMemo(() => {
    if (!elIsPlaying || !spokenText) return currentWordIndex
    const words = spokenText.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return currentWordIndex
    return Math.min(words.length - 1, Math.floor(elPlaybackProgress * words.length))
  }, [elIsPlaying, elPlaybackProgress, currentWordIndex, spokenText])

  const [videoRecoverTick, setVideoRecoverTick] = useState(0)
  const onVisibleResume = useCallback(() => {
    setVideoRecoverTick((t) => t + 1)
  }, [])
  const onAvatarSpeakingResume = useCallback(() => {
    if (!audioActuallyStartedRef.current && phaseRef.current === 'avatar_speaking') {
      retryAudioRef.current()
    }
  }, [])
  useInterviewPwaLifecycle({
    phase,
    onVisibleResume,
    onAvatarSpeakingResume,
  })

  useEffect(() => {
    if (phase === 'awaiting_audio_unlock') {
      trackAvatarTelemetry('avatar_unlock_required', telemetryCtx, { mode: inputMode })
    }
  }, [phase, telemetryCtx, inputMode])

  const voiceUi = useInterviewVoiceUi({
    inputMode,
    useManualInput,
    isMicSupported,
    permissionState,
    recognitionState,
    micError,
    isListening,
    webSpeechActive,
    dgListening,
    sessionPhase: phase,
    micArmed,
    userMicMuted,
    micSessionState: micSession.micState,
    micFailed,
  })

  useEffect(() => {
    installInterviewDebug(() => ({
      phase,
      questionIndex: currentIndex,
      questionText: currentQuestion?.question_text ?? null,
      audio: {
        needsUnlock: interviewAudio.needsUnlock,
        unlocked: interviewAudio.isUnlocked,
        actuallyStarted: audioActuallyStarted,
        showRecovery: showPlaybackRecovery,
        failureMessage: showPlaybackRecovery ? playbackFailureMessage : null,
      },
      video: { speakingUiActive: audioActuallyStarted },
      mic: {
        label: voiceUi.label,
        phase: voiceUi.phase,
        permission: permissionState,
        recognition: recognitionState,
        inputMode,
        micState: micSession.micState,
        restartCount: micSession.restartCount,
        lastRestartAt: micSession.lastRestartAt,
        watchdogActive: micSession.watchdogActive,
      },
      ts: Date.now(),
    }))
  }, [
    phase,
    currentIndex,
    currentQuestion,
    interviewAudio.needsUnlock,
    interviewAudio.isUnlocked,
    audioActuallyStarted,
    showPlaybackRecovery,
    playbackFailureMessage,
    voiceUi,
    permissionState,
    recognitionState,
    inputMode,
    micSession,
  ])

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
    // Interview is over — no in-progress answer to recover. Clear the draft so a
    // reload of a finished interview never replays a stale question.
    clearDraft()
    track('REPORT_GENERATION', 'complete_started', {})
    try {
      const result = await api.post<{
        reportId?: string
        error?: string
        retention?: InterviewCompleteRetentionPayload | null
        funnelComplete?: FunnelCompleteGa4Payload
      }>('/api/interview/complete', { interviewId })
      // The user can navigate away during /api/interview/complete (it generates
      // a report — can take 3-8 s on slow providers). Bail if the page is gone.
      if (!mountedRef.current) {
        lifecycleWarn('session', 'complete_response_after_unmount')
        return
      }
      const reportId = result.data.reportId
      if (!reportId) {
        track(
          'REPORT_GENERATION',
          'complete_failed',
          { reason: 'no_report_id' },
          { critical: true, level: 'error' },
        )
        setFetchError(result.data.error ?? 'Report generation failed. Please try again.')
        setPhase('feedback')
        return
      }
      track('REPORT_GENERATION', 'complete_success', { reportId })
      if (result.data.funnelComplete) {
        void trackMockInterviewCompletedGa4(result.data.funnelComplete)
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
      if (!mountedRef.current) return
      track(
        'REPORT_GENERATION',
        'complete_failed',
        { reason: 'request_failed' },
        { critical: true, level: 'error' },
      )
      setFetchError('Report generation failed. Please try again.')
      setPhase('feedback')
    }
  }, [interviewId, router, track, clearDraft])

  // ─── Deepgram STT helpers ─────────────────────────────────
  // Ref so startDgListening's VAD callback can call handleSubmitAnswer without
  // a forward-reference (handleSubmitAnswer is declared after startDgListening).
  const handleSubmitAnswerRef = useRef<
    (source?: 'button' | 'timer' | 'vad' | 'watchdog') => Promise<void>
  >(() => Promise.resolve())
  // Same forward-reference pattern: the auto-flow effect calls handleNextQuestion
  // which is declared further down.
  const handleNextQuestionRef = useRef<() => void>(() => {})

  // Idempotent Deepgram teardown — delegates to hardened session controller.
  const stopDgListening = useCallback(() => {
    dgStartInFlightRef.current = false
    if (mountedRef.current) {
      setDgWsOpen(false)
      setDgVoiceUiState('idle')
      setDgVoiceUiMessage(null)
    }
    dgControllerRef.current?.stop()
    dgMicCleanupRef.current = null
  }, [])

  const startDgListening = useCallback(async (opts?: { preserveTranscript?: boolean; isRefresh?: boolean }) => {
    if (!mountedRef.current) {
      lifecycleWarn('session', 'dg_start_after_unmount_ignored')
      return
    }
    if (dgStartInFlightRef.current) {
      lifecycleWarn('session', 'dg_start_already_in_flight')
      return
    }
    if (dgControllerRef.current?.isActive()) {
      lifecycleWarn('session', 'dg_start_with_lingering_session_teardown_first')
      stopDgListening()
    }

    dgStartInFlightRef.current = true
    setDgError(null)
    setDgVoiceShowActions(false)
    if (!opts?.preserveTranscript) {
      setDgTranscript('')
      setDgInterim('')
    }

    if (!dgControllerRef.current) {
      dgControllerRef.current = new DeepgramSessionController(
        interviewId,
        telemetryCtx,
        track,
        {
          onPartial: (chunk) => {
            if (!mountedRef.current) return
            if (chunk.isFinal) {
              setDgTranscript((prev) => prev + chunk.text + ' ')
              setDgInterim('')
            } else {
              setDgInterim(chunk.text)
            }
          },
          onFinal: () => {
            if (phaseRef.current === 'candidate_answering' && mountedRef.current) {
              queueMicrotask(() => { void handleSubmitAnswerRef.current('vad') })
            }
            stopDgListening()
          },
          onWsOpen: () => {
            if (mountedRef.current) setDgWsOpen(true)
          },
          onRefreshRestart: () => {
            if (phaseRef.current !== 'candidate_answering') return
            const saved = `${dgTranscriptRef.current} ${dgInterimRef.current}`.trim()
            if (saved) {
              setDgTranscript(saved.endsWith(' ') ? saved : `${saved} `)
              setDgInterim('')
            }
            void startDgListeningRef.current({ preserveTranscript: true, isRefresh: true })
          },
          onUiState: (state, message) => {
            if (!mountedRef.current) return
            setDgVoiceUiState(state)
            setDgVoiceUiMessage(message)
          },
          onFatalError: (message, fatalOpts) => {
            if (!mountedRef.current) return
            if (resolvePreferredVoiceInputMode() === 'voice') {
              stopDgListening()
              setDgError(null)
              setDgVoiceShowActions(false)
              setInputMode('voice')
              clearStormBudgetForAnswer()
              clearRecognitionFailure()
              void startListening()
              return
            }
            setDgError(message)
            setDgVoiceShowActions(fatalOpts.canRetryVoice || fatalOpts.canSwitchToText)
          },
          onQuotaFallback: (message) => {
            if (!mountedRef.current) return
            setDgError(message)
            setInputMode('text')
            track('RECOVERY', 'deepgram_quota_fallback_text_mode', { interview_id: interviewId })
          },
          isMounted: () => mountedRef.current,
          startMic: async (sendAudio) => {
            startupMarkRef.current('mic_permission_started', { mode: 'deepgram' })
            const cleanup = await dgStartRecording(sendAudio)
            startupMarkRef.current('mic_permission_granted', { mode: 'deepgram' })
            dgMicCleanupRef.current = cleanup
            return cleanup
          },
          stopMic: () => {
            dgStopRecording()
          },
          releaseAudio: () => releaseAudioForMicCapture(),
        },
      )
    }

    try {
      startupMarkRef.current('deepgram_token_requested')
      await dgControllerRef.current.start({
        preserveTranscript: opts?.preserveTranscript,
        isRefresh: opts?.isRefresh,
      })
      lifecycleLog('session', 'dg_started')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start voice recording.'
      if (mountedRef.current) setDgError(msg)
      lifecycleWarn('session', 'dg_start_failed', { err: msg })
    } finally {
      dgStartInFlightRef.current = false
    }
  }, [
    dgStartRecording,
    dgStopRecording,
    interviewId,
    stopDgListening,
    telemetryCtx,
    track,
    startListening,
    clearStormBudgetForAnswer,
    clearRecognitionFailure,
  ])

  useEffect(() => {
    startDgListeningRef.current = startDgListening
    startListeningRef.current = startListening
  }, [startDgListening, startListening])

  // If post-avatar auto-start did not reach active capture, retry quietly.
  useEffect(() => {
    if (phase !== 'candidate_answering') return
    if (inputMode !== 'voice' || useManualInput || userMicMuted) return

    const attemptBootstrap = (source: string) => {
      if (phaseRef.current !== 'candidate_answering') return
      if (userMicMutedRef.current || useManualInputRef.current) return
      const state = recognitionStateRef.current
      if (state === 'active') {
        if (getMergedTranscript().trim().length > 0) return
      } else if (state === 'starting' && isListeningRef.current) {
        return
      }

      voiceDebug('mic_bootstrap_retry', { source, state })
      if (state === 'starting' && !isListeningRef.current) {
        stopListening('bootstrap_stuck_starting')
      }
      clearStormBudgetForAnswer()
      clearRecognitionFailure()
      void startListeningRef.current()
    }

    const t1 = window.setTimeout(() => attemptBootstrap('bootstrap_1_5s'), 1500)
    const t2 = window.setTimeout(() => attemptBootstrap('bootstrap_4s'), 4000)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [
    phase,
    currentIndex,
    inputMode,
    useManualInput,
    userMicMuted,
    stopListening,
    clearStormBudgetForAnswer,
    clearRecognitionFailure,
    getMergedTranscript,
  ])

  const handleSwitchToAiVoice = useCallback(async (source: string) => {
    if (phaseRef.current !== 'candidate_answering') return
    webSpeechFallbackLockedRef.current = true
    voiceDebug('switch_to_ai_voice', { source })
    track('VOICE', 'switch_to_deepgram', { source })
    stopListening('phase_change')
    stopDgListening()
    clearStormBudgetForAnswer()
    clearRecognitionFailure()
    setInputMode('deepgram')
    setUserMicMuted(false)
    await startDgListeningRef.current({ preserveTranscript: true })
  }, [
    stopListening,
    stopDgListening,
    clearStormBudgetForAnswer,
    clearRecognitionFailure,
    track,
  ])

  useEffect(() => {
    handleSwitchToAiVoiceRef.current = handleSwitchToAiVoice
  }, [handleSwitchToAiVoice])

  // Tear down cloud STT when Chrome/Edge should use browser speech-to-text.
  useEffect(() => {
    if (webSpeechFallbackLockedRef.current) return
    if (inputMode !== 'deepgram') return
    if (resolvePreferredVoiceInputMode() !== 'voice') return
    stopDgListening()
    setInputMode('voice')
  }, [inputMode, stopDgListening])

  // Cleanup Deepgram + lifecycle guards on unmount. Order matters:
  //   1. mark unmounted → every async callback already in flight bails on its
  //      next state-write attempt
  //   2. tear down the Deepgram socket + mic stream
  useEffect(() => {
    return () => {
      mountedRef.current = false
      dgStartInFlightRef.current = false
      dgControllerRef.current?.stop()
      dgControllerRef.current = null
      dgMicCleanupRef.current = null
      lifecycleLog('session', 'unmounted')
    }
  }, [])

  // ─── Submit Answer ────────────────────────────────────────
  const handleSubmitAnswer = useCallback(async (source: 'button' | 'timer' | 'vad' | 'watchdog' = 'button') => {
    if (phaseRef.current !== 'candidate_answering') {
      interviewLog('submit_blocked', {
        reason: 'wrong_phase',
        phase: phaseRef.current,
        source,
      })
      track('SUBMIT', 'submit_blocked', { reason: 'wrong_phase', blockedPhase: phaseRef.current, source })
      return
    }
    // Synchronous double-submit guard. The Submit button, the VAD onFinal
    // callback and the timer-out effect all converge here; without this,
    // two evaluations would be billed for the same answer and the second
    // would land after setPhase('submitting') already changed the phase.
    if (submitInFlightRef.current) {
      lifecycleWarn('session', 'submit_duplicate_ignored')
      interviewLog('submit_blocked', { reason: 'in_flight', source })
      track('SUBMIT', 'submit_blocked', { reason: 'in_flight', source })
      return
    }

    // Read the merged transcript BEFORE stopping the mic. resolveSubmittedText()
    // unions voice refs, manual input, and the display mirror.
    const durationSeconds = Math.round((Date.now() - answerStartTime) / 1000)
    const submittedText = resolveSubmittedText()

    // Empty-payload guard — block submission with explicit UI feedback rather
    // than sending "[No answer provided]" silently. The user can keep talking.
    if (!submittedText) {
      console.log('[speech] submit_blocked', { reason: 'empty_payload' })
      interviewLog('submit_blocked', {
        reason: 'empty_payload',
        source,
        useManualInput,
        displayLen: answerText.length,
        voiceLen: getMergedTranscript().length,
        manualLen: manualAnswer.trim().length,
      })
      // Critical: empty-payload blocks are a top mobile completion blocker —
      // beacon to the server so they are visible in production (Vercel only
      // sees HTTP status, and a blocked submit makes no API call at all).
      track(
        'SUBMIT',
        'submit_blocked',
        {
          reason: 'empty_payload',
          source,
          useManualInput,
          displayLen: answerText.length,
          voiceLen: getMergedTranscript().length,
          manualLen: manualAnswer.trim().length,
        },
        { critical: true, level: 'warn' },
      )
      setShowEmptyWarning(true)
      return
    }

    interviewLog('submit_started', {
      source,
      payload_length: submittedText.length,
      durationSeconds,
      mode: inputMode,
    })
    track('SUBMIT', 'submit_started', { source, payloadLength: submittedText.length, durationSeconds, mode: inputMode })
    console.log('[speech] submitted', { payload_length: submittedText.length, durationSeconds, mode: inputMode })

    submitInFlightRef.current = true
    setPhase('submitting')
    setShowEmptyWarning(false)
    stopTimer()
    voiceDebug('stop_listening_triggered', { source: 'submit', mode: inputMode })
    stopListening('answer_submitted')
    stopSpeaking()
    elStop()
    stopDgListening()

    const finalTranscript = submittedText
    const fillerAnalysis = analyzeFillerWords(finalTranscript, durationSeconds)

    // Only allow one orchestrator-driven follow-up per static question so the
    // interview length stays bounded (no infinite probe loops).
    const followUpAllowed = followUpForIndexRef.current !== currentIndex

    track('EVALUATION', 'evaluation_started', { source, mode: inputMode })

    // Bound the orchestrator (process-answer) fetch. It previously had NO client
    // timeout, so a hung mobile connection kept the evaluation Promise.all
    // pending indefinitely — the user stuck on "Analyzing…". The scoring call
    // already uses api.post's 60s AbortController budget; this matches the
    // server's 55s process-answer maxDuration.
    const orchestratorController = new AbortController()
    const orchestratorTimeout = setTimeout(() => orchestratorController.abort(), 55_000)

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
              signal: orchestratorController.signal,
            })
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
          : Promise.resolve(null),
      ])

      // Post-await mount/phase guard: the user can navigate or unmount while
      // /api/interview/answer + /api/interview/process-answer are in flight.
      // If so, drop the response on the floor rather than calling setState on
      // a torn-down tree (or worse, advancing a stale interview).
      //
      // Cast through SessionPhase to defeat TS control-flow narrowing from
      // the entry guard above. At runtime the ref *can* mutate during the
      // await, even though the type-checker has lost that information.
      const phaseAfterAwait = phaseRef.current as RuntimePhase
      if (!mountedRef.current) {
        lifecycleWarn('session', 'submit_response_after_unmount')
        return
      }
      if (phaseAfterAwait !== 'submitting') {
        lifecycleWarn('session', 'submit_response_phase_changed', { current: phaseAfterAwait })
        return
      }

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
      interviewLog('submit_success', {
        source,
        questionIndex: currentIndex,
        payload_length: finalTranscript.length,
      })
      track('SUBMIT', 'submit_success', { source, questionIndex: currentIndex, payloadLength: finalTranscript.length })
      track('EVALUATION', 'evaluation_succeeded', {
        source,
        hasFollowUp: followUpAllowed && orchestratorResult?.type === 'followup',
      })
      // Answer is persisted server-side — this question's in-progress work is
      // done. Clear the draft so a refresh now uses authoritative server state.
      clearDraft()
      setPhase('feedback')
    } catch {
      if (!mountedRef.current) return
      interviewLog('submit_failed', { source, questionIndex: currentIndex })
      // Critical: a failed evaluation is the visible "stuck after answering"
      // symptom — beacon it so mobile failures surface in the server log.
      track(
        'SUBMIT',
        'submit_failed',
        { source, questionIndex: currentIndex },
        { critical: true, level: 'error' },
      )
      track('EVALUATION', 'evaluation_failed', { source, questionIndex: currentIndex }, { critical: true, level: 'error' })
      // The submit path produced a (fallback) feedback turn; clear the draft so
      // we don't replay this answer on refresh.
      clearDraft()
      setLastFeedback('Unable to evaluate this answer. Moving to next question.')
      setLastFillerAnalysis(fillerAnalysis)
      setPhase('feedback')
    } finally {
      clearTimeout(orchestratorTimeout)
      // Always release the in-flight flag, even on early-bail or thrown error,
      // so subsequent attempts can proceed.
      submitInFlightRef.current = false
    }
  }, [
    inputMode,
    useManualInput,
    manualAnswer,
    answerText,
    resolveSubmittedText,
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
    track,
    clearDraft,
  ])

  const handleSubmitClick = useCallback(() => {
    interviewLog('submit_clicked', {
      answerLength: resolveSubmittedText().length,
      displayLength: answerText.length,
      phase: phaseRef.current,
    })
    void handleSubmitAnswer('button')
  }, [handleSubmitAnswer, resolveSubmittedText, answerText])

  // Keep ref current so startDgListening's onFinal callback always calls the
  // latest version of handleSubmitAnswer (avoids stale closure + forward-ref issue).
  useEffect(() => { handleSubmitAnswerRef.current = handleSubmitAnswer }, [handleSubmitAnswer])

  // ─── Draft persistence (audit P0 refresh safety) ──────────
  // Persist in-progress work while the candidate is actively answering — the
  // only window a refresh can destroy unsaved work. `answerText` in the deps
  // captures live transcript edits; `timeLeft` gives second-accurate timer
  // restore. Writes are cheap (one small JSON to localStorage) and idempotent.
  //
  // We deliberately do NOT persist avatar_speaking / submitting / feedback: a
  // refresh during those either re-asks the question (best UX) or — once the
  // answer is server-persisted — is discarded by reconciliation. Restricting to
  // candidate_answering also means clearDraft() on submit (phase → feedback) is
  // never re-overwritten by this effect.
  useEffect(() => {
    if (!interviewData) return
    if (phase !== 'candidate_answering') return
    persistDraft({
      interviewId,
      questionIndex: currentIndex,
      phase: phase as DraftPhase,
      transcript: resolveSubmittedText(),
      timerRemaining: timeLeft,
      timerBudget: answerTimeBudget,
      skipCount,
      pendingFollowUp: pendingFollowUp
        ? { text: pendingFollowUp.text, tone: pendingFollowUp.tone }
        : null,
      inputMode,
    })
  }, [
    interviewData, phase, currentIndex, timeLeft, answerTimeBudget, skipCount,
    pendingFollowUp, inputMode, answerText, resolveSubmittedText, persistDraft, interviewId,
  ])

  // beforeunload guard — only while there is genuine in-progress work, so a
  // stray refresh/close prompts a confirmation. The draft is already saved, so
  // even a confirmed unload is recoverable.
  useEffect(() => {
    const hasProgress = phase === 'candidate_answering' && answerText.trim().length > 0
    setDraftUnloadGuard(hasProgress)
  }, [phase, answerText, setDraftUnloadGuard])

  // ─── Resilience watchdogs (audit Phase 6) ─────────────────
  // Evaluation stall, follow-up advance stall, and answering-timer overrun all
  // auto-recover. Callbacks are ref-mirrored inside the hook so each watchdog
  // always invokes the latest handler with live state (no stale closures).
  useInterviewRecovery({
    phase,
    hasPendingFollowUp: Boolean(pendingFollowUp),
    answerBudgetSeconds: answerTimeBudget,
    track,
    onEvaluationTimeout: () => {
      if (phaseRef.current !== 'submitting') return
      // Unblock the user: release the in-flight guard and surface a graceful
      // fallback so a hung / very slow evaluation cannot strand "Analyzing…".
      submitInFlightRef.current = false
      setPendingFollowUp(null)
      setLastFeedback(
        "That answer took longer than usual to score — let's keep the interview moving.",
      )
      setPhase('feedback')
    },
    onQuestionAdvanceTimeout: () => {
      if (phaseRef.current !== 'feedback') return
      handleNextQuestionRef.current()
    },
    onAnsweringTimeout: () => {
      if (phaseRef.current !== 'candidate_answering') return
      void handleSubmitAnswerRef.current('watchdog')
    },
  })

  // ─── Timer runs out → auto submit ─────────────────────────
  useEffect(() => {
    if (timeLeft === 0 && phase === 'candidate_answering' && answerTimerArmed) {
      track('TIMER', 'timer_expired', {})
      void handleSubmitAnswer('timer')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, answerTimerArmed])

  // Emergency fallback: timer already expired but transcript arrived afterward
  // (common on iOS when the first timer tick fires before speech results land).
  useEffect(() => {
    if (timeLeft !== 0 || phase !== 'candidate_answering' || !answerTimerArmed) return
    if (!answerText.trim()) return
    void handleSubmitAnswer('timer')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, answerText, answerTimerArmed])

  // Watchdog: transcript exists but no submit request leaves the client within 5s
  // of the last transcript change.
  useEffect(() => {
    if (transcriptWatchdogRef.current) {
      clearTimeout(transcriptWatchdogRef.current)
      transcriptWatchdogRef.current = null
    }
    if (phase !== 'candidate_answering') return
    const current = answerText.trim()
    if (!current) return

    transcriptWatchdogRef.current = setTimeout(() => {
      if (phaseRef.current !== 'candidate_answering') return
      if (submitInFlightRef.current) return
      const payload = resolveSubmittedText().trim()
      if (!payload) return
      console.log('[INTERVIEW_STUCK_AFTER_TRANSCRIPT]', {
        answerLength: payload.length,
        questionIndex: currentIndex,
        timeLeft,
      })
      void handleSubmitAnswerRef.current('watchdog')
    }, 5000)

    return () => {
      if (transcriptWatchdogRef.current) {
        clearTimeout(transcriptWatchdogRef.current)
        transcriptWatchdogRef.current = null
      }
    }
  }, [phase, answerText, currentIndex, timeLeft, resolveSubmittedText])

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
  // Auto-dismiss once the user starts speaking again
  useEffect(() => {
    if (showEmptyWarning && answerText) setShowEmptyWarning(false)
  }, [showEmptyWarning, answerText])

  // ─── Next Question ────────────────────────────────────────
  const handleNextQuestion = useCallback(() => {
    interviewLog('advance_question', {
      fromIndex: currentIndex,
      hadFollowUp: Boolean(pendingFollowUp),
    })
    track('QUESTION_ADVANCE', 'advance_question', {
      fromIndex: currentIndex,
      hadFollowUp: Boolean(pendingFollowUp),
    })
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
      goToInterviewerTurn()
      return
    }

    const isLast = currentIndex >= interviewData.questions.length - 1

    if (isLast) {
      handleCompleteInterview()
      return
    }

    setCurrentIndex(prev => prev + 1)
    goToInterviewerTurn()
  }, [currentIndex, interviewData, pendingFollowUp, resetTranscript, handleCompleteInterview, track, goToInterviewerTurn])

  // Keep the ref current for the auto-flow effect (forward-reference).
  useEffect(() => { handleNextQuestionRef.current = handleNextQuestion }, [handleNextQuestion])

  // ─── Skip Question ────────────────────────────────────────
  const handleSkip = useCallback(() => {
    if (skipCount >= MAX_SKIPS || phase !== 'candidate_answering') return
    setSkipCount(prev => prev + 1)
    stopTimer()
    voiceDebug('stop_listening_triggered', { source: 'skip' })
    stopListening('phase_change')
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
    goToInterviewerTurn()
  }, [skipCount, phase, currentIndex, interviewData, stopTimer, stopListening, elStop, stopDgListening, resetTranscript, handleCompleteInterview, goToInterviewerTurn])

  // ─── Retry (re-speak current question) ───────────────────
  const handleRetry = useCallback(() => {
    if (phase !== 'candidate_answering') return
    voiceDebug('retry_triggered', { source: 'retry_question_button' })
    stopListening('phase_change')
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
    goToInterviewerTurn()
  }, [phase, stopListening, elStop, stopDgListening, resetTranscript, stopTimer, resetTimer, goToInterviewerTurn])

  const handleSwitchToTyping = useCallback(() => {
    if (phase !== 'candidate_answering') return
    stopListening('phase_change')
    elStop()
    stopDgListening()
    const voice = getMergedTranscript().trim()
    if (voice) {
      setManualAnswer(voice)
      restoreTranscript(voice)
    }
    setInputMode('text')
    voiceRecovery.dismissToTyping()
  }, [
    phase,
    stopListening,
    elStop,
    stopDgListening,
    getMergedTranscript,
    restoreTranscript,
    voiceRecovery,
  ])

  // ─── Toggle Mic ───────────────────────────────────────────
  const handleStartMic = () => {
    if (phase !== 'candidate_answering') return
    if (!isMicSupported) return
    voiceDebug('start_listening_triggered', { source: 'user_mic_tap' })
    setUserMicMuted(false)
    clearStormBudgetForAnswer()
    clearRecognitionFailure()
    trackMicTelemetry('mic_started', telemetryCtx, { mode: 'web_speech', source: 'user_tap' })
    if (recognitionState === 'starting' && !isListening) {
      stopListening('user_retry_stuck_starting')
    }
    const ok = startListeningFromUserGesture()
    if (ok && voiceRecovery.isActive) {
      voiceRecovery.markSuccess()
    }
  }

  const handleToggleMic = async () => {
    if (phase !== 'candidate_answering') return
    if (!isMicSupported) return
    if (!userMicMuted) {
      voiceDebug('stop_listening_triggered', { source: 'toggle_mic_off' })
      setUserMicMuted(true)
      stopListening('user_mute')
      return
    }
    voiceDebug('start_listening_triggered', { source: 'toggle_mic_on' })
    setUserMicMuted(false)
    clearStormBudgetForAnswer()
    clearRecognitionFailure()
    trackMicTelemetry('mic_restarted', telemetryCtx, { source: 'toggle_mic_on' })
    if (recognitionState === 'starting' && !isListening) {
      stopListening('user_retry_stuck_starting')
    }
    startListeningFromUserGesture()
  }

  const handleTryVoiceAgain = async () => {
    if (!isMicSupported) return
    const ok = await retryPermission()
    if (ok) {
      setInputMode('voice')
      setUserMicMuted(false)
      clearStormBudgetForAnswer()
      trackMicTelemetry('mic_restarted', telemetryCtx, { source: 'try_voice_again' })
      await startListening()
    }
  }

  const handleResumeVoiceInterview = useCallback(async () => {
    if (phase !== 'candidate_answering' || !voiceRecovery.isActive) return
    voiceRecovery.trackResumeClicked()
    voiceRecovery.markResuming()

    const { savedMode, transcript: savedTranscript } = voiceRecovery.state
    const resumeMode = resolvePreferredVoiceInputMode()

    try {
      if (interviewAudio.needsUnlock && !interviewAudio.isUnlocked) {
        interviewAudio.unlock()
      }
      await resumeSharedInterviewAudioContext()

      if (resumeMode === 'deepgram' && savedMode === 'deepgram') {
        setInputMode('deepgram')
        setDgTranscript(savedTranscript)
        setDgInterim('')
        setManualAnswer('')
        await startDgListeningRef.current({ preserveTranscript: true })
        if (!mountedRef.current) return
        if (!dgControllerRef.current?.isActive()) {
          voiceRecovery.markFailed(
            'Could not connect voice service. Check your connection and try again, or continue typing.',
          )
          return
        }
        voiceRecovery.markSuccess()
        return
      }

      setInputMode('voice')
      restoreTranscript(savedTranscript)
      setManualAnswer('')
      clearStormBudgetForAnswer()
      clearRecognitionFailure()
      setUserMicMuted(false)
      const ok = await startListening()
      if (!ok) {
        const reason =
          permissionStateRef.current === 'denied'
            ? 'Microphone permission was denied. Allow access in browser settings, or continue typing.'
            : micErrorRef.current ??
              'Could not start the microphone. Close other apps using the mic and try again.'
        voiceRecovery.markFailed(reason)
        return
      }
      voiceRecovery.markSuccess()
    } catch (err) {
      voiceRecovery.markFailed(
        err instanceof Error ? err.message : 'Voice setup failed. Try again or continue typing.',
      )
    }
  }, [
    phase,
    voiceRecovery,
    interviewAudio,
    restoreTranscript,
    clearStormBudgetForAnswer,
    clearRecognitionFailure,
    startListening,
  ])

  const handleContinueTypingFromRecovery = useCallback(() => {
    if (!voiceRecovery.isActive) return
    voiceRecovery.trackContinueTyping()
    const savedTranscript = voiceRecovery.state.transcript
    setInputMode('text')
    setManualAnswer(savedTranscript)
    if (voiceRecovery.state.savedMode === 'voice') {
      restoreTranscript(savedTranscript)
    } else {
      setDgTranscript(savedTranscript)
      setDgInterim('')
    }
    voiceRecovery.dismissToTyping()
  }, [voiceRecovery, restoreTranscript])

  useEffect(() => {
    if (phase === 'candidate_answering' && voiceRecovery.isActive) {
      voiceRecovery.trackBannerShown()
    }
  }, [phase, voiceRecovery])

  // ─── Loading / Error States ───────────────────────────────
  if (fetchError) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4"
           style={{ background: 'var(--page-gradient)' }}>
        <div className="dashboard-premium-card max-w-md space-y-4 p-8 text-center">
          <p className="text-(--accent-danger) font-semibold">{fetchError}</p>
          <InterviewStartupRecoveryPanel
            onRetry={handleStartupRetry}
            onReconnect={handleStartupReconnect}
            onSwitchToTyping={handleStartupSwitchToTyping}
          />
          <button
            onClick={() => router.back()}
            className="w-full rounded-xl border border-(--card-border) bg-(--bg-secondary) px-6 py-2
                       text-sm font-semibold text-(--text-primary)"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'loading' || !interviewData || !currentQuestion) {
    if (questionGenActive) {
      return (
        <InterviewQuestionGenLoading
          role={prepareContext?.role ?? interviewData?.role}
          interviewerId={prepareContext?.interviewerId ?? interviewData?.interviewerId}
        />
      )
    }

    // Startup-step-specific message. Each label corresponds to exactly one
    // state in the StartupStep machine — the user sees deterministic
    // progress instead of a generic "loading" spinner.
    const startupLabel = getStartupLoadingExplanation({
      questionGenActive,
      startupStep,
      audioInitError,
      loadingMessage,
    })
    const startupSubtext = getStartupSubtext({
      questionGenActive,
      showRecovery: false,
      audioInitError,
    })
    return (
      <div className="flex min-h-dvh items-center justify-center p-4"
           style={{ background: 'var(--page-gradient)' }}>
        <div className="dashboard-premium-card w-full max-w-sm space-y-4 p-6 text-center sm:p-8">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full
                          border-2 border-(--accent-primary) border-t-transparent" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-(--text-primary)">{startupLabel}</p>
            {startupSubtext ? (
              <p className="text-xs text-(--text-muted)">{startupSubtext}</p>
            ) : null}
          </div>
          {audioInitError ? (
            <div className="space-y-2">
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {audioInitError}
              </p>
              <button
                type="button"
                onClick={() => {
                  setAudioInitError(null)
                  setAudioReady(false)
                  setStartupStep('initializing_audio')
                }}
                className="rounded-lg border border-(--card-border) bg-(--bg-secondary)
                           px-3 py-1.5 text-xs font-semibold text-(--text-primary)
                           hover:bg-(--bg-tertiary)"
              >
                Retry audio setup
              </button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  if (phase === 'completed') {
    return (
      <>
        <div
          className="flex min-h-dvh items-center justify-center"
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

  const renderTotalQuestions = interviewData.questions.length
  const sessionProgressPct = Math.round(
    ((currentIndex + 1) / renderTotalQuestions) * 100,
  )
  const hasAnswerPayload = Boolean(answerText.trim())
  const canSubmitAnswer = phase === 'candidate_answering' && hasAnswerPayload
  /** Deepgram voice channel failed — Web Speech uses micFailed banner instead. */
  const showMicFailureEscape =
    phase === 'candidate_answering' &&
    inputMode === 'deepgram' &&
    dgVoiceShowActions

  return (
    <>
      <div
        className="flex h-full min-h-0 w-full min-w-0 flex-col lg:px-0"
        style={{ background: 'var(--page-gradient)' }}
      >

        {/* ── Top Bar ── */}
        <div className="grid w-full min-w-0 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-(--card-border)/50 px-3 py-2 sm:gap-3 lg:px-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest
                          text-(--text-muted)">
              INTERVIEW SESSION
            </p>
            <h1 className="text-lg font-bold text-(--text-primary) sm:text-xl">
              Focus Mode
            </h1>
            <p className="text-[11px] text-(--text-secondary)">
              Mode: {interviewData.questions[0]?.category === 'technical' ? 'Technical' : 'HR'}&nbsp;·&nbsp;
              Skips used: {skipCount} / {MAX_SKIPS}
            </p>
          </div>

          {/* Timer — centered */}
          <div className="flex shrink-0 items-center justify-center gap-2 sm:gap-2.5">
            <span className="text-xs font-semibold text-(--text-secondary) sm:text-sm">
              Progress :
            </span>
            <div className="shrink-0">
              {phase === 'candidate_answering' && answerTimerArmed ? (
                <TimerCircle
                  timeLeft={timeLeft}
                  totalTime={answerTimeBudget}
                  size={72}
                />
              ) : phase === 'candidate_answering' ? (
                <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 border-(--bg-tertiary)">
                  <span className="text-xs text-(--text-muted) text-center leading-tight px-1.5">
                    Your turn
                  </span>
                </div>
              ) : (
                <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 border-(--bg-tertiary)">
                  <span className="text-xs text-(--text-muted) text-center leading-tight px-1.5">
                    {progressRingLabel(phase, { speakingProgressPct })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar + Exit — right */}
          <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
            <div className="w-24 sm:w-28 xl:w-36">
              <div className="flex justify-between text-[10px] text-(--text-muted) mb-0.5">
                <span>Question {currentIndex + 1} of {renderTotalQuestions}</span>
                <span>{sessionProgressPct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-(--bg-tertiary)">
                <div
                  className="h-full rounded-full bg-(--accent-primary) transition-all duration-500"
                  style={{ width: `${sessionProgressPct}%` }}
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
        <div className="grid min-h-0 min-w-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[min(340px,100%)_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)] lg:divide-x lg:divide-(--card-border)/60">

          {/* ── LEFT: Interviewer + Candidate (50/50) ── */}
          <div className="flex min-h-0 flex-col divide-y divide-(--card-border)/60 overflow-hidden">

            {/* Interviewer — top half */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="session-flush-panel dashboard-premium-card flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between border-b border-(--card-border) px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-primary)/25 bg-(--accent-primary)/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-(--accent-primary)">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--accent-primary)" />
                      AI Interviewer
                    </span>
                    {audioActuallyStarted && (
                      <span className="flex items-center gap-1 rounded-full bg-(--accent-primary)/15 px-2 py-0.5 text-[10px] font-semibold text-(--accent-primary)">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--accent-primary)" />
                        Speaking
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-(--text-secondary)">
                    {avatarHeaderLabel}
                  </span>
                </div>

                <div className="relative min-h-0 flex-1">
                  <AvatarPlayer
                    key={`${resolvedInterviewerId}-${videoRecoverTick}`}
                    interviewerId={resolvedInterviewerId as InterviewerId}
                    isSpeaking={audioActuallyStarted}
                    telemetryCtx={telemetryCtx}
                    objectFit="contain"
                    fillContainer
                    className="bg-(--bg-secondary)"
                  />
                  {awaitingAudioTap && (
                    <button
                      type="button"
                      onClick={handleUnlockAudioGesture}
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/45 px-6 text-center backdrop-blur-[2px]"
                      aria-label="Tap to hear the interviewer ask the question"
                    >
                      <span className="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-(--text-primary) shadow-lg">
                        Tap to hear the question
                      </span>
                      <span className="max-w-[16rem] text-xs text-white/90">
                        Required on iPhone so {resolvedInterviewer?.name ?? 'Priya'} can speak before you answer.
                      </span>
                    </button>
                  )}
                  {showPlaybackRecovery && phase === 'avatar_speaking' && (
                    <div className="absolute inset-x-0 bottom-0 z-10 space-y-2 border-t border-amber-200/80 bg-amber-50/95 p-3 backdrop-blur-sm">
                      <p className="text-xs font-medium text-amber-900">
                        {playbackFailureMessage}
                      </p>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={retryAudio}
                          className="rounded-lg border border-(--accent-primary) bg-white px-3 py-2 text-xs font-semibold text-(--accent-primary)"
                        >
                          Retry Audio
                        </button>
                        <button
                          type="button"
                          onClick={continueWithoutAudio}
                          className="rounded-lg bg-(--accent-primary) px-3 py-2 text-xs font-semibold text-white"
                        >
                          Continue Without Audio
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <p className="shrink-0 border-t border-(--card-border)/60 px-4 py-2 text-[11px] text-(--text-secondary)">
                  Interviewer: {resolvedInterviewer?.name ?? 'Priya'}
                </p>
              </div>
            </div>

            {/* Candidate — bottom half */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CandidatePreview
                cameraActive={
                  phase === 'candidate_answering' ||
                  phase === 'submitting' ||
                  phase === 'feedback'
                }
                isListening={isListening || webSpeechActive || dgListening}
                micArmed={micArmed}
                userMicMuted={userMicMuted}
                questionLabel={avatarHeaderLabel}
              />
            </div>
          </div>

          {/* ── RIGHT: Answer Panel ── */}
          <div className="flex min-h-0 min-w-0 flex-col gap-0 divide-y divide-(--card-border)/60 overflow-hidden">

            {/* Candidate transcript / answer area */}
            <div className="session-flush-panel dashboard-premium-card flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden p-4">

              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">

              {phase === 'candidate_answering' && currentQuestion && (
                <div className="shrink-0 rounded-xl border border-(--card-border)/60 bg-(--bg-secondary)/40 p-3 sm:p-4">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                    Current Question
                  </p>
                  <p className="text-sm leading-relaxed text-(--text-primary)">
                    {currentQuestion.question_text}
                  </p>
                </div>
              )}

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
                      {dgListening
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
                        {dgListening
                          ? 'Listening…'
                          : dgVoiceUiState === 'retrying'
                            ? (dgVoiceUiMessage ?? 'Voice service is temporarily busy. Retrying automatically…')
                            : dgVoiceUiState === 'reconnecting'
                              ? 'Reconnecting voice channel…'
                              : dgVoiceUiState === 'connecting'
                                ? 'Connecting voice channel…'
                                : dgIsRecording
                                  ? 'Connecting voice channel…'
                                  : 'Waiting for microphone…'}
                      </p>
                    )}
                  </div>
                  <DeepgramVoiceStatusBanner
                    uiState={dgVoiceUiState}
                    message={dgVoiceUiMessage}
                    errorMessage={dgVoiceShowActions ? dgError : null}
                    showActions={dgVoiceShowActions}
                    onRetryVoice={() => {
                      setDgError(null)
                      setDgVoiceShowActions(false)
                      void startDgListening({ preserveTranscript: true })
                    }}
                    onSwitchToText={() => {
                      stopDgListening()
                      setDgError(null)
                      setDgVoiceShowActions(false)
                      setInputMode('text')
                    }}
                  />
                  {!dgVoiceShowActions && dgError && (
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

              {phase === 'candidate_answering' && micFailed && (
                <div className="session-flush-panel dashboard-premium-card space-y-2 p-4 border border-amber-200/80 bg-amber-50/80">
                  <p className="text-sm font-medium text-amber-900">
                    Voice connection lost. Tap Retry Mic or type your answer.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => { void handleStartMic() }}
                      className="flex-1 rounded-lg border border-(--accent-primary) bg-white px-4 py-2 text-sm font-semibold text-(--accent-primary)"
                    >
                      Retry microphone
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleSwitchToAiVoice('mic_failed_banner') }}
                      className="flex-1 rounded-lg border border-(--accent-primary) bg-white px-4 py-2 text-sm font-semibold text-(--accent-primary)"
                    >
                      Use AI Voice
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('text')}
                      className="flex-1 rounded-lg bg-(--accent-primary) px-4 py-2 text-sm font-semibold text-white"
                    >
                      Type answer
                    </button>
                  </div>
                </div>
              )}

              {phase === 'candidate_answering' && !useManualInput && inputMode !== 'deepgram' && !micFailed && (
                <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
                  <CandidateTranscript
                    transcript={transcript}
                    interimTranscript={interimTranscript}
                    isListening={isListening}
                    recognitionState={recognitionState}
                    isSupported={isMicSupported}
                    error={micError}
                    permissionState={permissionState}
                    micArmed={micArmed}
                    userMicMuted={userMicMuted}
                    fillHeight
                    hideMicToggle
                    onToggle={() => { void handleToggleMic() }}
                    onRetry={() => { void handleStartMic() }}
                  />
                </div>
              )}

              {phase === 'candidate_answering' && useManualInput && (
                <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col space-y-2">
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
                    onFocus={handleManualAnswerEngage}
                    onChange={(event) => {
                      setManualAnswer(event.target.value)
                      handleManualAnswerEngage()
                    }}
                    placeholder="Type your answer here..."
                    className="box-border block min-h-0 flex-1 min-w-0 w-full max-w-full resize-none overflow-y-auto rounded-xl border border-(--card-border) bg-(--card-bg) p-3 text-sm leading-relaxed text-(--text-primary) outline-none focus:border-(--accent-primary)"
                  />
                </div>
              )}

              {phase === 'avatar_speaking' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
                >
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--accent-primary)/40" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-(--accent-primary)" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-(--text-secondary)">
                      {interviewerDisplayName} is speaking
                    </span>
                  </div>

                  <CaptionDisplay
                    fullText={spokenText || currentQuestion.question_text}
                    currentWordIndex={captionWordIndex}
                  />

                  <p className="shrink-0 text-center text-[11px] text-(--text-muted)">
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
            </div>

            {/* ── Voice recovery after page refresh ── */}
            {phase === 'candidate_answering' && voiceRecovery.isActive && (
              <VoiceRecoveryBanner
                phase={voiceRecovery.state.phase}
                savedMode={voiceRecovery.state.savedMode}
                error={voiceRecovery.state.error}
                resuming={voiceRecovery.state.phase === 'resuming'}
                onResumeVoice={() => { void handleResumeVoiceInterview() }}
                onContinueTyping={handleContinueTypingFromRecovery}
                onRetry={() => { void handleResumeVoiceInterview() }}
              />
            )}

            {/* ── Empty-payload warning (timer/auto-submit fallback only) ── */}
            {phase === 'candidate_answering' && showEmptyWarning && !hasAnswerPayload && (
              <div className="session-flush-panel dashboard-premium-card w-full min-w-0 border border-amber-300 bg-amber-50/70 p-3">
                <p className="text-xs font-semibold text-amber-800">
                  We didn&apos;t catch your answer yet. Please speak (or type) before submitting.
                </p>
              </div>
            )}

            {/* ── Safety escape: Deepgram voice failure only (Web Speech → micFailed banner) ── */}
            {showMicFailureEscape && (
              <div className="session-flush-panel dashboard-premium-card w-full min-w-0 p-4">
                <p className="mb-2 text-xs text-(--text-secondary)">
                  Voice connection lost. Retry the mic, switch mode, or type your answer.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {hasAnswerPayload && (
                  <button
                    type="button"
                    onClick={handleSubmitClick}
                    className="flex-1 rounded-lg bg-(--accent-primary) py-2 text-xs
                               font-semibold text-white hover:bg-(--accent-hover)"
                  >
                    Submit my answer now
                  </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { void handleSwitchToAiVoice('stuck_escape') }}
                    className="rounded-lg border border-(--accent-primary) bg-white px-3 py-2
                               text-xs font-semibold text-(--accent-primary)
                               hover:bg-(--accent-primary)/5"
                  >
                    Use AI Voice
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Retry mic must FULLY rebuild the pipeline cleanly, not
                      // just hide the warning. For Web Speech this means
                      // stopListening() → startListening() so the generation
                      // token bumps and the previous (possibly stalled)
                      // recognition instance is torn down before a fresh one
                      // is created. Previously this button was a no-op for
                      // Web Speech mode and only restarted Deepgram.
                      voiceDebug('retry_triggered', { source: 'stuck_escape_retry_mic', mode: inputMode })
                      if (inputMode === 'deepgram') {
                        stopDgListening()
                        void startDgListening()
                      } else {
                        void handleStartMic()
                      }
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

            {phase === 'candidate_answering' &&
              !useManualInput &&
              inputMode === 'voice' &&
              !micFailed &&
              !isListening &&
              !userMicMuted &&
              recognitionState === 'idle' && (
              <div className="session-flush-panel flex shrink-0 items-center justify-center gap-2 border-t border-(--card-border)/60 bg-(--accent-primary)/5 px-4 py-2.5 text-xs font-medium text-(--accent-primary)">
                <Mic size={14} aria-hidden />
                Tap the mic button below to start your answer
              </div>
            )}

            {/* ── Control Bar ── */}
            {/* Safe-area inset so the submit row clears the iOS home indicator /
                gesture bar in Safari + standalone PWA (audit mobile issue #7). */}
            <div
              className="session-flush-panel dashboard-premium-card w-full min-w-0 shrink-0 p-3 sm:p-4"
              style={{
                paddingBottom: `calc(1rem + env(safe-area-inset-bottom) + ${keyboardBottomInset}px)`,
              }}
            >
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
                  {voiceUi.showListeningIndicator
                    ? <><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> {voiceUi.label}</>
                    : voiceUi.phase === 'starting_microphone' || micArmed
                      ? <><Mic size={12} className={voiceUi.phase === 'starting_microphone' ? 'animate-pulse' : ''} /> {voiceUi.label}</>
                      : <><MicOff size={12} /> {voiceUi.label}</>
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
              {/* ElevenLabs TTS errors (Deepgram mode) — same amber surface
                  as browser TTS errors so the user has a single place to
                  notice voice degradation regardless of which engine is in
                  play. The hook resets the error at the start of every
                  successful speak, so this banner self-clears on the next
                  question if the underlying issue (quota, upstream) resolves. */}
              {inputMode === 'deepgram' && elTtsError && (
                <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {elTtsError}
                </p>
              )}

              <div className="flex items-center gap-3">
                {inputMode !== 'text' && (
                  <button
                    type="button"
                    onClick={handleSwitchToTyping}
                    className="rounded-xl border border-(--card-border) bg-(--bg-secondary) px-3 py-2 text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary)"
                    title="Switch to typing your answer"
                  >
                    Type answer
                  </button>
                )}
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
                                 ${isListening && !userMicMuted
                                   ? 'border-(--accent-danger)/40 bg-(--accent-danger)/10 text-(--accent-danger)'
                                   : 'border-(--card-border) bg-(--bg-secondary) text-(--text-secondary)'
                                 }`}
                  >
                    {isListening && !userMicMuted ? <Mic size={18} className="animate-pulse" /> : <MicOff size={18} />}
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
                  onClick={handleSubmitClick}
                  disabled={!canSubmitAnswer}
                  title={!hasAnswerPayload ? 'Speak or type your answer first' : undefined}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl
                             py-3 text-sm font-semibold transition-all duration-200
                             disabled:cursor-not-allowed
                             ${canSubmitAnswer
                               ? 'text-white hover:opacity-95'
                               : 'text-(--text-secondary)'}`}
                  style={{
                    background: canSubmitAnswer
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
    {celebrationDialog}
    </>
  )
}
