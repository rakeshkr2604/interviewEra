'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { InterviewerTone } from '@/lib/voice/tts-client'
import type { VoiceMetadata } from '@/lib/interview/interview-orchestrator'
import type { RuntimePhase } from '@/lib/interview/runtime-phase'
import type { InterviewQuestion } from '@/types/interview.types'
import { needsAudioGestureUnlock } from '@/lib/voice/audio-gesture'
import { interviewFlowLog } from '@/lib/voice/interview-flow-log'
import type { AvatarAnsweringReason } from '@/lib/voice/avatar-completion'
import { readAiVoiceEnabled } from '@/lib/settings/client-preferences'
import type { PlaybackCallbacks } from '@/lib/voice/playback-callbacks'
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'
import { trackAvatarTelemetry } from '@/lib/voice/avatar-telemetry'

const AVATAR_FINISHED_BRIDGE_MS = 500
const AUDIO_STUCK_MS = 8_000

interface UseInterviewAvatarSpeakingParams {
  phase: RuntimePhase
  setPhase: (p: RuntimePhase) => void
  phaseRef: React.MutableRefObject<RuntimePhase>
  mountedRef: React.MutableRefObject<boolean>
  currentIndex: number
  currentQuestion: InterviewQuestion | undefined
  interviewRole: string
  totalQuestions: number
  interviewerDisplayName: string
  pendingFollowUp: { text: string; tone: InterviewerTone } | null
  inputMode: 'voice' | 'text' | 'deepgram'
  audioUnlocked: boolean
  telemetryCtx: InterviewTelemetryContext
  buildIntro: (
    index: number,
    questionText: string,
    interviewerName: string,
    role: string,
    total: number,
  ) => string
  speakQuestion: (text: string, callbacks?: PlaybackCallbacks) => void
  stopSpeaking: () => void
  elSpeak: (
    text: string,
    tone: InterviewerTone,
    callbacks?: PlaybackCallbacks,
  ) => Promise<void>
  elStop: () => void
  isSpeaking: boolean
  elIsPlaying: boolean
  currentWordIndex: number
  lastVoiceMeta: VoiceMetadata | null
  onAvatarFinished: (reason: AvatarAnsweringReason) => void
}

export interface UseInterviewAvatarSpeakingReturn {
  spokenText: string
  awaitingAudioTap: boolean
  showPlaybackRecovery: boolean
  playbackFailureMessage: string
  continueWithoutAudio: () => void
  retryAudio: () => void
  /** True only after confirmed audio playback — drives video, badge, captions. */
  audioActuallyStarted: boolean
  speakingProgressPct: number | null
  avatarHeaderLabel: string
}

export function useInterviewAvatarSpeaking(
  params: UseInterviewAvatarSpeakingParams,
): UseInterviewAvatarSpeakingReturn {
  const {
    phase,
    setPhase,
    phaseRef,
    mountedRef,
    currentIndex,
    currentQuestion,
    interviewRole,
    totalQuestions,
    interviewerDisplayName,
    pendingFollowUp,
    inputMode,
    audioUnlocked,
    telemetryCtx,
    buildIntro,
    speakQuestion,
    stopSpeaking,
    elSpeak,
    elStop,
    isSpeaking,
    elIsPlaying,
    currentWordIndex,
    lastVoiceMeta,
    onAvatarFinished,
  } = params

  const [spokenText, setSpokenText] = useState('')
  const [playbackFailed, setPlaybackFailed] = useState(false)
  const [playbackFailureMessage, setPlaybackFailureMessage] = useState(
    'Avatar audio could not start.',
  )
  const [speakAttempt, setSpeakAttempt] = useState(0)

  const finishBridgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const introRef = useRef('')
  const playbackStartedRef = useRef(false)

  const audioActuallyStarted = isSpeaking || elIsPlaying

  useEffect(() => {
    if (audioActuallyStarted && !playbackStartedRef.current) {
      playbackStartedRef.current = true
      trackAvatarTelemetry('avatar_audio_started', telemetryCtx, { mode: inputMode })
      interviewFlowLog('tts', 'tts_playback_detected', {
        questionIndex: currentIndex,
        engine: elIsPlaying ? 'elevenlabs' : 'browser',
      })
    }
    if (!audioActuallyStarted) {
      playbackStartedRef.current = false
    }
  }, [audioActuallyStarted, currentIndex, elIsPlaying, inputMode, telemetryCtx])

  const awaitingAudioTap =
    phase === 'awaiting_audio_unlock' ||
    (phase === 'avatar_speaking' && needsAudioGestureUnlock() && !audioUnlocked)

  const finishAuthorized = useCallback(
    (reason: AvatarAnsweringReason) => {
      if (finishBridgeTimerRef.current) {
        clearTimeout(finishBridgeTimerRef.current)
        finishBridgeTimerRef.current = null
      }
      setPlaybackFailed(false)
      playbackStartedRef.current = false

      if (reason === 'audio_completed') {
        trackAvatarTelemetry('avatar_audio_completed', telemetryCtx, { mode: inputMode })
        try { stopSpeaking() } catch { /* */ }
        try { elStop() } catch { /* */ }
      }
      if (reason === 'user_continue') {
        trackAvatarTelemetry('avatar_continue_without_audio', telemetryCtx, { mode: inputMode })
      }

      interviewFlowLog('avatar', 'avatar_speaking_finished', {
        questionIndex: currentIndex,
        reason,
      })

      if (phaseRef.current !== 'avatar_speaking') return
      setPhase('avatar_finished')
      interviewFlowLog('avatar', 'avatar_finished_entered', { questionIndex: currentIndex })

      finishBridgeTimerRef.current = setTimeout(() => {
        finishBridgeTimerRef.current = null
        if (!mountedRef.current) return
        if (phaseRef.current !== 'avatar_finished') return
        onAvatarFinished(reason)
      }, AVATAR_FINISHED_BRIDGE_MS)
    },
    [currentIndex, inputMode, mountedRef, onAvatarFinished, phaseRef, setPhase, stopSpeaking, elStop, telemetryCtx],
  )

  const markPlaybackFailed = useCallback(
    (message: string) => {
      setPlaybackFailureMessage(message || 'Avatar audio could not start.')
      setPlaybackFailed(true)
      trackAvatarTelemetry('avatar_audio_failed', telemetryCtx, { message, mode: inputMode }, 'warn')
      interviewFlowLog('tts', 'tts_playback_failed', {
        questionIndex: currentIndex,
        message,
      })
    },
    [currentIndex, inputMode, telemetryCtx],
  )

  const continueWithoutAudio = useCallback(() => {
    try { stopSpeaking() } catch { /* */ }
    try { elStop() } catch { /* */ }
    finishAuthorized('user_continue')
  }, [elStop, finishAuthorized, stopSpeaking])

  const runSpeakAttempt = useCallback(() => {
    if (!currentQuestion) return

    const intro = pendingFollowUp
      ? pendingFollowUp.text
      : buildIntro(
          currentIndex,
          currentQuestion.question_text,
          interviewerDisplayName,
          interviewRole,
          totalQuestions,
        )

    introRef.current = intro
    setSpokenText(intro)
    setPlaybackFailed(false)
    playbackStartedRef.current = false

    interviewFlowLog('avatar', 'avatar_speaking_started', {
      questionIndex: currentIndex,
      introLength: intro.length,
      mode: inputMode,
    })
    interviewFlowLog('tts', 'tts_started', { questionIndex: currentIndex, mode: inputMode })

    const playbackCallbacks: PlaybackCallbacks = {
      onPlaybackStarted: () => {
        setPlaybackFailed(false)
      },
      onPlaybackComplete: () => {
        if (phaseRef.current !== 'avatar_speaking') return
        finishAuthorized('audio_completed')
      },
      onPlaybackFailed: (msg) => {
        if (phaseRef.current !== 'avatar_speaking') return
        markPlaybackFailed(msg ?? 'Avatar audio could not start.')
      },
    }

    const tone: InterviewerTone =
      pendingFollowUp?.tone ?? lastVoiceMeta?.tone ?? 'neutral'

    const browserFallback = () => {
      interviewFlowLog('tts', 'browser_tts_fallback', { questionIndex: currentIndex })
      speakQuestion(intro, playbackCallbacks)
    }

    void elSpeak(intro, tone, {
      ...playbackCallbacks,
      onPlaybackFailed: (msg) => {
        browserFallback()
        if (phaseRef.current !== 'avatar_speaking') return
        interviewFlowLog('tts', 'elevenlabs_failed_fallback', { message: msg })
      },
    })
  }, [
    buildIntro,
    currentIndex,
    currentQuestion,
    elSpeak,
    finishAuthorized,
    inputMode,
    interviewerDisplayName,
    interviewRole,
    lastVoiceMeta,
    markPlaybackFailed,
    pendingFollowUp,
    phaseRef,
    speakQuestion,
    totalQuestions,
  ])

  const retryAudio = useCallback(() => {
    interviewFlowLog('audio', 'avatar_audio_retry', { questionIndex: currentIndex })
    try { stopSpeaking() } catch { /* */ }
    try { elStop() } catch { /* */ }
    setSpeakAttempt((n) => n + 1)
  }, [currentIndex, elStop, stopSpeaking])

  useEffect(() => {
    if (phase !== 'avatar_speaking' || !currentQuestion) return
    if (needsAudioGestureUnlock() && !audioUnlocked) return

    if (!readAiVoiceEnabled()) {
      const t = window.setTimeout(() => finishAuthorized('voice_disabled'), 0)
      return () => {
        window.clearTimeout(t)
        try { stopSpeaking() } catch { /* */ }
        try { elStop() } catch { /* */ }
      }
    }

    const stuckTimer = setTimeout(() => {
      if (phaseRef.current !== 'avatar_speaking') return
      if (playbackStartedRef.current) return
      markPlaybackFailed('Avatar audio could not start. Tap Retry Audio or continue without voice.')
    }, AUDIO_STUCK_MS)

    const speakTimer = window.setTimeout(() => runSpeakAttempt(), 0)

    return () => {
      window.clearTimeout(speakTimer)
      clearTimeout(stuckTimer)
      setPlaybackFailed(false)
      try { stopSpeaking() } catch { /* */ }
      try { elStop() } catch { /* */ }
    }
  }, [
    phase,
    currentIndex,
    pendingFollowUp,
    audioUnlocked,
    currentQuestion,
    speakAttempt,
    finishAuthorized,
    runSpeakAttempt,
    markPlaybackFailed,
    stopSpeaking,
    elStop,
    phaseRef,
  ])

  useEffect(() => {
    return () => {
      if (finishBridgeTimerRef.current) {
        clearTimeout(finishBridgeTimerRef.current)
        finishBridgeTimerRef.current = null
      }
    }
  }, [])

  const spokenWordCount = spokenText.trim().split(/\s+/).filter(Boolean).length
  const speakingProgressPct =
    audioActuallyStarted && spokenWordCount > 0
      ? Math.min(100, Math.round((currentWordIndex / spokenWordCount) * 100))
      : null
  const avatarHeaderLabel =
    speakingProgressPct !== null
      ? `${speakingProgressPct}%`
      : `Q ${currentIndex + 1}/${totalQuestions}`

  const showPlaybackRecovery = playbackFailed && !audioActuallyStarted

  return {
    spokenText,
    awaitingAudioTap,
    showPlaybackRecovery,
    playbackFailureMessage,
    continueWithoutAudio,
    retryAudio,
    audioActuallyStarted,
    speakingProgressPct,
    avatarHeaderLabel,
  }
}
