'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { AvatarPlayer } from '@/components/avatar/AvatarPlayer'
import { CaptionDisplay } from '@/components/avatar/CaptionDisplay'
import { TimerCircle } from '@/components/interview/TimerCircle'
import { CandidatePreview } from '@/components/interview/CandidatePreview'
import { getInterviewerById } from '@/lib/config/interviewers'
import type { InterviewerId } from '@/lib/config/interviewers'
import type { ScriptType } from '@/lib/ai/scripts/script-loader'
import type { ScriptInterviewSession, ScriptTurnOutput } from '@/types/script-interview'
import {
  IE_ALERT_BANNER_CLASS,
  IE_ALERT_ERROR_STYLE,
  IE_ALERT_WARNING_STYLE,
  IE_SPINNER_LG_CLASS,
  IE_FOCUS_VISIBLE,
  IE_TRANSITION_COLORS,
} from '@/lib/theme/component-classes'
import { SkipForward, Send, X, RotateCcw, Mic, MicOff, Radio } from 'lucide-react'
import { useVoicePlayer } from '@/hooks/useVoicePlayer'
import { useMicrophone } from '@/hooks/useMicrophone'
import { useInterviewAudio } from '@/hooks/useInterviewAudio'
import { useTimer } from '@/hooks/useTimer'
import { useInterviewTelemetry } from '@/hooks/useInterviewTelemetry'
import { DeepgramSessionController } from '@/lib/voice/deepgram-session-controller'
import type { DeepgramSessionCallbacks } from '@/lib/voice/deepgram-session-controller'
import type { VoiceConnectionState } from '@/lib/voice/deepgram-health'
import type { TranscriptChunk } from '@/lib/voice/stt-client'
import { releaseAudioForMicCapture } from '@/lib/voice/audio-gesture'
import {
  createScriptSessionPrepController,
  probeMicrophoneReadiness,
  PREP_CHECKLIST,
  type PrepSnapshot,
  type ScriptSessionPrepController,
} from '@/lib/interview/script-session-prep'
import { buildReviewLoadTurnPayload } from '@/lib/interview/build-review-load-turn-payload'
import {
  claimBootTurnApply,
  decideBootTurnFetch,
  releaseBootTurnApplyClaim,
  shouldFallbackLoadFirstTurn,
} from '@/lib/interview/script-boot-guard'
import { interviewFlowLog } from '@/lib/voice/interview-flow-log'
import { fetchSTTTokenWithRetry, releaseSTTSession, clearCachedSTTToken } from '@/lib/voice/stt-token'
import {
  classifyMicStartError,
  micFallbackMessageForKind,
  type MicStartErrorClassification,
  type MicStartErrorKind,
} from '@/lib/interview/mic-error-classification'
import { interviewTelemetry } from '@/lib/telemetry/interview-telemetry'
import { ReviewAnswerHighlightEditor } from '@/components/interview/ReviewAnswerHighlightEditor'
import { AnswerScoreCard, type AnswerScore } from '@/components/interview/AnswerScoreCard'

// ── iOS browser detection ──────────────────────────────────────────────────────
// Apple forces all iOS browsers (CriOS/Chrome, FxiOS/Firefox, OPiOS/Opera, etc.)
// to use WebKit, but ONLY Safari has permission to call getUserMedia() for the
// microphone. Every other iOS browser throws NotSupportedError immediately.
const IS_IOS =
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) // iPad iOS 13+

const IS_IOS_SAFARI =
  IS_IOS &&
  typeof navigator !== 'undefined' &&
  /Safari/.test(navigator.userAgent) &&
  !/CriOS|FxiOS|OPiOS|EdgiOS|DuckDuckGo|Brave|mercury/.test(navigator.userAgent)

/** True on Chrome/Firefox/etc on iOS — mic access not possible, skip all voice attempts. */
const VOICE_UNSUPPORTED_ON_THIS_BROWSER = IS_IOS && !IS_IOS_SAFARI

const SCRIPT_TYPE_LABEL: Record<ScriptType, string> = {
  SCRIPT_T: 'Technical',
  SCRIPT_H: 'HR / Behavioral',
  SCRIPT_M: 'Mixed',
}

/**
 * v2.1 script-engine interview page — Phase 3A: text-only.
 *
 * No TTS / STT / timer yet (those arrive in Phase 3B). The page drives the
 * turn-by-turn LLM loop entirely through typed answers and auto-advancing
 * non-question turns.
 */
type UIPhase =
  | 'loading'
  | 'awaiting_audio_unlock' // iOS Safari: tap gesture required before TTS can play
  | 'turn_loading'
  | 'turn_ready'
  | 'thinking'          // post-TTS: candidate reads question + countdown before timer
  | 'candidate_answering'
  | 'submitting'
  | 'review'            // structured-answer review popup is open
  | 'auto_turn'
  | 'completed'

type StructuredAnswer = {
  corrected_transcript: string
  coaching_reference: {
    feedback: string
    restructured_example: string[]
    technical_terms: Array<{ term: string; definition: string; pronunciation?: string }>
    missing_elements: string[]
  }
}

const AUTO_ADVANCE_MS = 1_500

/**
 * Dedup parallel boot `[NONE]` turn fetches across React Strict Mode remounts.
 * Keyed by interviewId — second mount awaits the same promise instead of racing
 * another insert of turn_index=1 (unique constraint 23505).
 */
const inFlightBootTurnByInterview = new Map<string, Promise<TurnApiResponse>>()

type LoadTurnParams = {
  lastAnswer: string
  prevTurnIndex?: number
  submittedAs?: 'raw' | 'corrected' | 'auto_submit'
  /** Original STT text for write-once raw_transcript (never overwritten by corrected submit). */
  sttRawTranscript?: string
  /**
   * When set, sent as `currentPhase` instead of reading currentPhaseRef.
   * Used by review-step next-turn prefetch: phase advances on Continue, but
   * the /turn request must already use the *next* phase while feedback is open.
   */
  requestPhase?: string
}

/** In-flight / completed next-turn fetch started on Approve (feedback step). */
type NextTurnPrefetch = {
  params: LoadTurnParams
  promise: Promise<TurnApiResponse>
  result: TurnApiResponse | null
  error: unknown
}

type TurnApiResponse = {
  turn: ScriptTurnOutput
  turnIndex: number
  interviewId: string
}

export default function ScriptInterviewPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const interviewId = params.id

  const [uiPhase, setUiPhase] = useState<UIPhase>('loading')
  const [interview, setInterview] = useState<ScriptInterviewSession | null>(null)
  const [currentTurn, setCurrentTurn] = useState<ScriptTurnOutput | null>(null)
  const [_currentTurnIndex, setCurrentTurnIndex] = useState<number>(0)
  const [answerText, setAnswerText] = useState<string>('')
  const [questionNumber, setQuestionNumber] = useState<number>(0)
  const [currentPhase, setCurrentPhase] = useState<string>('warmup')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Recursion + timers use refs to stay free of stale closures across renders.
  const loadTurnRef = useRef<(p: LoadTurnParams) => Promise<void>>(async () => {})
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryRef = useRef<(() => void) | null>(null)
  const consecutiveAutoTurnsRef = useRef(0)
  // Synchronous source of truth for the core-question count — setState is async
  // and would let two loadTurn calls race on a stale `questionNumber`.
  const questionNumberRef = useRef(0)
  // Same rationale as questionNumberRef: handleSubmit/handleSkip and the
  // auto-advance timeout must never read a stale currentPhase/currentTurnIndex
  // from a closure captured before the latest setState landed.
  const currentPhaseRef = useRef<string>('warmup')
  const currentTurnIndexRef = useRef<number>(0)
  // Tracks whether the most recently received turn was a question — drives
  // getNextPhase's "only advance on an answered question" rule.
  const lastTurnWasQuestionRef = useRef<boolean>(false)
  // True once the first turn has ever been displayed — drives whether
  // turn_loading shows the branded prep screen (first load) or a bare
  // spinner (subsequent turns, where a full prep screen would be redundant).
  const [firstTurnShown, setFirstTurnShown] = useState(false)
  // True once the mic has connected at least once this session — separate
  // from firstTurnShown because turn_ready fires (and flips that flag)
  // well before TTS finishes and the mic actually starts connecting, so
  // firstTurnShown alone can't gate the "first connect" status label.
  const [firstMicConnected, setFirstMicConnected] = useState(false)
  // Mirrors `interview` state for reads inside loadTurn/submitAnswer. Those
  // callbacks must not depend on `interview` directly — including it in their
  // useCallback deps recreates the callback (and everything chained through
  // loadTurnRef) the moment setInterview(row) lands, which is exactly the
  // kind of identity churn that can cascade into a duplicate boot/kickoff.
  const interviewRef = useRef<ScriptInterviewSession | null>(null)
  // Guards the very first loadTurn('[NONE]', 'warmup', 0) call so it can
  // never fire twice for one mounted session.
  const bootCalledRef = useRef(false)
  // Preserve Deepgram session lease across question boundaries so each turn
  // reconnect is a refresh (not a new-mint rate-limit slot). Cleared on
  // unmount / hard release.
  const dgLeaseIdRef = useRef<string | null>(null)
  // Wall-clock markers for greeting → mic-ready / next-turn latency telemetry.
  const greetingPlaybackEndedAtRef = useRef<number | null>(null)
  const turnFetchStartedAtRef = useRef<number | null>(null)

  // ── Voice: mounted guard ────────────────────────────────────────────────────
  // Required by DeepgramSessionController callbacks and TTS callbacks
  // to know if the component is still alive before calling setState.
  // Reset in useLayoutEffect (not during render) so Strict Mode cleanup gap
  // cannot leave this false while TTS/mic kickoff is in flight.
  const mountedRef = useRef(true)
  useLayoutEffect(() => {
    mountedRef.current = true
  })

  // ── Voice: TTS ──────────────────────────────────────────────────────────────
  // elIsPlaying drives AvatarPlayer.isSpeaking (avatar video plays/pauses with voice).
  // elSpeak / elStop are accessed via refs inside loadTurn to avoid stale closures.
  const {
    isPlaying: elIsPlaying,
    playbackProgress: elPlaybackProgress,
    speak: elSpeak,
    stop: elStop,
  } = useVoicePlayer((interview?.interviewer_id ?? 'priya') as InterviewerId)
  const elSpeakRef = useRef(elSpeak)
  const elStopRef = useRef(elStop)

  // ── Voice: STT ──────────────────────────────────────────────────────────────
  const [dgTranscript, setDgTranscript] = useState('')
  const [dgInterim, setDgInterim] = useState('')
  const [dgVoiceUiState, setDgVoiceUiState] = useState<VoiceConnectionState>('idle')
  const [micFallback, setMicFallback] = useState(false)
  // Live transcript panel — auto-scrolls to the latest words as STT updates.
  const liveTranscriptScrollRef = useRef<HTMLDivElement | null>(null)
  // Why voice fell back (M11 fix): drives distinct fallback copy for
  // denied / no-mic / unsupported. null = fallback not active or cause unknown.
  const [micFallbackKind, setMicFallbackKind] = useState<MicStartErrorKind | null>(null)
  // Classification of the most recent getUserMedia/mic failure in the CURRENT
  // start attempt. Captured in the startMic callback (the only place the raw
  // DOMException is visible — DeepgramSessionController swallows it before
  // start() resolves) and consumed by onFatalError / the start catch block.
  const lastMicErrorRef = useRef<MicStartErrorClassification | null>(null)

  // ── Review flow (2-step full-screen) ────────────────────────────────────────
  // Step 1 — transcript: edit / accept STT fixes, then Approve.
  // Step 2 — feedback: coaching + 5-dim score for the APPROVED transcript, then Continue.
  // Closed only by Continue on step 2 — no X / escape dismissal.
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewStep, setReviewStep] = useState<'transcript' | 'feedback'>('transcript')
  // Editable transcript on step 1; frozen as the approved answer once step 2 opens.
  const [editedRaw, setEditedRaw] = useState('')
  const [reviewStructured, setReviewStructured] = useState<StructuredAnswer | null>(null)
  const [reviewStructuredLoading, setReviewStructuredLoading] = useState(false)
  // score-v1 per-answer rubric. Fetched for the approved transcript (prefetched
  // on raw during step 1; re-fetched after Approve if the candidate edited).
  const [reviewScore, setReviewScore] = useState<AnswerScore | null>(null)
  const [reviewScoreLoading, setReviewScoreLoading] = useState(false)
  // Holds the deferred loadTurn callback; cleared when user Continues from step 2.
  const reviewResolveRef = useRef<((chosenAs: 'raw' | 'corrected', editedAnswer?: string) => void) | null>(null)
  const reviewStructuredRef = useRef<StructuredAnswer | null>(null)
  // Original STT/typed capture at review open — never overwritten by panel edits.
  const reviewRawAnswerRef = useRef('')
  // Phase the Continue click will advance to — needed to prefetch /turn early.
  const reviewNextPhaseRef = useRef<string | null>(null)
  // Snapshot of turn metadata so Approve can re-fire coaching/score against
  // the approved text without re-reading potentially stale render closures.
  const reviewContextRef = useRef<{
    turnIndex: number
    displayQuestion: string
    questionType?: 'technical' | 'behavioral'
    sttMinConfidence?: number
  } | null>(null)
  // Generation counter: bumped when re-fetching after an edit so a late
  // response from the raw prefetch cannot overwrite approved-text results.
  const reviewFetchGenRef = useRef(0)
  // Next-question /turn prefetch started on Approve while the candidate reads
  // feedback — Continue applies this instead of waiting on a cold LLM call.
  const nextTurnPrefetchRef = useRef<NextTurnPrefetch | null>(null)
  const [nextTurnPrefetchReady, setNextTurnPrefetchReady] = useState(false)
  // True while Continue is waiting for / applying the prefetched next turn —
  // keeps the feedback overlay up so the main pane never flashes blank.
  const [continuingFromReview, setContinuingFromReview] = useState(false)

  // ── Session prep controller (profile ∥ turn ∥ mic) ──────────────────────────
  // Real readiness, not cosmetic timers — drives the branded checklist UI.
  const [prepBundle] = useState(() => {
    const controller = createScriptSessionPrepController()
    return { controller, initialSnap: controller.snapshot() }
  })
  const prepControllerRef = useRef<ScriptSessionPrepController>(prepBundle.controller)
  const [prepSnap, setPrepSnap] = useState<PrepSnapshot>(prepBundle.initialSnap)

  const dgControllerRef = useRef<DeepgramSessionController | null>(null)
  const dgMicCleanupRef = useRef<(() => void) | null>(null)
  // Generation counter: bumped on every startDgListening() call. Callbacks from a
  // superseded call check this before touching state, so a stale/duplicate start
  // (re-hear, retry, a remount, or any other concurrent trigger) can never clobber
  // a newer, already-connected session — mirrors useVoicePlayer's seqRef pattern.
  const dgStartSeqRef = useRef(0)
  // Per-answer Deepgram final-segment confidences (0–1). Reset when a new
  // answer's listening session starts; min value ships with answer-score so
  // low-reliability transcripts get flagged (score_suspect: low_stt_confidence).
  const dgFinalConfidencesRef = useRef<number[]>([])
  // Ref to startDgListening (defined below) — allows onRefreshRestart callback
  // to call it without creating a circular dep in useCallback.
  const startDgListeningRef = useRef<(opts?: {
    clearTranscript?: boolean
    retryOnUnmountRace?: boolean
    releasePriorQuota?: boolean
    forceNewKey?: boolean
  }) => Promise<void>>(async () => {})

  // ── Voice: thinking-phase gates ─────────────────────────────────────────────
  // After TTS ends, we enter 'thinking' phase: a per-question countdown (from
  // reading_buffer_seconds) runs while STT connects in the background. The
  // answer timer starts only once BOTH gates are met — countdown ≤ 0 AND mic
  // is open. This prevents the timer from racing the microphone.
  const [thinkingCountdown, setThinkingCountdown] = useState(0)
  // Both gates: mutated synchronously; never causes renders itself.
  const thinkingGateRef = useRef({ countdownDone: false, micReady: false })
  // One-shot callback set by kickoffVoiceInput (and by "Try voice again").
  // Fired from onWsOpen. Cleared on fatal error / new question.
  const onMicReadyRef = useRef<(() => void) | null>(null)
  // Mirrors uiPhase for reads inside async callbacks (avoids stale closures).
  const uiPhaseRef = useRef<UIPhase>('loading')

  // ── Voice: timer ────────────────────────────────────────────────────────────
  const {
    timeLeft,
    isRunning: timerRunning,
    start: timerStart,
    stop: timerStop,
    reset: timerReset,
  } = useTimer(60)
  // Prevents timer's useEffect from triggering auto-submit twice (timer fires once
  // per question; this ref is reset to false in loadTurn on each new question turn).
  const timerExpiredRef = useRef(false)
  // Refs so submitAnswer / handleSkip can stop timer / STT without being in deps.
  const timerStopRef = useRef(timerStop)
  const timerResetRef = useRef(timerReset)
  const timerStartRef = useRef(timerStart)

  // ── Voice: camera ────────────────────────────────────────────────────────────
  const [cameraEnabled, setCameraEnabled] = useState(false)

  // ── Telemetry — required by DeepgramSessionController constructor ──────────
  // Uses state values (not refs) — telemetry context does not need sub-render accuracy.
  const { track } = useInterviewTelemetry({
    interviewId: interviewId ?? '',
    questionIndex: questionNumber,
    phase: currentPhase,
  })
  const telemetryCtx = useMemo(
    () => ({
      interviewId: interviewId ?? '',
      questionIndex: questionNumber,
      phase: currentPhase,
    }),
    [interviewId, questionNumber, currentPhase],
  )
  // Refs so startDgListening (a useCallback) can read the latest telemetry
  // context without having to list them in its dependency array (which would
  // cause dgController teardown/rebuild on every render).
  const trackRef = useRef(track)
  const telemetryCtxRef = useRef(telemetryCtx)

  // Ref to submitAnswer (defined below) — the timer auto-submit effect must
  // call the latest version without being in that effect's dependency array.
  const submitAnswerRef = useRef<(answer: string) => void>(() => {})

  const { startRecording: dgStartRecording, stopRecording: dgStopRecording } = useMicrophone(
    interviewId ?? undefined,
    { telemetryCtx },
  )

  // ── iOS Safari audio-gesture gate (same hook as v1) ────────────────────────
  // Desktop / Android Chrome auto-unlock on mount; iOS Safari / PWA requires a
  // tap before any TTS can play. Read via ref inside boot() so the load effect
  // doesn't re-fire when unlock state changes.
  const interviewAudio = useInterviewAudio(interviewId ?? undefined)
  const interviewAudioRef = useRef(interviewAudio)
  useEffect(() => {
    interviewAudioRef.current = interviewAudio
  }, [interviewAudio])

  // Keep uiPhaseRef fresh so async callbacks (onWsOpen, onFatalError) can
  // read the current phase without a stale closure.
  useEffect(() => {
    uiPhaseRef.current = uiPhase
  }, [uiPhase])

  // ── Thinking-phase countdown ─────────────────────────────────────────────────
  // Ticks thinkingCountdown down to 0, then sets the countdown gate. If the
  // mic-ready gate is already set (mic opened before countdown finished), this
  // triggers the transition to candidate_answering and starts the answer timer.
  useEffect(() => {
    if (uiPhase !== 'thinking') return
    if (thinkingCountdown <= 0) {
      thinkingGateRef.current.countdownDone = true
      const g = thinkingGateRef.current
      if (g.micReady && mountedRef.current && uiPhaseRef.current === 'thinking') {
        // Defer phase flip so we don't nest setState inside this effect body.
        const t = setTimeout(() => {
          if (!mountedRef.current || uiPhaseRef.current !== 'thinking') return
          setUiPhase('candidate_answering')
          setTimeout(() => { if (mountedRef.current) timerStartRef.current() }, 0)
        }, 0)
        return () => clearTimeout(t)
      }
      return
    }
    const id = setTimeout(() => setThinkingCountdown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [uiPhase, thinkingCountdown])

  // Keep voice function refs fresh so long-lived callbacks (loadTurn, timers)
  // always call the latest versions.
  useEffect(() => { elSpeakRef.current = elSpeak }, [elSpeak])
  useEffect(() => { elStopRef.current = elStop }, [elStop])
  useEffect(() => { timerStartRef.current = timerStart }, [timerStart])
  useEffect(() => { timerStopRef.current = timerStop }, [timerStop])
  useEffect(() => { timerResetRef.current = timerReset }, [timerReset])
  useEffect(() => { trackRef.current = track }, [track])
  useEffect(() => { telemetryCtxRef.current = telemetryCtx }, [telemetryCtx])

  // Mounted guard — reset to true on mount, false on unmount.
  // Strict Mode fires mount→cleanup→remount in dev; the first cleanup sets
  // mountedRef false, this effect resets it true on the real mount.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Client-owned phase state machine. The LLM has no memory between turn
  // calls, so it cannot advance the interview's phase itself — it only
  // generates content for whatever phase it's told is current. Echoing the
  // LLM's returned `turn.phase` back as the next request's `current_phase`
  // (the previous approach) left the phase permanently stuck on whatever it
  // started at, since nothing ever told the server to move forward.
  function getNextPhase(
    completedPhase: string,
    isQuestion: boolean,
    questionsAnswered: number,
    totalQuestions: number,
    selfIntroEnabled: boolean,
  ): string {
    // Non-question turns (auto-submit transitions): stay in same phase
    if (!isQuestion) return completedPhase

    // Question turns: advance to next phase
    switch (completedPhase) {
      case 'warmup':
        return selfIntroEnabled ? 'self_intro' : 'core'
      case 'self_intro':
        return 'core'
      case 'core':
        return questionsAnswered >= totalQuestions ? 'candidate_questions' : 'core'
      case 'candidate_questions':
        return 'closing'
      default:
        return completedPhase
    }
  }

  const clearAutoTimer = useCallback(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }
  }, [])

  // ── STT: stop ───────────────────────────────────────────────────────────────
  const stopDgListening = useCallback((opts?: { releaseQuota?: boolean }) => {
    const releaseQuota = opts?.releaseQuota !== false
    if (!releaseQuota && dgControllerRef.current) {
      const lease = dgControllerRef.current.getSessionLeaseId()
      if (lease) dgLeaseIdRef.current = lease
    }
    dgControllerRef.current?.stop({ releaseQuota })
    dgMicCleanupRef.current = null
    if (releaseQuota) {
      dgLeaseIdRef.current = null
    }
    if (mountedRef.current) setDgVoiceUiState('idle')
  }, [])

  const stopDgListeningRef = useRef(stopDgListening)
  useEffect(() => { stopDgListeningRef.current = stopDgListening }, [stopDgListening])

  // ── STT: start ──────────────────────────────────────────────────────────────
  const startDgListening = useCallback(async ({
    clearTranscript = true,
    retryOnUnmountRace = true,
    releasePriorQuota = false,
    forceNewKey = false,
  }: {
    clearTranscript?: boolean
    /** One automatic retry when mic start races Strict Mode / remount. */
    retryOnUnmountRace?: boolean
    /**
     * When true, tear down any prior session AND release its lease (fatal /
     * unmount paths). Default false preserves the lease for refresh reconnects.
     */
    releasePriorQuota?: boolean
    /** Mid-answer token expiry — mint a fresh Deepgram key. */
    forceNewKey?: boolean
  } = {}) => {
    if (!mountedRef.current || !interviewId) return
    // Chrome/Firefox/etc on iOS cannot access the microphone (Apple restricts
    // getUserMedia to Safari only). Skip all voice attempts immediately — the
    // 3×retry loop would waste ~24s before falling back to text.
    if (VOICE_UNSUPPORTED_ON_THIS_BROWSER) {
      setMicFallback(true)
      setMicFallbackKind('unsupported')
      return
    }

    // Tear down any lingering session before creating a new one.
    // Preserve lease by default so the next start() can refresh instead of
    // burning a new-mint rate-limit slot on every question.
    if (dgControllerRef.current?.isActive()) {
      stopDgListeningRef.current({ releaseQuota: releasePriorQuota })
    }

    // Bump the generation counter for this attempt. Every state-touching
    // callback below checks mySeq against the live counter before calling
    // setState, so a superseded attempt can never clobber the newer session's
    // UI state. (Deliberately NOT folded into isMounted — see that callback.)
    dgStartSeqRef.current += 1
    const mySeq = dgStartSeqRef.current

    // Clear transcript state from the previous question. Skipped on a
    // mid-answer token-refresh restart (clearTranscript: false) so the
    // in-progress answer survives the reconnect.
    if (clearTranscript) {
      setDgTranscript('')
      setDgInterim('')
      dgFinalConfidencesRef.current = []
    }
    setMicFallback(false)
    setMicFallbackKind(null)
    // Fresh attempt — a stale classification from a previous attempt must not
    // mislabel this one's failure.
    lastMicErrorRef.current = null

    // Shared failure sink for both paths that engage the typed-answer fallback
    // (onFatalError callback + the start() catch below). Classifies by the real
    // error name captured in startMic (M11 fix) instead of assuming denial, and
    // emits a queryable VOICE telemetry event carrying error_name/error_kind.
    const engageMicFallback = (source: 'fatal_error' | 'start_catch', rawErr?: unknown) => {
      const cls =
        lastMicErrorRef.current ??
        (rawErr !== undefined ? classifyMicStartError(rawErr) : null)
      console.warn(
        `[VOICE_PIPELINE] mic/STT start failed (${cls ? `${cls.errorName ?? 'no-name'} → ${cls.kind}` : 'no mic error captured — WS/token/pipeline failure'}) — text fallback engaged`,
      )
      interviewTelemetry(
        'VOICE',
        'mic_start_failed',
        telemetryCtxRef.current,
        {
          source,
          error_kind: cls?.kind ?? 'pipeline_failure',
          error_name: cls?.errorName ?? null,
          error_message: cls?.errorMessage ?? (rawErr instanceof Error ? rawErr.message : null),
        },
        { critical: true, level: 'warn' },
      )
      if (mountedRef.current && mySeq === dgStartSeqRef.current) {
        setMicFallback(true)
        setMicFallbackKind(cls?.kind ?? null)
      }
    }

    const callbacks: DeepgramSessionCallbacks = {
      onPartial: (chunk: TranscriptChunk) => {
        if (!mountedRef.current || mySeq !== dgStartSeqRef.current) return
        if (chunk.isFinal) {
          // Segment-level STT confidence — consumed by answer-score to flag
          // low-reliability transcripts (score_suspect: low_stt_confidence).
          if (typeof chunk.confidence === 'number' && chunk.confidence > 0) {
            dgFinalConfidencesRef.current.push(chunk.confidence)
          }
          setDgTranscript((prev) => prev + chunk.text + ' ')
          setDgInterim('')
        } else {
          setDgInterim(chunk.text)
        }
      },
      // onFinal is UtteranceEnd — the controller's confirmed-complete text for
      // the utterance. v2.1 does NOT auto-submit on it (timer/explicit Submit
      // drive submission), but continuous speech with no pauses never emits an
      // is_final Result, so without this the transcript would stay empty.
      onFinal: (text: string) => {
        if (!mountedRef.current || mySeq !== dgStartSeqRef.current) return
        const trimmed = text.trim()
        if (!trimmed) return
        setDgTranscript((prev) => (prev.trimEnd().endsWith(trimmed) ? prev : prev ? prev + ' ' + trimmed : trimmed))
        setDgInterim('')
      },
      onWsOpen: () => {
        if (!mountedRef.current || mySeq !== dgStartSeqRef.current) return
        setFirstMicConnected(true)
        setDgVoiceUiState('connected')
        const lease = dgControllerRef.current?.getSessionLeaseId()
        if (lease) dgLeaseIdRef.current = lease
        if (greetingPlaybackEndedAtRef.current != null) {
          interviewFlowLog('voice', 'mic_ready_after_greeting', {
            interviewId,
            elapsed_ms: Date.now() - greetingPlaybackEndedAtRef.current,
            phase: currentPhaseRef.current,
          })
          greetingPlaybackEndedAtRef.current = null
        }
        // Fire the one-shot mic-ready callback (set by kickoffVoiceInput or
        // "Try voice again"). It either triggers the thinking→answering
        // transition (initial flow) or restarts the timer (retry flow).
        const cb = onMicReadyRef.current
        if (cb) {
          onMicReadyRef.current = null
          cb()
        }
      },
      onRefreshRestart: () => {
        if (mySeq !== dgStartSeqRef.current) return
        // Token refresh mid-answer — preserve the in-progress transcript.
        void startDgListeningRef.current({ clearTranscript: false, forceNewKey: true })
      },
      onUiState: (state: VoiceConnectionState) => {
        if (mountedRef.current && mySeq === dgStartSeqRef.current) setDgVoiceUiState(state)
      },
      onFatalError: () => {
        if (!mountedRef.current || mySeq !== dgStartSeqRef.current) return
        // Non-user-facing marker (classified by real error name — M11 fix) so
        // Clarity session recordings capture when a privacy browser blocks mic
        // access or the STT pipeline dies and the session falls back to typing.
        engageMicFallback('fatal_error')
        // Clear any pending mic-ready callback so the timer never starts.
        onMicReadyRef.current = null
        stopDgListeningRef.current({ releaseQuota: true })
        // If we were in the thinking phase, drop straight to answering so the
        // candidate can type. No timer — typing fallback has no countdown.
        if (uiPhaseRef.current === 'thinking') setUiPhase('candidate_answering')
      },
      // Component liveness ONLY — do NOT fold the mySeq generation check in
      // here. The controller interprets isMounted()===false as "host unmounted"
      // and responds with a hard stop + quota-lease release, and its onOpen
      // gate checks it before reporting a successful connection. Folding the
      // seq check in made a superseded-but-still-mounted attempt look
      // unmounted: the WebSocket would open, the controller would silently
      // discard the open, and the attempt died on the open-timeout with no
      // error — the "Connecting microphone…" hang. Supersession is already
      // handled by the controller's internal stt-identity checks plus the
      // per-callback seq gates above/below.
      isMounted: () => mountedRef.current,
      startMic: async (sendAudio) => {
        try {
          const cleanup = await dgStartRecording(sendAudio)
          dgMicCleanupRef.current = cleanup
          return cleanup
        } catch (err) {
          // Capture the raw getUserMedia DOMException here — the controller
          // swallows it (handleStartFailure → onFatalError) before start()
          // resolves, so this is the only hop where error.name is visible.
          lastMicErrorRef.current = classifyMicStartError(err)
          throw err
        }
      },
      stopMic: () => {
        dgStopRecording()
      },
      releaseAudio: () => releaseAudioForMicCapture(),
    }

    dgControllerRef.current = new DeepgramSessionController(
      interviewId,
      telemetryCtxRef.current,
      trackRef.current,
      callbacks,
    )

    const refreshLeaseId = dgLeaseIdRef.current ?? undefined
    try {
      await dgControllerRef.current.start(
        refreshLeaseId || forceNewKey
          ? {
              isRefresh: Boolean(refreshLeaseId),
              refreshLeaseId,
              forceNewKey,
            }
          : undefined,
      )
      const lease = dgControllerRef.current.getSessionLeaseId()
      if (lease) dgLeaseIdRef.current = lease
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isUnmountRace = /unmounted during initialisation/i.test(msg)
      if (
        isUnmountRace &&
        retryOnUnmountRace &&
        mountedRef.current &&
        mySeq === dgStartSeqRef.current
      ) {
        console.warn('[VOICE_PIPELINE] mic start raced with remount — retrying once')
        await startDgListeningRef.current({
          clearTranscript,
          retryOnUnmountRace: false,
        })
        return
      }
      // Deepgram start failed — fall back to text input silently, classified
      // by the real error name (M11 fix) instead of assuming denial.
      engageMicFallback('start_catch', err)
    }
  }, [interviewId, dgStartRecording, dgStopRecording])

  // Keep the ref fresh so onRefreshRestart can always call the latest version.
  useEffect(() => {
    startDgListeningRef.current = startDgListening
  }, [startDgListening])

  // When the countdown reaches 0, auto-submit whatever the candidate has said/typed.
  // timerExpiredRef prevents this from firing twice if React re-evaluates the effect.
  // Guard: only fires when uiPhase is candidate_answering (never in loading/auto_turn/etc).
  useEffect(() => {
    if (
      timeLeft === 0 &&
      !timerRunning &&
      uiPhase === 'candidate_answering' &&
      !timerExpiredRef.current
    ) {
      timerExpiredRef.current = true
      const spoken = (dgTranscript + ' ' + dgInterim).trim()
      const typed = answerText.trim()
      // Prefer voice transcript; fall back to typed; last resort: [TIMEOUT] marker.
      const finalAnswer = spoken || typed || '[TIMEOUT]'
      stopDgListeningRef.current({ releaseQuota: false })
      elStopRef.current()
      // submitAnswer is stable (no voice deps in its useCallback) — call via direct ref.
      void submitAnswerRef.current(finalAnswer)
    }
  }, [timeLeft, timerRunning, uiPhase, dgTranscript, dgInterim, answerText])

  // Sync live voice transcript into answerText so the candidate can see
  // what they're saying. Only active when Deepgram WebSocket is open.
  // Typed text takes precedence once the user starts typing (they can edit).
  useEffect(() => {
    if (dgVoiceUiState !== 'connected') return
    const live = (dgTranscript + dgInterim).trim()
    if (!live) return
    const t = setTimeout(() => {
      if (mountedRef.current) setAnswerText(live)
    }, 0)
    return () => clearTimeout(t)
  }, [dgTranscript, dgInterim, dgVoiceUiState])

  // Keep the latest spoken words in view as the transcript grows. If the
  // candidate has scrolled up to re-read earlier text (>80px from bottom),
  // don't yank them — only pin to bottom when already following the live end.
  useLayoutEffect(() => {
    const el = liveTranscriptScrollRef.current
    if (!el) return
    if (!(dgTranscript || dgInterim)) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 80) {
      el.scrollTop = el.scrollHeight
    }
  }, [dgTranscript, dgInterim])

  // Cleanup voice resources when the page unmounts (exit interview, navigate away).
  // Always stop in order: timer → STT → TTS. Hard-release the STT lease.
  useEffect(() => {
    return () => {
      timerStopRef.current()
      const leaseId = dgLeaseIdRef.current
      stopDgListeningRef.current({ releaseQuota: true })
      if (leaseId && interviewId) {
        // Cover prefetch-only leases that never reached an active controller.
        releaseSTTSession(interviewId, leaseId, undefined, { beacon: true })
      }
      clearCachedSTTToken(interviewId)
      elStopRef.current()
    }
  }, [interviewId])

  const completeInterview = useCallback(async () => {
    try {
      await fetch('/api/interview/script/complete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        // Phase 3A has no scoring pipeline yet — send a neutral bucket so the
        // interview lands in a terminal state. Real scoring arrives later.
        body: JSON.stringify({ interviewId, performanceBucket: 'average' }),
      })
    } catch {
      /* completion is best-effort for the UI — never block the closing screen */
    }
  }, [interviewId])

  /** HTTP-only turn fetch — used by parallel boot so TTS/mic wait on a join barrier. */
  const fetchTurnPayload = useCallback(
    async (p: LoadTurnParams): Promise<TurnApiResponse> => {
      const isBoot = p.lastAnswer === '[NONE]'
      if (isBoot && interviewId) {
        const existing = inFlightBootTurnByInterview.get(interviewId)
        if (existing) return existing
      }

      const run = (async (): Promise<TurnApiResponse> => {
        const res = await fetch('/api/interview/script/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            interviewId,
            lastAnswer: p.lastAnswer,
            currentPhase: p.requestPhase ?? currentPhaseRef.current,
            questionNumber: questionNumberRef.current,
            ...(p.prevTurnIndex != null ? { prevTurnIndex: p.prevTurnIndex } : {}),
            ...(p.submittedAs ? { submittedAs: p.submittedAs } : {}),
            ...(p.sttRawTranscript != null ? { sttRawTranscript: p.sttRawTranscript } : {}),
          }),
        })

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          if (res.status === 422) {
            throw new Error('invalid_turn_output')
          }
          throw new Error(body?.error || `The interviewer could not respond (status ${res.status}).`)
        }

        return (await res.json()) as TurnApiResponse
      })()

      if (isBoot && interviewId) {
        inFlightBootTurnByInterview.set(interviewId, run)
        try {
          return await run
        } finally {
          inFlightBootTurnByInterview.delete(interviewId)
        }
      }

      return run
    },
    [interviewId],
  )

  const fetchTurnPayloadRef = useRef(fetchTurnPayload)
  useEffect(() => {
    fetchTurnPayloadRef.current = fetchTurnPayload
  }, [fetchTurnPayload])

  /** Apply a fetched turn: state + TTS + voice kickoff. Requires interviewRef for voice id. */
  const applyTurnPayload = useCallback(
    async (data: TurnApiResponse) => {
      const turn = data.turn
      const isBootTurn = data.turnIndex === 1 || turn.phase === 'warmup'

      // One-shot: never speak the opening greeting twice for the same interview
      // (boot re-entry / Strict Mode race can deliver the same payload twice).
      if (isBootTurn && data.turnIndex <= 1) {
        if (!claimBootTurnApply(interviewId)) {
          interviewFlowLog('session', 'boot_turn_apply_skipped_duplicate', {
            interviewId,
            turnIndex: data.turnIndex,
            phase: turn.phase,
          })
          return
        }
      }

      if (turnFetchStartedAtRef.current != null) {
        interviewFlowLog('session', 'turn_applied', {
          interviewId,
          turnIndex: data.turnIndex,
          phase: turn.phase,
          fetch_to_apply_ms: Date.now() - turnFetchStartedAtRef.current,
        })
        turnFetchStartedAtRef.current = null
      }

      setCurrentTurn(turn)
      lastTurnWasQuestionRef.current = turn.is_question
      setCurrentTurnIndex(data.turnIndex)
      currentTurnIndexRef.current = data.turnIndex
      setCurrentPhase(turn.phase)
      currentPhaseRef.current = turn.phase

      if (turn.is_question && turn.phase === 'core') {
        questionNumberRef.current += 1
      }
      const runningQuestionNumber = questionNumberRef.current
      setQuestionNumber(runningQuestionNumber)

      setFirstTurnShown(true)
      setUiPhase('turn_ready')

      if (turn.phase === 'closing' || currentPhaseRef.current === 'closing') {
        setUiPhase('completed')
        void completeInterview()
        return
      }

      const tone =
        turn.interviewer_emotion === 'warm' ? ('encouraging' as const)
        : turn.interviewer_emotion === 'challenging' ? ('challenging' as const)
        : ('neutral' as const)

      if (!turn.is_question) {
        consecutiveAutoTurnsRef.current += 1
        if (consecutiveAutoTurnsRef.current > 3) {
          consecutiveAutoTurnsRef.current = 0
          setUiPhase('candidate_answering')
          return
        }

        setUiPhase('auto_turn')

        const scheduleAdvance = () => {
          if (!mountedRef.current) return
          const stayPhase = getNextPhase(
            currentPhaseRef.current,
            false,
            questionNumberRef.current,
            interviewRef.current?.question_count ?? 4,
            interviewRef.current?.self_intro_enabled ?? true,
          )
          currentPhaseRef.current = stayPhase
          autoTimerRef.current = setTimeout(() => {
            void loadTurnRef.current({ lastAnswer: turn.speech })
          }, AUTO_ADVANCE_MS)
        }

        let advanceCalled = false
        const guardedAdvance = () => {
          if (advanceCalled) return
          advanceCalled = true
          scheduleAdvance()
        }

        void elSpeakRef.current(turn.speech, tone, {
          onPlaybackComplete: guardedAdvance,
          onPlaybackFailed: guardedAdvance,
        })
      } else {
        consecutiveAutoTurnsRef.current = 0
        timerExpiredRef.current = false
        setUiPhase('turn_ready')

        // Prefetch STT token during greeting/question TTS so mic connect after
        // playback does not pay the full /api/stt/token round-trip serially.
        if (!VOICE_UNSUPPORTED_ON_THIS_BROWSER && interviewId) {
          const prefetchStarted = Date.now()
          void fetchSTTTokenWithRetry(interviewId, {
            refreshLeaseId: dgLeaseIdRef.current ?? undefined,
            maxAttempts: 2,
            prefetchOnly: true,
          })
            .then((meta) => {
              if (meta.session_lease_id) {
                dgLeaseIdRef.current = meta.session_lease_id
              }
              interviewFlowLog('voice', 'stt_token_prefetched_during_tts', {
                interviewId,
                elapsed_ms: Date.now() - prefetchStarted,
                refresh: Boolean(meta.session_lease_id && dgLeaseIdRef.current),
                phase: turn.phase,
              })
            })
            .catch(() => {
              /* kickoff will fetch again */
            })
        }

        const kickoffVoiceInput = () => {
          if (!mountedRef.current) return
          greetingPlaybackEndedAtRef.current = Date.now()
          interviewFlowLog('tts', 'question_playback_complete', {
            interviewId,
            phase: turn.phase,
            turnIndex: data.turnIndex,
          })
          const thinkingSecs = (turn.reading_buffer_seconds ?? 0) > 0
            ? turn.reading_buffer_seconds
            : 3
          timerResetRef.current(turn.timer_seconds > 0 ? turn.timer_seconds : 60)
          thinkingGateRef.current = { countdownDone: false, micReady: false }
          setThinkingCountdown(thinkingSecs)
          setUiPhase('thinking')

          onMicReadyRef.current = () => {
            thinkingGateRef.current.micReady = true
            const g = thinkingGateRef.current
            if (!g.countdownDone || !mountedRef.current) return
            if (uiPhaseRef.current !== 'thinking') return
            setUiPhase('candidate_answering')
            setTimeout(() => { if (mountedRef.current) timerStartRef.current() }, 0)
          }

          void startDgListeningRef.current()
        }

        let kickoffCalled = false
        const guardedKickoff = () => {
          if (kickoffCalled) return
          kickoffCalled = true
          kickoffVoiceInput()
        }

        void elSpeakRef.current(turn.speech, tone, {
          onPlaybackComplete: () => {
            if (!mountedRef.current) return
            guardedKickoff()
          },
          onPlaybackFailed: () => {
            if (!mountedRef.current) return
            guardedKickoff()
          },
        })
      }
    },
    [completeInterview, interviewId],
  )

  const applyTurnPayloadRef = useRef(applyTurnPayload)
  useEffect(() => {
    applyTurnPayloadRef.current = applyTurnPayload
  }, [applyTurnPayload])

  const loadTurn = useCallback(
    async (p: LoadTurnParams) => {
      clearAutoTimer()
      setErrorMessage(null)
      setAnswerText('')
      retryRef.current = () => void loadTurnRef.current(p)
      prepControllerRef.current?.setTrack('turn', 'running')

      // Reuse next-turn prefetch started on Approve (feedback step), if it
      // matches this load. Avoids a second LLM round-trip after Continue.
      const prefetch = nextTurnPrefetchRef.current
      const prefetchMatches =
        !!prefetch &&
        prefetch.params.lastAnswer.trim() === p.lastAnswer.trim() &&
        prefetch.params.prevTurnIndex === p.prevTurnIndex &&
        prefetch.params.submittedAs === p.submittedAs &&
        (prefetch.params.sttRawTranscript ?? '').trim() === (p.sttRawTranscript ?? '').trim()

      try {
        let data: TurnApiResponse
        if (prefetchMatches) {
          nextTurnPrefetchRef.current = null
          setNextTurnPrefetchReady(false)
          if (prefetch.result) {
            // Already warm — skip the blank turn_loading screen.
            prepControllerRef.current?.setTrack('turn', 'ready')
            if (!mountedRef.current) return
            await applyTurnPayload(prefetch.result)
            return
          }
          setUiPhase('turn_loading')
          try {
            data = await prefetch.promise
          } catch {
            // Prefetch failed while candidate read feedback — one cold retry.
            data = await fetchTurnPayload(p)
          }
        } else {
          if (prefetch) {
            // Stale / mismatched prefetch — drop it and fetch fresh.
            nextTurnPrefetchRef.current = null
            setNextTurnPrefetchReady(false)
          }
          setUiPhase('turn_loading')
          data = await fetchTurnPayload(p)
        }
        if (!mountedRef.current) return
        prepControllerRef.current?.setTrack('turn', 'ready')
        await applyTurnPayload(data)
      } catch (err) {
        if (!mountedRef.current) return
        nextTurnPrefetchRef.current = null
        setNextTurnPrefetchReady(false)
        prepControllerRef.current?.setTrack('turn', 'failed', {
          error: err instanceof Error ? err.message : 'turn_failed',
        })
        if (err instanceof Error && err.message === 'invalid_turn_output') {
          setErrorMessage('The interviewer produced an unexpected response. Please try again.')
          setUiPhase('turn_ready')
          return
        }
        setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    },
    [clearAutoTimer, fetchTurnPayload, applyTurnPayload],
  )

  useEffect(() => {
    loadTurnRef.current = loadTurn
  }, [loadTurn])

  // Subscribe to prep controller for checklist UI.
  useEffect(() => {
    const prep = prepControllerRef.current
    if (!prep) return
    return prep.subscribe((snap) => {
      if (mountedRef.current) setPrepSnap(snap)
    })
  }, [])

  // ── Initial load: profile ∥ first turn ∥ mic probe (join before TTS) ───────
  useEffect(() => {
    let cancelled = false
    const prep = prepControllerRef.current

    async function boot() {
      prep?.reset()
      prep?.setTrack('profile', 'running')
      prep?.setTrack('mic', 'running')

      const audio = interviewAudioRef.current
      const needsUnlock = Boolean(
        audio.needsUnlock && !audio.isUnlocked && IS_IOS_SAFARI,
      )

      const sessionPromise = (async (): Promise<ScriptInterviewSession> => {
        const res = await fetch(
          `/api/interview/script/session?id=${encodeURIComponent(interviewId)}`,
          { credentials: 'include' },
        )
        if (!res.ok) throw new Error('session_unavailable')
        return (await res.json()) as ScriptInterviewSession
      })()

      // Mic status only — do NOT call getUserMedia here. Warming the device
      // races Deepgram's later acquire and triggers false "unmounted" aborts.
      const micPromise = probeMicrophoneReadiness({
        allowGetUserMedia: false,
        unsupported: VOICE_UNSUPPORTED_ON_THIS_BROWSER,
      })

      // First turn can start without waiting for session — turn API re-validates.
      // TTS still waits for the session barrier below (correct interviewer voice).
      let turnPromise: Promise<TurnApiResponse> | null = null
      const bootDecision = decideBootTurnFetch({
        needsUnlock,
        bootAlreadyCalled: bootCalledRef.current,
      })
      if (bootDecision.action === 'fetch_first_turn') {
        bootCalledRef.current = true
        prep?.setTrack('turn', 'running')
        turnFetchStartedAtRef.current = Date.now()
        turnPromise = fetchTurnPayloadRef.current({ lastAnswer: '[NONE]' })
      } else {
        prep?.setTrack('turn', needsUnlock ? 'idle' : 'idle')
      }

      try {
        const [sessionSettled, micResult, turnSettled] = await Promise.all([
          sessionPromise.then(
            (value) => ({ ok: true as const, value }),
            (error: unknown) => ({ ok: false as const, error }),
          ),
          micPromise,
          (turnPromise ?? Promise.resolve(null)).then(
            (value) => ({ ok: true as const, value }),
            (error: unknown) => ({ ok: false as const, error }),
          ),
        ])

        if (cancelled || !mountedRef.current) return

        if (!sessionSettled.ok) {
          router.replace('/dashboard')
          return
        }

        const row = sessionSettled.value
        if (row.engine !== 'v2.1' || row.status === 'completed' || row.status === 'abandoned') {
          router.replace('/dashboard')
          return
        }

        setInterview(row)
        interviewRef.current = row
        prep?.setTrack('profile', 'ready')

        prep?.setMicDetail(micResult.detail)
        if (micResult.status === 'ready') {
          prep?.setTrack('mic', 'ready')
        } else if (micResult.status === 'failed') {
          prep?.setTrack('mic', 'failed')
          if (
            micResult.detail === 'denied' ||
            micResult.detail === 'unsupported' ||
            VOICE_UNSUPPORTED_ON_THIS_BROWSER
          ) {
            setMicFallback(true)
            setMicFallbackKind(micResult.detail === 'denied' ? 'permission_denied' : 'unsupported')
          }
        } else {
          prep?.setTrack('mic', 'skipped')
        }

        if (needsUnlock) {
          setUiPhase('awaiting_audio_unlock')
          return
        }

        if (!turnSettled.ok) {
          const msg =
            turnSettled.error instanceof Error
              ? turnSettled.error.message
              : 'Something went wrong preparing your session. Please try again.'
          prep?.setTrack('turn', 'failed', { error: msg })
          setErrorMessage(msg)
          setUiPhase('loading')
          bootCalledRef.current = false
          releaseBootTurnApplyClaim(interviewId)
          retryRef.current = () => {
            bootCalledRef.current = true
            void loadTurnRef.current({ lastAnswer: '[NONE]' })
          }
          return
        }

        if (
          shouldFallbackLoadFirstTurn({
            needsUnlock,
            bootCalled: bootCalledRef.current,
            turnResult: turnSettled.value,
            cancelled,
          })
        ) {
          // Unexpected — kick first turn serially as fallback (boot never marked).
          prep?.setTrack('turn', 'running')
          turnFetchStartedAtRef.current = Date.now()
          void loadTurnRef.current({ lastAnswer: '[NONE]' })
          return
        }

        if (!turnSettled.value) {
          // Boot re-entry with bootCalled already true — do not speak again.
          interviewFlowLog('session', 'boot_reentry_skipped', { interviewId })
          return
        }

        prep?.setTrack('turn', 'ready')
        setErrorMessage(null)
        await applyTurnPayloadRef.current(turnSettled.value)
      } catch {
        if (cancelled || !mountedRef.current) return
        router.replace('/dashboard')
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [interviewId, router])

  useEffect(() => clearAutoTimer, [clearAutoTimer])

  // ── Submit / skip ──────────────────────────────────────────────────────────
  const submitAnswer = useCallback(
    (rawAnswer: string) => {
      // Always stop timer, STT, and TTS before processing the submission.
      // Order matters: timer → STT → TTS.
      // Preserve STT lease across questions (releaseQuota: false) so the next
      // listening start is a refresh mint, not a new-session mint.
      timerStopRef.current()
      stopDgListeningRef.current({ releaseQuota: false })
      elStopRef.current()
      setDgTranscript('')
      setDgInterim('')

      if (!currentTurn) return
      const turn = currentTurn
      clearAutoTimer()
      setUiPhase('submitting')
      turnFetchStartedAtRef.current = Date.now()

      // Pre-compute the next phase here so both the popup and the non-popup
      // paths capture the same value. currentPhaseRef must NOT be mutated
      // until the candidate confirms (otherwise a dismissed popup would leave
      // the phase advanced with no matching loadTurn call).
      const nextPhase = getNextPhase(
        currentPhaseRef.current,
        lastTurnWasQuestionRef.current,
        questionNumberRef.current,
        interviewRef.current?.question_count ?? 4,
        interviewRef.current?.self_intro_enabled ?? true,
      )

      const isSpecialAnswer = rawAnswer === '[SKIPPED]' || rawAnswer === '[TIMEOUT]'
      const shouldShowReview =
        !turn.auto_submit &&
        turn.show_auto_structure &&
        !!turn.display_question &&
        !isSpecialAnswer

      if (shouldShowReview) {
        // Open step 1 (transcript). loadTurn waits until Continue on step 2.
        setReviewOpen(true)
        setReviewStep('transcript')
        setUiPhase('review')
        setEditedRaw(rawAnswer)
        setReviewStructured(null)
        reviewStructuredRef.current = null
        setReviewStructuredLoading(true)
        setReviewScore(null)
        setReviewScoreLoading(true)
        reviewRawAnswerRef.current = rawAnswer
        reviewNextPhaseRef.current = nextPhase
        nextTurnPrefetchRef.current = null
        setNextTurnPrefetchReady(false)
        reviewFetchGenRef.current += 1
        const prefetchGen = reviewFetchGenRef.current

        // Snapshot + reset so a later typed answer can't inherit stale voice confidences.
        const finalConfidences = dgFinalConfidencesRef.current
        dgFinalConfidencesRef.current = []
        const sttMinConfidence =
          finalConfidences.length > 0 ? Math.min(...finalConfidences) : undefined
        reviewContextRef.current = {
          turnIndex: currentTurnIndexRef.current,
          displayQuestion: turn.display_question ?? '',
          ...(turn.question_type ? { questionType: turn.question_type } : {}),
          ...(sttMinConfidence !== undefined ? { sttMinConfidence } : {}),
        }

        // Deferred advance — fired only from Continue on the feedback step.
        // Payload wiring (submittedAs / lastAnswer / sttRawTranscript) is pure —
        // see buildReviewLoadTurnPayload (unit-tested).
        reviewResolveRef.current = (chosenAs: 'raw' | 'corrected', editedAnswer?: string) => {
          currentPhaseRef.current = nextPhase
          const editedRawForChoice = chosenAs === 'raw' ? (editedAnswer ?? rawAnswer) : rawAnswer
          const editedCorrectedForChoice =
            chosenAs === 'corrected' ? (editedAnswer ?? '') : ''
          const payload = buildReviewLoadTurnPayload({
            chosenAs,
            editedRaw: editedRawForChoice,
            editedCorrected: editedCorrectedForChoice,
            rawAnswer,
            prevTurnIndex: currentTurnIndexRef.current,
          })
          void loadTurnRef.current(payload)
        }

        // Prefetch on the original capture: STT highlights (corrected_transcript)
        // for step 1, plus coaching + score ready for step 2 when the candidate
        // Approves without editing. If they edit, Approve bumps the gen and
        // re-fires both against the approved text.
        fetch('/api/interview/script/auto-structure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            interviewId,
            turnIndex: currentTurnIndexRef.current,
            rawTranscript: rawAnswer,
            displayQuestion: turn.display_question,
            targetRole: interviewRef.current?.role ?? '',
            scriptType: interviewRef.current?.script_type ?? 'SCRIPT_H',
            ...(turn.question_type ? { questionType: turn.question_type } : {}),
          }),
          signal: AbortSignal.timeout(22_000),
        })
          .then(async (res) => {
            if (!mountedRef.current || reviewFetchGenRef.current !== prefetchGen) return
            if (!res.ok) throw new Error(`auto-structure ${res.status}`)
            const data = (await res.json()) as { structuredAnswer: StructuredAnswer }
            const sa = data.structuredAnswer
            reviewStructuredRef.current = sa
            if (reviewResolveRef.current) {
              setReviewStructured(sa)
              setReviewStructuredLoading(false)
            }
          })
          .catch(() => {
            // Step 1 can proceed without highlights; do NOT auto-dismiss.
            if (!mountedRef.current || reviewFetchGenRef.current !== prefetchGen) return
            setReviewStructuredLoading(false)
          })

        fetch('/api/interview/script/answer-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            interviewId,
            turnIndex: currentTurnIndexRef.current,
            transcript: rawAnswer,
            displayQuestion: turn.display_question,
            targetRole: interviewRef.current?.role ?? '',
            ...(turn.question_type ? { questionType: turn.question_type } : {}),
            ...(sttMinConfidence !== undefined ? { sttMinConfidence } : {}),
          }),
          signal: AbortSignal.timeout(40_000),
        })
          .then(async (res) => {
            if (!mountedRef.current || reviewFetchGenRef.current !== prefetchGen) return
            if (!res.ok) throw new Error(`answer-score ${res.status}`)
            const data = (await res.json()) as { score: AnswerScore }
            setReviewScore(data.score)
            setReviewScoreLoading(false)
          })
          .catch(() => {
            if (!mountedRef.current || reviewFetchGenRef.current !== prefetchGen) return
            setReviewScoreLoading(false)
          })

        return
      }

      // Non-review path: advance phase immediately and fetch next turn.
      currentPhaseRef.current = nextPhase
      const submittedAs: LoadTurnParams['submittedAs'] = turn.auto_submit ? 'auto_submit' : 'raw'
      void loadTurnRef.current({
        lastAnswer: rawAnswer,
        prevTurnIndex: currentTurnIndexRef.current,
        submittedAs,
        sttRawTranscript: isSpecialAnswer ? undefined : rawAnswer,
      })
    },
    [currentTurn, interviewId, clearAutoTimer],
  )

  useEffect(() => { submitAnswerRef.current = submitAnswer }, [submitAnswer])

  /**
   * Start generating the next interviewer turn as soon as the candidate
   * Approves their transcript — overlaps LLM latency with feedback reading.
   * Continue then applies the warm result (or awaits the same promise).
   */
  const startNextTurnPrefetch = useCallback((approvedTranscript: string) => {
    const nextPhase = reviewNextPhaseRef.current
    if (!interviewId || !nextPhase) return

    const payload = buildReviewLoadTurnPayload({
      chosenAs: 'raw',
      editedRaw: approvedTranscript,
      editedCorrected: '',
      rawAnswer: reviewRawAnswerRef.current,
      prevTurnIndex: currentTurnIndexRef.current,
    })
    const params: LoadTurnParams = {
      ...payload,
      requestPhase: nextPhase,
    }

    setNextTurnPrefetchReady(false)
    const promise = fetchTurnPayloadRef.current(params)
    const entry: NextTurnPrefetch = {
      params,
      promise,
      result: null,
      error: null,
    }
    nextTurnPrefetchRef.current = entry
    void promise
      .then((data) => {
        if (nextTurnPrefetchRef.current !== entry) return
        entry.result = data
        if (mountedRef.current) setNextTurnPrefetchReady(true)
      })
      .catch((err) => {
        if (nextTurnPrefetchRef.current !== entry) return
        entry.error = err
        // Leave result null — Continue/loadTurn will fall through to a fresh fetch
        // only if we clear the broken prefetch; keep the rejected promise so
        // loadTurn can catch the same error OR we clear for retry.
        nextTurnPrefetchRef.current = null
        if (mountedRef.current) setNextTurnPrefetchReady(false)
      })
  }, [interviewId])

  /**
   * Step 2 coaching + score for the APPROVED transcript.
   * Called after Approve when the candidate edited (or accepted STT fixes).
   * Bumps reviewFetchGenRef so any late raw-prefetch response is ignored.
   */
  const fetchFeedbackForApprovedTranscript = useCallback((approvedTranscript: string) => {
    const ctx = reviewContextRef.current
    if (!interviewId || !ctx) return

    reviewFetchGenRef.current += 1
    const gen = reviewFetchGenRef.current
    setReviewStructured(null)
    reviewStructuredRef.current = null
    setReviewStructuredLoading(true)
    setReviewScore(null)
    setReviewScoreLoading(true)

    fetch('/api/interview/script/auto-structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        interviewId,
        turnIndex: ctx.turnIndex,
        rawTranscript: approvedTranscript,
        displayQuestion: ctx.displayQuestion,
        targetRole: interviewRef.current?.role ?? '',
        scriptType: interviewRef.current?.script_type ?? 'SCRIPT_H',
        ...(ctx.questionType ? { questionType: ctx.questionType } : {}),
      }),
      signal: AbortSignal.timeout(22_000),
    })
      .then(async (res) => {
        if (!mountedRef.current || reviewFetchGenRef.current !== gen) return
        if (!res.ok) throw new Error(`auto-structure ${res.status}`)
        const data = (await res.json()) as { structuredAnswer: StructuredAnswer }
        const sa = data.structuredAnswer
        reviewStructuredRef.current = sa
        setReviewStructured(sa)
        setReviewStructuredLoading(false)
      })
      .catch(() => {
        if (!mountedRef.current || reviewFetchGenRef.current !== gen) return
        setReviewStructuredLoading(false)
      })

    // Edited transcript is no longer STT ground truth — omit sttMinConfidence.
    fetch('/api/interview/script/answer-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        interviewId,
        turnIndex: ctx.turnIndex,
        transcript: approvedTranscript,
        displayQuestion: ctx.displayQuestion,
        targetRole: interviewRef.current?.role ?? '',
        ...(ctx.questionType ? { questionType: ctx.questionType } : {}),
      }),
      signal: AbortSignal.timeout(40_000),
    })
      .then(async (res) => {
        if (!mountedRef.current || reviewFetchGenRef.current !== gen) return
        if (!res.ok) throw new Error(`answer-score ${res.status}`)
        const data = (await res.json()) as { score: AnswerScore }
        setReviewScore(data.score)
        setReviewScoreLoading(false)
      })
      .catch(() => {
        if (!mountedRef.current || reviewFetchGenRef.current !== gen) return
        setReviewScoreLoading(false)
      })
  }, [interviewId])

  const handleSubmit = useCallback(() => {
    if (!answerText.trim()) return
    submitAnswer(answerText.trim())
  }, [answerText, submitAnswer])

  const handleSkip = useCallback(() => {
    timerStopRef.current()
    stopDgListeningRef.current({ releaseQuota: false })
    elStopRef.current()
    setDgTranscript('')
    setDgInterim('')
    submitAnswer('[SKIPPED]')
  }, [submitAnswer])

  const handleRestart = useCallback(() => {
    if (window.confirm('Restart this interview? Your progress will be lost.')) {
      router.push('/dashboard')
    }
  }, [router])

  // iOS Safari unlock CTA — tap unlocks AudioContext, then runs turn ∥ mic warm.
  const handleUnlockAudio = useCallback(() => {
    interviewAudioRef.current.unlock()
    if (bootCalledRef.current) return
    bootCalledRef.current = true

    const prep = prepControllerRef.current
    prep?.setTrack('turn', 'running')
    prep?.setTrack('mic', 'running')
    setUiPhase('loading')
    setErrorMessage(null)
    turnFetchStartedAtRef.current = Date.now()

    void (async () => {
      try {
        const [micResult, turnResult] = await Promise.all([
          probeMicrophoneReadiness({
            allowGetUserMedia: false,
            unsupported: VOICE_UNSUPPORTED_ON_THIS_BROWSER,
          }),
          fetchTurnPayloadRef.current({ lastAnswer: '[NONE]' }),
        ])
        if (!mountedRef.current) return

        prep?.setMicDetail(micResult.detail)
        if (micResult.status === 'ready') {
          prep?.setTrack('mic', 'ready')
        } else if (micResult.status === 'failed') {
          prep?.setTrack('mic', 'failed')
          if (
            micResult.detail === 'denied' ||
            micResult.detail === 'unsupported' ||
            VOICE_UNSUPPORTED_ON_THIS_BROWSER
          ) {
            setMicFallback(true)
            setMicFallbackKind(micResult.detail === 'denied' ? 'permission_denied' : 'unsupported')
          }
        } else {
          prep?.setTrack('mic', 'skipped')
        }

        prep?.setTrack('turn', 'ready')
        await applyTurnPayloadRef.current(turnResult)
      } catch (err) {
        if (!mountedRef.current) return
        prep?.setTrack('turn', 'failed', {
          error: err instanceof Error ? err.message : 'turn_failed',
        })
        setErrorMessage(
          err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        )
        bootCalledRef.current = false
        releaseBootTurnApplyClaim(interviewId)
        retryRef.current = () => {
          bootCalledRef.current = true
          void loadTurnRef.current({ lastAnswer: '[NONE]' })
        }
      }
    })()
  }, [interviewId])

  // ── Derived display values ───────────────────────────────────────────────────
  const interviewerId = (interview?.interviewer_id ?? 'priya') as InterviewerId
  const interviewer = getInterviewerById(interviewerId)
  const totalQuestions = interview?.question_count ?? 0
  const displayedQuestionNumber = Math.min(Math.max(questionNumber, 1), Math.max(totalQuestions, 1))
  const progressPct =
    currentPhase === 'core' && totalQuestions > 0
      ? Math.min(100, Math.round((displayedQuestionNumber / totalQuestions) * 100))
      : 0
  const isBusy = uiPhase === 'turn_loading' || uiPhase === 'submitting'

  // ── Derived display values for UI (V1 parity) ────────────────────────────────

  // Interview mode label for top bar subtitle
  const interviewModeLabel = interview ? SCRIPT_TYPE_LABEL[interview.script_type] : 'Interview'

  // Avatar header label: shows speaking state or question count (unused since
  // the header was simplified — kept for potential future use)
  const _avatarHeaderLabel = elIsPlaying
    ? `${interviewer?.name ?? 'Priya'} is speaking`
    : `Q ${displayedQuestionNumber}/${Math.max(totalQuestions, 1)}`

  // Word index for CaptionDisplay — approximated from TTS playback progress.
  // CaptionDisplay highlights the current word being spoken.
  const captionWords = currentTurn?.speech?.trim().split(/\s+/).filter(Boolean) ?? []
  const captionWordIndex = elIsPlaying
    ? Math.min(
        Math.floor(elPlaybackProgress * captionWords.length),
        captionWords.length - 1,
      )
    : captionWords.length // all spoken (highlight nothing after done)

  // Timer ring renderer — matches V1's renderProgressRing pattern
  const renderProgressRing = (size: number) => {
    if (uiPhase === 'candidate_answering' && timerRunning) {
      return (
        <TimerCircle
          timeLeft={timeLeft}
          totalTime={currentTurn?.timer_seconds && currentTurn.timer_seconds > 0
            ? currentTurn.timer_seconds
            : 60}
          size={size}
        />
      )
    }
    // Thinking phase: show TimerCircle so the reading-buffer countdown is prominent
    if (uiPhase === 'thinking' && thinkingCountdown > 0) {
      return (
        <TimerCircle
          timeLeft={thinkingCountdown}
          totalTime={currentTurn?.reading_buffer_seconds && currentTurn.reading_buffer_seconds > 0
            ? currentTurn.reading_buffer_seconds
            : 3}
          size={size}
        />
      )
    }

    return (
      <div
        className="flex items-center justify-center rounded-full border-2 border-(--bg-tertiary)"
        style={{ width: size, height: size }}
      >
        <span className="px-1 text-center text-[10px] leading-tight text-(--text-muted)">
          {uiPhase === 'turn_ready' && elIsPlaying ? 'Speaking'
            : uiPhase === 'thinking' ? '…'
            : uiPhase === 'candidate_answering' ? 'Your turn'
            : uiPhase === 'loading' || uiPhase === 'turn_loading' ? 'Loading'
            : uiPhase === 'submitting' ? 'Saving'
            : ''}
        </span>
      </div>
    )
  }

  // Exit button — V1 pattern
  const sessionExitButton = (
    <button
      type="button"
      onClick={handleRestart}
      className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 sm:px-3 ${IE_FOCUS_VISIBLE}`}
      style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
      aria-label="Exit interview"
    >
      <X className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">Exit</span>
    </button>
  )

  // Question progress meter — V1 pattern
  const questionProgressMeter = () => (
    <div className="w-full">
      {/* Desktop: full label row */}
      <div className="mb-0.5 hidden justify-between gap-2 text-[10px] text-(--text-muted) sm:flex">
        <span className="min-w-0 truncate tabular-nums">
          {currentPhase === 'core'
            ? `Question ${displayedQuestionNumber} of ${totalQuestions}`
            : currentPhase.replace(/_/g, ' ')}
        </span>
        <span className="shrink-0 tabular-nums">{progressPct}%</span>
      </div>
      {/* Mobile: compact — phase + % in a single tight row */}
      <div className="mb-0.5 flex items-baseline justify-between gap-1 text-[10px] text-(--text-muted) sm:hidden">
        <span className="min-w-0 truncate tabular-nums">
          {currentPhase === 'core'
            ? `Q${displayedQuestionNumber}/${totalQuestions}`
            : currentPhase.replace(/_/g, ' ').replace('self intro', 'intro')}
        </span>
        <span className="shrink-0 tabular-nums">{progressPct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-(--bg-tertiary)">
        <div
          className="h-full rounded-full bg-(--accent-primary) transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  )

  // Can submit: has typed text OR has voice transcript
  const hasAnswerPayload = answerText.trim().length > 0 ||
    (dgTranscript + dgInterim).trim().length > 0

  // Derived mic state
  const dgListening = dgVoiceUiState === 'connected'
  // True while a startDgListening() attempt is already in flight. The mic toggle
  // and "Try voice again" buttons must not fire another startDgListening() call
  // while this is true — each call bumps dgStartSeqRef, silently invalidating
  // whatever attempt was already running. A user clicking repeatedly while stuck
  // on "Connecting microphone…" was causing exactly that: every click started a
  // fresh attempt that immediately outran the previous one, so no single attempt
  // ever lived long enough to reach 'connected' (visible in logs as multiple
  // deepgram_token_success events firing milliseconds apart for the same turn).
  const dgConnecting =
    dgVoiceUiState === 'connecting' || dgVoiceUiState === 'reconnecting' || dgVoiceUiState === 'retrying'

  // Single source of truth for mic status text — previously the "YOUR ANSWER" box
  // and the control-bar status row each derived their own label from dgVoiceUiState,
  // and could disagree (one saying "Waiting for microphone…", the other "Connecting
  // mic…") because only the answer box handled the non-connecting/non-connected
  // states explicitly. Both now read this one label.
  const micStatusLabel: string = micFallback
    ? micFallbackMessageForKind(micFallbackKind)
    : dgVoiceUiState === 'connected'
      ? "Mic is live — start answering using your voice, or type below."
      : dgVoiceUiState === 'connecting'
        ? (!firstMicConnected ? 'Getting ready…' : 'Connecting microphone…')
        : dgVoiceUiState === 'reconnecting'
          ? 'Reconnecting…'
          : dgVoiceUiState === 'retrying' || dgVoiceUiState === 'rate_limited'
            ? 'Voice service is busy — retrying, or you can type your answer.'
            : dgVoiceUiState === 'unavailable' || dgVoiceUiState === 'circuit_open'
              ? 'Voice unavailable right now — please type your answer.'
              : 'Waiting for microphone…'

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 flex-col"
      style={{ background: 'var(--page-gradient)' }}
    >
      {/* ── Screen reader phase announcer ── */}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {uiPhase === 'loading' || uiPhase === 'turn_loading' ? 'Preparing interview'
          : uiPhase === 'awaiting_audio_unlock' ? 'Tap Start Interview to begin'
          : uiPhase === 'turn_ready' && elIsPlaying ? 'Interviewer is speaking'
          : uiPhase === 'candidate_answering' ? 'Answer the question'
          : uiPhase === 'submitting' ? 'Submitting your answer'
          : uiPhase === 'review' ? 'Reviewing your answer'
          : uiPhase === 'completed' ? 'Interview complete'
          : ''}
      </p>

      {/* ── Top Bar ── */}
      <div
        className="shrink-0 border-b border-(--card-border)/50 bg-(--card-bg)/90 backdrop-blur-sm"
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      >

        {/* Mobile / tablet */}
        <div className="flex flex-col gap-2 px-3 py-2.5 lg:hidden">
          {/* Row 1: session info + exit */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-widest text-(--text-muted)/80">
                Interview Session
              </p>
              <h1 className="text-base font-semibold text-(--text-primary) sm:text-lg">
                Focus mode
              </h1>
              <p className="truncate text-[10px] text-(--text-muted) sm:text-[11px]">
                {interviewModeLabel}&nbsp;·&nbsp;Skips {interview?.skips_used ?? 0}/{interview?.max_skips ?? 0}
              </p>
            </div>
            {sessionExitButton}
          </div>
          {/* Row 2: timer ring (centered) + progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 flex-col items-center gap-0.5">
              {renderProgressRing(52)}
              {timerRunning && (
                <span className="text-[9px] font-medium text-(--text-muted)">Time left</span>
              )}
            </div>
            <div className="min-w-0 flex-1">{questionProgressMeter()}</div>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 py-2 lg:grid">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[10px] font-medium uppercase tracking-widest text-(--text-muted)/80">
              Interview Session
            </p>
            <h1 className="text-lg font-semibold text-(--text-primary) sm:text-xl">
              Focus mode
            </h1>
            <p className="text-[11px] text-(--text-muted)">
              {interviewModeLabel}&nbsp;·&nbsp;Skips {interview?.skips_used ?? 0}/{interview?.max_skips ?? 0}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center justify-center gap-1">
            {renderProgressRing(72)}
            {timerRunning && (
              <span className="text-[10px] font-medium text-(--text-muted)">Time left</span>
            )}
          </div>
          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <div className="w-24 sm:w-28 xl:w-36">{questionProgressMeter()}</div>
            {sessionExitButton}
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden max-lg:overflow-y-auto lg:grid-cols-[min(340px,100%)_minmax(0,1fr)] lg:grid-rows-1 xl:grid-cols-[380px_minmax(0,1fr)] lg:divide-x lg:divide-(--card-border)/60">

        {/* ── Video strip ── */}
        <div className="session-video-strip flex min-h-0 shrink-0 flex-row divide-x divide-(--card-border)/60 overflow-hidden max-lg:max-h-[min(36dvh,280px)] lg:max-h-none lg:flex-col lg:divide-x-0 lg:divide-y">

          {/* Interviewer panel */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="session-flush-panel dashboard-premium-card flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between border-b border-(--card-border) px-2 py-2 sm:px-3 sm:py-2.5">
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-(--accent-primary)/25 bg-(--accent-primary)/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-(--accent-primary) sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-[0.16em]">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full bg-(--accent-primary) ${
                      elIsPlaying ? 'animate-pulse' : ''
                    }`}
                  />
                  <span className="truncate">AI Interviewer</span>
                </span>
                {elIsPlaying && (
                  <span className="ie-timer-secondary shrink-0 sm:text-[11px]">
                    {interviewer?.name ?? 'Priya'} is speaking
                  </span>
                )}
              </div>

              <div className="relative min-h-0 flex-1">
                <AvatarPlayer
                  interviewerId={interviewerId}
                  isSpeaking={elIsPlaying}
                  objectFit="responsive"
                  fillContainer
                  className="bg-(--bg-secondary)"
                />
              </div>

              <p className="hidden shrink-0 border-t border-(--card-border)/60 px-4 py-2 text-[11px] text-(--text-secondary) lg:block">
                Interviewer: {interviewer?.name ?? 'Priya'}
              </p>
            </div>
          </div>

          {/* Candidate panel */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <CandidatePreview
              cameraActive={cameraEnabled && uiPhase === 'candidate_answering'}
              voiceLive={dgListening}
              micArmed={!micFallback}
              userMicMuted={false}
              cameraEnabled={cameraEnabled}
              onToggleCamera={() => setCameraEnabled((prev) => !prev)}
            />
          </div>
        </div>

        {/* ── Right: Answer Panel ── */}
        <div className="flex min-h-0 min-w-0 flex-col gap-0 divide-y divide-(--card-border)/60 overflow-hidden">

          {/* Main content area */}
          <div className="session-flush-panel dashboard-premium-card flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden p-4">
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">

              {/* ── AUDIO UNLOCK (iOS Safari) — tap gesture required before TTS ── */}
              {uiPhase === 'awaiting_audio_unlock' && (
                <div className="flex min-h-[300px] flex-1 flex-col items-center justify-center gap-6 px-6 py-8 text-center">
                  <div className="flex size-20 items-center justify-center rounded-full bg-(--accent-primary)/10">
                    <svg className="size-10 text-(--accent-primary)" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M12 3a9 9 0 110 18A9 9 0 0112 3zm-1 5v8l6-4-6-4z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-(--text-primary)">Ready to begin?</h2>
                    <p className="mt-2 text-sm text-(--text-muted)">
                      Tap to unlock audio so {interviewer?.name ?? 'Priya'} can speak your questions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUnlockAudio}
                    className={`min-h-[52px] w-full max-w-xs touch-manipulation rounded-2xl bg-(--accent-primary) px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-transform active:scale-95 ${IE_FOCUS_VISIBLE}`}
                  >
                    Start Interview
                  </button>
                </div>
              )}

              {/* ── LOADING — branded prep screen ── */}
              {/* Shown for the initial 'loading' phase AND for 'turn_loading' when
                  it's still the very first turn — prevents the old spinner from
                  flashing in as a second, visually-different loading state right
                  after this screen. */}
              {(uiPhase === 'loading' || (uiPhase === 'turn_loading' && !firstTurnShown)) && (
                <div className="flex h-full min-h-[300px] flex-1 items-center justify-center rounded-xl p-4"
                  style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)' }}>
                  <div className="w-full max-w-sm rounded-2xl bg-(--card-bg) p-6 shadow-lg">
                    {/* Avatar + tagline */}
                    <div className="mb-5 flex flex-col items-center gap-3 text-center">
                      <Image
                        src={interviewer?.avatarImage ?? '/avatars/female/female-avatar.png'}
                        alt={interviewer?.name ?? 'Priya'}
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-full object-cover ring-2 ring-(--card-border)"
                      />
                      <div>
                        <p className="text-[15px] font-semibold text-(--text-primary)">
                          {interviewer?.name ?? 'Priya'} is preparing your session
                        </p>
                        {interview?.role && (
                          <span className="mt-1.5 inline-block rounded-full bg-(--bg-secondary) px-3 py-0.5 text-xs text-(--text-secondary)">
                            {interview.role} mock interview
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Live prep checklist — driven by SessionPrepController */}
                    <div className="mb-5 flex flex-col gap-3">
                      {PREP_CHECKLIST.map(({ id, label }, i) => {
                        const status = prepSnap[id]
                        const done = status === 'ready' || status === 'skipped'
                        const failed = status === 'failed'
                        const active = status === 'running' || (status === 'idle' && !done && !failed && (
                          // Highlight the first pending track so idle isn't all blank.
                          PREP_CHECKLIST.findIndex((row) => {
                            const s = prepSnap[row.id]
                            return s === 'running' || s === 'idle'
                          }) === i
                        ))
                        return (
                          <div key={id} className="flex items-center gap-3">
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-300 ${
                              failed
                                ? 'bg-red-500 text-white'
                                : done
                                  ? 'bg-(--accent-primary) text-white'
                                  : active
                                    ? 'border-2 border-(--accent-primary) text-(--accent-primary)'
                                    : 'border-2 border-(--card-border) text-(--text-muted)'
                            }`}>
                              {failed ? '!' : done ? '✓' : i + 1}
                            </span>
                            <span className={`text-sm transition-colors duration-300 ${
                              failed
                                ? 'font-medium text-red-600'
                                : done || active
                                  ? 'font-medium text-(--text-primary)'
                                  : 'text-(--text-muted)'
                            }`}>
                              {id === 'mic' && status === 'failed' && prepSnap.micDetail === 'denied'
                                ? 'Microphone blocked — typing is ready'
                                : id === 'mic' && status === 'failed' && prepSnap.micDetail === 'unsupported'
                                  ? 'Voice unavailable on this browser'
                                  : id === 'mic' && status === 'ready'
                                    ? 'Microphone ready'
                                    : label}
                            </span>
                            {active && !done && !failed && (
                              <span className={`ml-auto h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-(--card-border) border-t-(--accent-primary)`} />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <p className="text-center text-[11px] text-(--text-muted)">
                      {prepSnap.profile === 'ready' && prepSnap.turn === 'running'
                        ? 'Building your first question from the script…'
                        : prepSnap.mic === 'running'
                          ? 'Warming mic while questions prepare…'
                          : 'Usually ready in a few seconds — stay on this page.'}
                    </p>
                  </div>
                </div>
              )}

              {/* ── TURN LOADING — honest wait state (subsequent turns) ── */}
              {uiPhase === 'turn_loading' && firstTurnShown && (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-(--text-secondary)">
                  <span className={`${IE_SPINNER_LG_CLASS} rounded-full border-2 border-(--card-border) border-t-(--accent-primary)`} />
                  <p className="text-sm font-medium text-(--text-primary)">
                    {currentPhase === 'warmup'
                      ? 'Preparing your first question…'
                      : 'Preparing the next question…'}
                  </p>
                  <p className="max-w-xs text-center text-[11px] text-(--text-muted)">
                    The interviewer is generating the next turn. This usually takes a few seconds.
                  </p>
                </div>
              )}

              {/* ── INTERVIEWER SPEAKING / turn ready ── */}
              {/* Show question text as soon as the turn is applied — do NOT wait
                  for TTS isPlaying (that gap was the blank white screen after Continue). */}
              {uiPhase === 'turn_ready' && (
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--accent-primary)/40" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-(--accent-primary)" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-(--text-secondary)">
                      {elIsPlaying
                        ? `${interviewer?.name ?? 'Priya'} is speaking`
                        : `${interviewer?.name ?? 'Priya'} is starting…`}
                    </span>
                  </div>

                  {currentTurn?.speech && (
                    elIsPlaying ? (
                      <CaptionDisplay
                        fullText={currentTurn.speech}
                        currentWordIndex={captionWordIndex}
                      />
                    ) : (
                      <p className="min-h-0 flex-1 overflow-y-auto text-base leading-relaxed text-(--text-primary) sm:text-lg">
                        {currentTurn.speech}
                      </p>
                    )
                  )}

                  <p className="shrink-0 text-center text-[11px] text-(--text-muted)">
                    Your timer starts once the question is read
                  </p>
                </div>
              )}

              {/* ── THINKING (post-TTS: countdown + mic connecting) ── */}
              {/* Candidate reads the question while reading_buffer_seconds
                  counts down. STT connects in background. Timer starts only
                  once countdown hits 0 AND mic opens. */}
              {uiPhase === 'thinking' && (
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
                  <div className="flex shrink-0 items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--accent-primary)/40" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-(--accent-primary)" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-widest text-(--text-secondary)">
                        Read the question
                      </span>
                    </div>
                    {thinkingCountdown > 0 && (
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-(--text-muted)">
                        {thinkingCountdown}s
                      </span>
                    )}
                  </div>

                  {currentTurn?.is_question && (currentTurn?.display_question || currentTurn?.speech) && (
                    <div className="shrink-0 rounded-xl border border-(--card-border)/60 bg-(--bg-secondary)/50 p-3.5 sm:p-4">
                      <p className="text-base leading-relaxed text-(--text-primary) sm:text-[1.05rem]">
                        {currentTurn.display_question || currentTurn.speech}
                      </p>
                    </div>
                  )}

                  <p className="shrink-0 text-center text-[11px] text-(--text-muted)">
                    {thinkingCountdown > 0
                      ? (dgVoiceUiState === 'connecting' || dgVoiceUiState === 'reconnecting' || dgVoiceUiState === 'retrying')
                        ? 'Read the question — connecting microphone…'
                        : 'Take your time to think…'
                      : dgVoiceUiState === 'connected'
                        ? 'Mic ready — starting timer…'
                        : 'Connecting microphone…'}
                  </p>
                </div>
              )}

              {/* ── AUTO TURN (transition/acknowledgment) ── */}
              {uiPhase === 'auto_turn' && !elIsPlaying && (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-4 text-center">
                  <div className="flex items-center gap-2">
                    <Radio size={14} className="animate-pulse text-(--accent-primary)" />
                    <span className="text-xs font-semibold text-(--accent-primary)">
                      {interviewer?.name ?? 'Priya'} is responding…
                    </span>
                  </div>
                  {currentTurn?.speech && (
                    <p className="max-w-md text-sm leading-relaxed text-(--text-secondary)">
                      {currentTurn.speech}
                    </p>
                  )}
                </div>
              )}

              {/* ── AUTO TURN with TTS playing ── */}
              {uiPhase === 'auto_turn' && elIsPlaying && (
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                  <div className="flex shrink-0 items-center gap-2">
                    <Radio size={14} className="animate-pulse text-(--accent-primary)" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-(--accent-primary)">
                      {interviewer?.name ?? 'Priya'} is speaking
                    </span>
                  </div>
                  {currentTurn?.speech && (
                    <CaptionDisplay
                      fullText={currentTurn.speech}
                      currentWordIndex={captionWordIndex}
                    />
                  )}
                </div>
              )}

              {/* ── CANDIDATE ANSWERING ── */}
              {uiPhase === 'candidate_answering' && (
                <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 overflow-hidden">
                  {/* Current question box — display_question can legitimately be null even
                      for is_question:true turns (turn-validator only enforces the reverse),
                      so fall back to the spoken text. Guarded on is_question so a stale or
                      in-flight acknowledgment/transition turn is never mislabeled as "the
                      current question" while candidate_answering renders. */}
                  {currentTurn?.is_question && (currentTurn?.display_question || currentTurn?.speech) && (
                    <div className="shrink-0 rounded-xl border border-(--card-border)/60 bg-(--bg-secondary)/50 p-3.5 sm:p-4">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                        Current Question
                      </p>
                      <p className="text-base leading-relaxed text-(--text-primary) sm:text-[1.05rem]">
                        {currentTurn?.display_question || currentTurn?.speech}
                      </p>
                    </div>
                  )}

                  {/* Tip */}
                  {currentTurn?.tip && (
                    <div className="shrink-0 rounded-xl border border-(--card-border) bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)] p-3">
                      <p className="text-sm text-(--text-secondary)">{currentTurn.tip}</p>
                    </div>
                  )}

                  {/* Live transcript / fallback textarea */}
                  {!micFallback ? (
                    <div className="flex min-h-0 flex-1 flex-col gap-2">
                      <div className="flex min-h-0 flex-col w-full rounded-xl border border-(--card-border) bg-(--bg-secondary) px-4 py-3.5"
                        style={{ flex: dgVoiceUiState === 'retrying' || dgVoiceUiState === 'rate_limited' ? '0 0 auto' : '1 1 0', minHeight: 120 }}>
                        <div className="mb-2 flex shrink-0 items-baseline justify-between gap-2">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                            {dgListening ? 'Live transcript' : 'Your answer'}
                          </p>
                          {dgListening && (
                            <span className="flex items-center gap-1 text-[10px] text-(--accent-success)">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--accent-success)" />
                              Listening…
                            </span>
                          )}
                        </div>
                        <div
                          ref={liveTranscriptScrollRef}
                          data-clarity-mask="true"
                          className="min-h-0 flex-1 touch-pan-y overflow-y-auto"
                          style={{ WebkitOverflowScrolling: 'touch' }}
                        >
                          {dgTranscript || dgInterim ? (
                            <p className="text-sm leading-relaxed text-(--text-primary)">
                              {dgTranscript}
                              {dgInterim && (
                                <span className="italic text-(--text-secondary)"> {dgInterim}</span>
                              )}
                            </p>
                          ) : (
                            <p className="text-sm text-(--text-muted)">{micStatusLabel}</p>
                          )}
                        </div>
                      </div>
                      {/* Show textarea immediately while voice retries so candidate can type */}
                      {(dgVoiceUiState === 'retrying' || dgVoiceUiState === 'rate_limited') && (
                        <textarea
                          data-clarity-mask="true"
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="Type your answer — or use your keyboard's 🎤 mic button to speak"
                          disabled={isBusy}
                          className="box-border block min-h-[80px] min-w-0 w-full max-w-full flex-1 resize-none overflow-y-auto rounded-xl border border-(--card-border) bg-(--card-bg) p-3 text-sm leading-relaxed text-(--text-primary) outline-none focus:border-(--accent-primary) disabled:opacity-60"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col gap-2">
                      {VOICE_UNSUPPORTED_ON_THIS_BROWSER ? (
                        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-700 dark:bg-amber-950/30" role="status">
                          <span className="mt-0.5 shrink-0 text-base">🎙️</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Voice unavailable in this browser</p>
                            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                              iPhone microphone only works in <strong>Safari</strong>. Type your answer below, or open this page in Safari for the full voice experience.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={IE_ALERT_BANNER_CLASS} style={IE_ALERT_WARNING_STYLE} role="status">
                            Voice input paused — type below or use your keyboard&apos;s mic 🎤
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (dgConnecting) return
                              setMicFallback(false)
                              timerResetRef.current((currentTurn?.timer_seconds ?? 0) > 0 ? (currentTurn?.timer_seconds ?? 60) : 60)
                              onMicReadyRef.current = () => {
                                if (!mountedRef.current) return
                                setTimeout(() => { if (mountedRef.current) timerStartRef.current() }, 0)
                              }
                              void startDgListeningRef.current()
                            }}
                            disabled={dgConnecting}
                            className="min-h-[44px] shrink-0 touch-manipulation rounded-lg border border-(--card-border) px-3 py-1.5 text-xs font-semibold text-(--text-primary) hover:bg-(--bg-secondary) disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {dgConnecting ? 'Connecting…' : 'Try voice again'}
                          </button>
                        </>
                      )}
                      <textarea
                        data-clarity-mask="true"
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Type your answer — or use your keyboard's 🎤 mic button to speak"
                        disabled={isBusy}
                        className="box-border block min-h-0 flex-1 min-w-0 w-full max-w-full resize-none overflow-y-auto rounded-xl border border-(--card-border) bg-(--card-bg) p-3 text-sm leading-relaxed text-(--text-primary) outline-none focus:border-(--accent-primary) disabled:opacity-60"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── SUBMITTING ── */}
              {uiPhase === 'submitting' && (
                <div className="flex flex-1 items-center justify-center" role="status" aria-live="polite">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-end gap-[3px]" style={{ height: 32 }} aria-hidden>
                      {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.4, 0.7, 1, 0.6, 0.9].map((h, i) => (
                        <span
                          key={i}
                          className="w-[4px] rounded-full bg-(--accent-primary)/75 ie-thinking-bar"
                          style={{ height: `${h * 100}%`, animationDelay: `${i * 80}ms` }}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-(--text-secondary)">Saving your answer…</p>
                  </div>
                </div>
              )}

              {/* ── COMPLETED ── */}
              {uiPhase === 'completed' && (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-4 text-center">
                  <h2 className="text-2xl font-bold text-(--text-primary)">Interview Complete</h2>
                  {currentTurn?.speech && (
                    <p className="max-w-md text-base text-(--text-secondary)">{currentTurn.speech}</p>
                  )}
                  <Link
                    href={`/report/script/${interviewId}`}
                    className="mt-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
                  >
                    View Report
                  </Link>
                </div>
              )}

              {/* ── ERROR ── */}
              {errorMessage && uiPhase !== 'completed' && (
                <div className="space-y-3">
                  <div className={IE_ALERT_BANNER_CLASS} style={IE_ALERT_ERROR_STYLE} role="alert">
                    {errorMessage}
                  </div>
                  <button
                    type="button"
                    onClick={() => retryRef.current?.()}
                    className="rounded-lg bg-(--accent-primary) px-4 py-2 text-sm font-semibold text-white"
                  >
                    Try again
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* ── Control Bar ── */}
          {(uiPhase === 'candidate_answering' || uiPhase === 'turn_ready' || uiPhase === 'submitting') && (
            <div
              className="session-flush-panel dashboard-premium-card w-full min-w-0 shrink-0 p-3 max-lg:sticky max-lg:bottom-0 max-lg:z-10 sm:p-4"
              style={{
                paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
              }}
            >
              {/* Top row: restart + mic status */}
              <div className="flex items-center justify-between gap-3 border-b border-(--card-border)/50 pb-3 mb-3">
                <button
                  type="button"
                  onClick={handleRestart}
                  className={`flex min-h-[44px] items-center gap-1.5 text-xs text-(--text-muted) hover:text-(--text-secondary) transition-colors ${IE_FOCUS_VISIBLE}`}
                >
                  <RotateCcw className="size-3" aria-hidden />
                  <span className="hidden sm:inline">Restart interview</span>
                </button>
                <div className="flex min-h-[44px] items-center gap-1.5 text-xs text-(--text-muted)" aria-live="polite">
                  {dgListening && !micFallback ? (
                    <>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" aria-hidden />
                      <span className="hidden sm:inline">Listening…</span>
                    </>
                  ) : micFallback ? (
                    <>
                      <MicOff size={12} aria-hidden />
                      <span className="hidden sm:inline">Type your answer</span>
                    </>
                  ) : (
                    <>
                      <Mic size={12} aria-hidden />
                      <span className="hidden sm:inline">
                        {uiPhase !== 'candidate_answering' ? 'Waiting'
                          : dgVoiceUiState === 'connecting' ? 'Connecting mic…'
                          : dgVoiceUiState === 'reconnecting' ? 'Reconnecting…'
                          : dgVoiceUiState === 'retrying' || dgVoiceUiState === 'rate_limited' ? 'Voice busy…'
                          : dgVoiceUiState === 'unavailable' || dgVoiceUiState === 'circuit_open' ? 'Voice unavailable'
                          : 'Waiting'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Buttons row */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Mic toggle button */}
                <button
                  type="button"
                  onClick={() => {
                    if (dgConnecting) return
                    if (micFallback) {
                      setMicFallback(false)
                      void startDgListeningRef.current()
                    } else if (dgListening) {
                      stopDgListeningRef.current({ releaseQuota: false })
                    } else {
                      void startDgListeningRef.current()
                    }
                  }}
                  disabled={uiPhase !== 'candidate_answering' || dgConnecting || VOICE_UNSUPPORTED_ON_THIS_BROWSER}
                  aria-label={dgListening ? 'Stop microphone' : dgConnecting ? 'Connecting microphone…' : 'Start microphone'}
                  className={`ie-control-icon-btn flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${IE_FOCUS_VISIBLE} ${IE_TRANSITION_COLORS} ${
                    dgListening && !micFallback
                      ? 'border-(--accent-danger)/40 bg-(--accent-danger)/10 text-(--accent-danger)'
                      : 'border-(--card-border) bg-(--bg-secondary) text-(--text-secondary)'
                  }`}
                >
                  {dgListening && !micFallback
                    ? <Mic size={18} className="animate-pulse" />
                    : <MicOff size={18} />}
                </button>

                {/* Submit button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!hasAnswerPayload || uiPhase !== 'candidate_answering'}
                  className={`min-h-[44px] flex-1 flex touch-manipulation items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed ${IE_FOCUS_VISIBLE} ${IE_TRANSITION_COLORS} ${
                    hasAnswerPayload && uiPhase === 'candidate_answering'
                      ? 'text-white hover:opacity-95'
                      : 'text-(--text-secondary)'
                  }`}
                  style={{
                    background:
                      hasAnswerPayload && uiPhase === 'candidate_answering'
                        ? 'linear-gradient(135deg, #6366F1, #818CF8)'
                        : 'var(--bg-tertiary)',
                  }}
                >
                  <Send size={16} aria-hidden />
                  Submit answer
                </button>

                {/* Re-hear question button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!currentTurn) return
                    const tone =
                      currentTurn.interviewer_emotion === 'warm' ? 'encouraging' as const
                      : currentTurn.interviewer_emotion === 'challenging' ? 'challenging' as const
                      : 'neutral' as const
                    timerStopRef.current()
                    stopDgListeningRef.current({ releaseQuota: false })
                    setUiPhase('turn_ready')
                    void elSpeakRef.current(currentTurn.speech, tone, {
                      onPlaybackComplete: () => {
                        if (!mountedRef.current) return
                        timerResetRef.current(
                          currentTurn.timer_seconds > 0 ? currentTurn.timer_seconds : 60
                        )
                        setTimeout(() => {
                          if (!mountedRef.current) return
                          timerStartRef.current()
                          void startDgListeningRef.current()
                          setUiPhase('candidate_answering')
                        }, 0)
                      },
                      onPlaybackFailed: () => {
                        if (!mountedRef.current) return
                        setUiPhase('candidate_answering')
                      },
                    })
                  }}
                  disabled={uiPhase !== 'candidate_answering' || !currentTurn?.is_question}
                  aria-label="Re-hear question"
                  title="Re-hear question"
                  className={`ie-control-icon-btn flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-(--card-border) bg-(--bg-secondary) text-(--text-secondary) transition-colors hover:text-(--text-primary) disabled:opacity-40 disabled:cursor-not-allowed ${IE_FOCUS_VISIBLE}`}
                >
                  <RotateCcw size={16} aria-hidden />
                </button>

                {/* Skip button */}
                {currentTurn?.allow_skip && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={uiPhase !== 'candidate_answering'}
                    aria-label="Skip question"
                    title="Skip question"
                    className={`ie-control-icon-btn flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-(--card-border) bg-(--bg-secondary) text-(--text-secondary) transition-colors hover:text-(--text-primary) disabled:opacity-40 disabled:cursor-not-allowed ${IE_FOCUS_VISIBLE}`}
                  >
                    <SkipForward size={16} aria-hidden />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FULL-WINDOW REVIEW: step 1 transcript → step 2 coaching + score ── */}
      {reviewOpen && (() => {
        const wordCount = editedRaw.trim().split(/\s+/).filter(Boolean).length
        const coachName = interviewer?.name ?? 'Priya'
        const coaching = reviewStructured?.coaching_reference
        const coachFeedback =
          coaching?.feedback?.trim() ||
          (reviewStructured && !reviewStructuredLoading
            ? 'Solid answer. Keep the same clarity on the next question.'
            : '')
        const missingSummary =
          coaching && coaching.missing_elements.length > 0
            ? `Next time, add: ${coaching.missing_elements.join(' · ')}`
            : null

        const approveTranscript = () => {
          const approved = editedRaw
          const original = reviewRawAnswerRef.current
          // Coaching + score must reflect what the candidate actually approved.
          // Unchanged → reuse step-1 prefetch. Edited / STT-accepts → re-fetch.
          if (approved.trim() !== original.trim()) {
            fetchFeedbackForApprovedTranscript(approved)
          }
          // Overlap next-question LLM with feedback reading time.
          startNextTurnPrefetch(approved)
          setReviewStep('feedback')
        }

        const continueAfterFeedback = () => {
          if (continuingFromReview) return
          setContinuingFromReview(true)

          // Keep the feedback overlay up until the next turn is in hand and
          // applied — closing first was painting a blank main pane (uiPhase
          // was still 'review' / turn_ready without TTS).
          void (async () => {
            const nextPhase = reviewNextPhaseRef.current
            const resolve = reviewResolveRef.current

            try {
              // Ensure prefetch exists (Approve should have started it).
              if (!nextTurnPrefetchRef.current) {
                startNextTurnPrefetch(editedRaw)
              }
              const prefetch = nextTurnPrefetchRef.current
              let data: TurnApiResponse | null = null
              if (prefetch) {
                try {
                  data = prefetch.result ?? (await prefetch.promise)
                } catch {
                  data = null
                }
                nextTurnPrefetchRef.current = null
                setNextTurnPrefetchReady(false)
              }

              if (data && nextPhase) {
                reviewResolveRef.current = null
                currentPhaseRef.current = nextPhase
                clearAutoTimer()
                setAnswerText('')
                setErrorMessage(null)
                // Apply BEFORE closing overlay so the first paint after close
                // already has currentTurn + turn_ready content.
                await applyTurnPayloadRef.current(data)
                if (!mountedRef.current) return
                setReviewOpen(false)
                setReviewStep('transcript')
                return
              }

              // Prefetch missing/failed — fall back to normal loadTurn path.
              reviewResolveRef.current = null
              setReviewOpen(false)
              setReviewStep('transcript')
              setNextTurnPrefetchReady(false)
              resolve?.('raw', editedRaw)
            } catch {
              if (!mountedRef.current) return
              reviewResolveRef.current = null
              setReviewOpen(false)
              setReviewStep('transcript')
              setNextTurnPrefetchReady(false)
              resolve?.('raw', editedRaw)
            } finally {
              if (mountedRef.current) setContinuingFromReview(false)
            }
          })()
        }

        return (
          <div
            className="fixed inset-0 z-50 flex flex-col bg-(--bg-primary) lg:left-[15.25rem]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-popup-title"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:gap-3 sm:p-5 lg:overflow-hidden">
              <h2
                id="review-popup-title"
                className="shrink-0 text-center text-sm font-bold tracking-wide text-(--accent-primary) sm:text-base"
              >
                {reviewStep === 'transcript' ? 'Review transcript' : 'Feedback on your answer'}
              </h2>

              {reviewStep === 'transcript' ? (
                <section className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-2xl border border-(--card-border) bg-(--card-bg) p-4 sm:p-5">
                  <p className="mb-2 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                    Your answer{' '}
                    <span className="ml-2 normal-case font-normal">
                      (tap highlighted words to fix STT · ¶ break for paragraphs · or click to edit)
                    </span>
                  </p>
                  <ReviewAnswerHighlightEditor
                    value={editedRaw}
                    onChange={setEditedRaw}
                    correctedTranscript={
                      reviewStructuredLoading ? null : (reviewStructured?.corrected_transcript ?? null)
                    }
                    placeholder="Your captured answer"
                    autoFocus
                  />
                  <div className="mt-3 flex shrink-0 flex-col gap-2 border-t border-(--card-border)/60 pt-3">
                    <p className="text-[11px] text-(--text-muted)">
                      {wordCount > 0 ? `${wordCount} words` : 'No answer captured'}
                    </p>
                    <button
                      type="button"
                      onClick={approveTranscript}
                      disabled={wordCount === 0}
                      className={`flex min-h-[48px] w-full touch-manipulation items-center justify-center rounded-xl bg-(--accent-primary) px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${IE_FOCUS_VISIBLE}`}
                    >
                      Approve answer
                    </button>
                  </div>
                </section>
              ) : (
                <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3">
                  {/* Side-by-side on lg+: each column keeps its own scroller. */}
                  <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
                    <section
                      className="flex min-h-[16rem] flex-col overflow-hidden rounded-2xl border px-4 py-3 sm:px-5 lg:min-h-0"
                      style={{
                        background:
                          'color-mix(in srgb, var(--accent-primary) 8%, var(--card-bg))',
                        borderColor:
                          'color-mix(in srgb, var(--accent-primary) 28%, var(--card-border))',
                      }}
                      aria-live="polite"
                    >
                      <p className="mb-1 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-(--accent-primary)">
                        How you could strengthen this
                      </p>
                      <p className="mb-3 shrink-0 text-[11px] text-(--text-muted)">
                        Coaching only — based on the answer you just approved. Not submitted as your answer.
                      </p>
                      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                        {reviewStructuredLoading ? (
                          <div className="flex animate-pulse flex-col gap-2">
                            <div className="h-3 w-full rounded bg-(--bg-tertiary)" />
                            <div className="h-3 w-4/5 rounded bg-(--bg-tertiary)" />
                            <div className="h-3 w-3/5 rounded bg-(--bg-tertiary)" />
                          </div>
                        ) : coaching ? (
                          <div className="flex gap-3">
                            <div
                              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--accent-primary)/20 text-xs font-bold text-(--accent-primary)"
                              aria-hidden
                            >
                              {coachName.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1 space-y-3">
                              {coachFeedback && (
                                <p className="text-sm leading-snug text-(--text-primary) sm:text-[15px]">
                                  {coachFeedback}
                                </p>
                              )}
                              {missingSummary && (
                                <p className="text-[12px] leading-snug text-(--text-secondary)">
                                  <span className="text-(--accent-warning)">⚠</span> {missingSummary}
                                </p>
                              )}
                              {coaching.restructured_example.length > 0 && (
                                <div className="rounded-xl border border-(--card-border)/70 bg-(--card-bg)/70 p-3">
                                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                                    Stronger example (reference)
                                  </p>
                                  <div className="flex flex-col gap-1.5">
                                    {coaching.restructured_example.map((line, i) => (
                                      <p key={i} className="text-[13px] leading-relaxed text-(--text-secondary)">
                                        {line}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {coaching.technical_terms.length > 0 && (
                                <div>
                                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                                    Key terms
                                  </p>
                                  <div className="flex flex-col gap-1">
                                    {coaching.technical_terms.map((tt, i) => (
                                      <p key={i} className="text-[12px] text-(--text-secondary)">
                                        <span className="font-semibold text-(--text-primary)">{tt.term}</span>
                                        {tt.pronunciation && (
                                          <span className="text-(--text-muted)"> ({tt.pronunciation})</span>
                                        )}
                                        {' — '}
                                        {tt.definition}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-(--text-muted)">Coaching unavailable for this turn.</p>
                        )}
                      </div>
                    </section>

                    <div className="flex min-h-[16rem] flex-col overflow-hidden lg:min-h-0">
                      <AnswerScoreCard score={reviewScore} loading={reviewScoreLoading} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={continueAfterFeedback}
                    disabled={continuingFromReview}
                    className={`flex min-h-[48px] w-full shrink-0 touch-manipulation items-center justify-center rounded-xl bg-(--accent-primary) px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-wait disabled:opacity-80 ${IE_FOCUS_VISIBLE}`}
                  >
                    {continuingFromReview
                      ? 'Opening next question…'
                      : nextTurnPrefetchReady
                        ? 'Continue to next question'
                        : 'Continue · preparing next…'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
