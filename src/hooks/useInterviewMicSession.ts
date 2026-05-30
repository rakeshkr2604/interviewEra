'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SpeechRecognitionState } from '@/hooks/useSpeechRecognition'
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'
import {
  MIC_MAX_RESTARTS_PER_QUESTION,
  MIC_RESTART_COOLDOWN_MS,
  MIC_WATCHDOG_POLL_MS,
  type MicSessionSnapshot,
  type MicSessionState,
} from '@/lib/voice/mic-session'
import { trackMicTelemetry } from '@/lib/voice/mic-telemetry'
import { voiceDebug } from '@/lib/voice/lifecycle-log'

export interface UseInterviewMicSessionParams {
  phase: string
  phaseRef: React.MutableRefObject<string>
  questionIndex: number
  inputMode: 'voice' | 'text' | 'deepgram'
  userMicMutedRef: React.MutableRefObject<boolean>
  isMicSupported: boolean
  permissionState: string
  recognitionState: SpeechRecognitionState
  dgListening: boolean
  telemetryCtx: InterviewTelemetryContext
  startListening: () => Promise<boolean>
  restartListening: () => void
  startDgListening: () => Promise<unknown>
}

export interface UseInterviewMicSessionReturn {
  micState: MicSessionState
  restartCount: number
  lastRestartAt: number | null
  watchdogActive: boolean
  micFailed: boolean
  snapshot: MicSessionSnapshot
  retryMicSession: () => void
}

function deriveMicState(
  recognition: SpeechRecognitionState,
  recoveringUntil: number,
  failed: boolean,
  permissionDenied: boolean,
): MicSessionState {
  if (permissionDenied) return 'permission_denied'
  if (failed) return 'failed'
  if (Date.now() < recoveringUntil) return 'recovering'
  if (recognition === 'active') return 'active'
  if (recognition === 'starting') return 'starting'
  return 'idle'
}

/**
 * Arms the mic for the full answer window without restart storms.
 * Watchdog restarts ONLY from idle + cooldown + budget remaining.
 */
export function useInterviewMicSession(
  params: UseInterviewMicSessionParams,
): UseInterviewMicSessionReturn {
  const {
    phase,
    phaseRef,
    questionIndex,
    inputMode,
    userMicMutedRef,
    isMicSupported,
    permissionState,
    recognitionState,
    dgListening,
    telemetryCtx,
    startListening,
    restartListening,
    startDgListening,
  } = params

  const [failed, setFailed] = useState(false)
  const [restartCount, setRestartCount] = useState(0)
  const [lastRestartAt, setLastRestartAt] = useState<number | null>(null)
  const [recoveringUntil, setRecoveringUntil] = useState(0)
  const [tick, setTick] = useState(0)

  const recognitionStateRef = useRef(recognitionState)
  const dgListeningRef = useRef(dgListening)
  const permissionStateRef = useRef(permissionState)
  const failedRef = useRef(failed)
  const restartCountRef = useRef(restartCount)
  const lastRestartAtRef = useRef(lastRestartAt)
  const recoveringUntilRef = useRef(recoveringUntil)
  const recoveredLoggedRef = useRef(false)

  useEffect(() => {
    failedRef.current = failed
    restartCountRef.current = restartCount
    lastRestartAtRef.current = lastRestartAt
    recoveringUntilRef.current = recoveringUntil
    recognitionStateRef.current = recognitionState
    dgListeningRef.current = dgListening
    permissionStateRef.current = permissionState
  }, [
    failed,
    restartCount,
    lastRestartAt,
    recoveringUntil,
    recognitionState,
    dgListening,
    permissionState,
  ])

  useEffect(() => {
    const reset = () => {
      failedRef.current = false
      restartCountRef.current = 0
      lastRestartAtRef.current = null
      recoveringUntilRef.current = 0
      recoveredLoggedRef.current = false
      setFailed(false)
      setRestartCount(0)
      setLastRestartAt(null)
      setRecoveringUntil(0)
    }
    queueMicrotask(reset)
  }, [questionIndex])

  const permissionDenied = permissionState === 'denied'
  const watchdogActive = phase === 'candidate_answering'

  const micState = deriveMicState(
    recognitionState,
    recoveringUntil,
    failed,
    permissionDenied,
  )

  const bumpRecoveringWindow = useCallback(() => {
    const until = Date.now() + 800
    recoveringUntilRef.current = until
    setRecoveringUntil(until)
    window.setTimeout(() => setTick((n) => n + 1), 850)
  }, [])

  const requestWatchdogRestart = useCallback(
    (reason: string) => {
      if (phaseRef.current !== 'candidate_answering') return
      if (userMicMutedRef.current) return
      if (permissionStateRef.current === 'denied') return
      if (failedRef.current) return

      const state = recognitionStateRef.current
      if (state === 'starting') {
        trackMicTelemetry('mic_restart_blocked_state', telemetryCtx, { state, reason })
        return
      }
      if (Date.now() < recoveringUntilRef.current) {
        trackMicTelemetry('mic_restart_blocked_state', telemetryCtx, { state: 'recovering', reason })
        return
      }
      if (state !== 'idle' && inputMode === 'voice') {
        trackMicTelemetry('mic_restart_blocked_state', telemetryCtx, { state, reason })
        return
      }

      const now = Date.now()
      const last = lastRestartAtRef.current
      if (last !== null && now - last < MIC_RESTART_COOLDOWN_MS) {
        trackMicTelemetry('mic_restart_blocked_cooldown', telemetryCtx, {
          reason,
          elapsedMs: now - last,
          cooldownMs: MIC_RESTART_COOLDOWN_MS,
        })
        return
      }

      if (restartCountRef.current >= MIC_MAX_RESTARTS_PER_QUESTION) {
        failedRef.current = true
        setFailed(true)
        trackMicTelemetry('mic_restart_budget_exhausted', telemetryCtx, {
          restartCount: restartCountRef.current,
          reason,
        })
        trackMicTelemetry('mic_failed', telemetryCtx, { reason }, 'warn')
        voiceDebug('mic_failed', { restartCount: restartCountRef.current })
        return
      }

      trackMicTelemetry('mic_restart_requested', telemetryCtx, { reason, state })
      console.log('[voice] watchdog_restart', { reason, state })

      const nextCount = restartCountRef.current + 1
      restartCountRef.current = nextCount
      lastRestartAtRef.current = now
      setRestartCount(nextCount)
      setLastRestartAt(now)
      bumpRecoveringWindow()

      if (inputMode === 'deepgram') {
        void startDgListening()
      } else {
        void startListening()
      }
    },
    [
      bumpRecoveringWindow,
      inputMode,
      phaseRef,
      startDgListening,
      startListening,
      telemetryCtx,
      userMicMutedRef,
    ],
  )

  useEffect(() => {
    if (recognitionState !== 'active' || failed) {
      recoveredLoggedRef.current = false
      return
    }
    if (recoveredLoggedRef.current) return
    recoveredLoggedRef.current = true
    trackMicTelemetry('mic_recovered', telemetryCtx, { inputMode })
  }, [recognitionState, failed, telemetryCtx, inputMode])

  const captureActiveLoggedRef = useRef(false)
  useEffect(() => {
    captureActiveLoggedRef.current = false
  }, [questionIndex, inputMode])

  useEffect(() => {
    if (recognitionState === 'active' && !captureActiveLoggedRef.current) {
      captureActiveLoggedRef.current = true
      trackMicTelemetry('mic_capture_active', telemetryCtx, { inputMode })
    }
  }, [recognitionState, telemetryCtx, inputMode])

  useEffect(() => {
    if (phase !== 'candidate_answering') return
    if (inputMode === 'text') return

    const interval = window.setInterval(() => {
      if (phaseRef.current !== 'candidate_answering') return
      if (userMicMutedRef.current) return
      if (permissionStateRef.current === 'denied') return
      if (failedRef.current) return

      if (Date.now() < recoveringUntilRef.current) return

      if (inputMode === 'deepgram') {
        if (!dgListeningRef.current) {
          requestWatchdogRestart('deepgram_not_listening')
        }
        return
      }

      if (inputMode !== 'voice' || !isMicSupported) return
      if (recognitionStateRef.current === 'active') return
      if (recognitionStateRef.current === 'idle') {
        requestWatchdogRestart('web_speech_idle')
      }
    }, MIC_WATCHDOG_POLL_MS)

    return () => window.clearInterval(interval)
  }, [
    phase,
    phaseRef,
    inputMode,
    isMicSupported,
    requestWatchdogRestart,
    userMicMutedRef,
  ])

  void tick

  const retryMicSession = useCallback(() => {
    failedRef.current = false
    restartCountRef.current = 0
    lastRestartAtRef.current = null
    recoveredLoggedRef.current = false
    setFailed(false)
    setRestartCount(0)
    setLastRestartAt(null)
    bumpRecoveringWindow()
    trackMicTelemetry('mic_restarted', telemetryCtx, { source: 'user_retry' })
    if (inputMode === 'deepgram') {
      void startDgListening()
    } else {
      restartListening()
    }
  }, [
    bumpRecoveringWindow,
    inputMode,
    restartListening,
    startDgListening,
    telemetryCtx,
  ])

  const snapshot: MicSessionSnapshot = {
    micState,
    restartCount,
    lastRestartAt,
    watchdogActive,
    permissionState,
    recognitionState,
  }

  return {
    micState,
    restartCount,
    lastRestartAt,
    watchdogActive,
    micFailed: failed,
    snapshot,
    retryMicSession,
  }
}
