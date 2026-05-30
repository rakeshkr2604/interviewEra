'use client'

import { useEffect, useRef } from 'react'
import type { SpeechRecognitionState } from '@/hooks/useSpeechRecognition'
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'
import { trackMicTelemetry } from '@/lib/voice/mic-telemetry'
import { voiceDebug } from '@/lib/voice/lifecycle-log'

const WATCHDOG_MS = 2_000

export interface UseInterviewMicKeepaliveParams {
  phase: string
  phaseRef: React.MutableRefObject<string>
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

/**
 * Keeps the mic armed for the full candidate_answering window. Thinking silence
 * must never flip the session to text mode or leave recognition disarmed.
 */
export function useInterviewMicKeepalive(params: UseInterviewMicKeepaliveParams): void {
  const {
    phase,
    phaseRef,
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

  const recognitionStateRef = useRef(recognitionState)
  const dgListeningRef = useRef(dgListening)
  const permissionStateRef = useRef(permissionState)

  useEffect(() => {
    recognitionStateRef.current = recognitionState
    dgListeningRef.current = dgListening
    permissionStateRef.current = permissionState
  }, [recognitionState, dgListening, permissionState])

  const captureActiveLoggedRef = useRef(false)

  useEffect(() => {
    captureActiveLoggedRef.current = false
  }, [phase, inputMode])

  useEffect(() => {
    if (recognitionState === 'active' && !captureActiveLoggedRef.current) {
      captureActiveLoggedRef.current = true
      trackMicTelemetry('mic_capture_active', telemetryCtx, { inputMode })
    }
  }, [recognitionState, telemetryCtx, inputMode])

  useEffect(() => {
    if (phase !== 'candidate_answering') return

    const tick = () => {
      if (phaseRef.current !== 'candidate_answering') return
      if (userMicMutedRef.current) return
      if (permissionStateRef.current === 'denied') return

      if (inputMode === 'text') return

      if (inputMode === 'deepgram') {
        if (!dgListeningRef.current) {
          console.log('[voice] watchdog_restart', { mode: 'deepgram' })
          voiceDebug('watchdog_restart', { mode: 'deepgram' })
          trackMicTelemetry('mic_watchdog_restart', telemetryCtx, { mode: 'deepgram' })
          void startDgListening()
        }
        return
      }

      if (inputMode !== 'voice' || !isMicSupported) return

      const state = recognitionStateRef.current
      if (state === 'active') return

      console.log('[voice] watchdog_restart', { recognitionState: state })
      voiceDebug('watchdog_restart', { recognitionState: state })
      trackMicTelemetry('mic_watchdog_restart', telemetryCtx, { recognitionState: state })

      if (state === 'idle') {
        void startListening()
      } else {
        restartListening()
      }
    }

    const iv = window.setInterval(tick, WATCHDOG_MS)
    tick()
    return () => window.clearInterval(iv)
  }, [
    phase,
    phaseRef,
    inputMode,
    userMicMutedRef,
    isMicSupported,
    telemetryCtx,
    startListening,
    restartListening,
    startDgListening,
  ])
}
