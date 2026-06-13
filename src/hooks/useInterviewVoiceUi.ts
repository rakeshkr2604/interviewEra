'use client'

import { useMemo } from 'react'
import type { MicSessionState } from '@/lib/voice/mic-session'

export type VoiceUiPhase =
  | 'idle'
  | 'permission_requested'
  | 'permission_granted'
  | 'permission_denied'
  | 'starting_microphone'
  | 'listening'
  | 'processing'
  | 'completed'
  | 'error'
  | 'unavailable'

export interface VoiceUiState {
  phase: VoiceUiPhase
  label: string
  canRetry: boolean
  showListeningIndicator: boolean
}

interface UseInterviewVoiceUiParams {
  inputMode: 'voice' | 'text' | 'deepgram'
  useManualInput: boolean
  isMicSupported: boolean
  permissionState: 'unknown' | 'granted' | 'denied' | 'requesting' | 'prompt'
  recognitionState: 'idle' | 'starting' | 'active' | 'stopped'
  /** Web Speech capture session is open (includes armed restart gaps). */
  isListening?: boolean
  micError: string | null
  webSpeechActive: boolean
  dgListening: boolean
  sessionPhase: string
  /** Mic should stay armed for the full answer window (thinking pauses OK). */
  micArmed?: boolean
  userMicMuted?: boolean
  micSessionState?: MicSessionState
  micFailed?: boolean
}

/**
 * Maps low-level mic/STT state into explicit UI phases (audit Phase 7).
 */
export function useInterviewVoiceUi(params: UseInterviewVoiceUiParams): VoiceUiState {
  const {
    inputMode,
    useManualInput,
    isMicSupported,
    permissionState,
    recognitionState,
    isListening = false,
    micError,
    webSpeechActive,
    dgListening,
    sessionPhase,
    micArmed = false,
    userMicMuted = false,
    micSessionState,
    micFailed = false,
  } = params

  return useMemo(() => {
    if (inputMode === 'text' || useManualInput) {
      return {
        phase: 'idle' as const,
        label: 'Type your answer',
        canRetry: false,
        showListeningIndicator: false,
      }
    }

    if (!isMicSupported) {
      return {
        phase: 'unavailable' as const,
        label: 'Microphone unavailable in this browser',
        canRetry: false,
        showListeningIndicator: false,
      }
    }

    if (permissionState === 'denied') {
      return {
        phase: 'permission_denied' as const,
        label: 'Microphone blocked — enable in Settings or type your answer',
        canRetry: true,
        showListeningIndicator: false,
      }
    }

    if (permissionState === 'requesting' || permissionState === 'prompt') {
      return {
        phase: 'permission_requested' as const,
        label: 'Allow microphone access…',
        canRetry: false,
        showListeningIndicator: false,
      }
    }

    if (sessionPhase === 'submitting') {
      return {
        phase: 'processing' as const,
        label: 'Processing your answer…',
        canRetry: false,
        showListeningIndicator: false,
      }
    }

    if (sessionPhase !== 'candidate_answering') {
      return {
        phase: 'idle' as const,
        label: '',
        canRetry: false,
        showListeningIndicator: false,
      }
    }

    if (micFailed) {
      return {
        phase: 'error' as const,
        label: 'Voice connection lost. Tap Retry Mic.',
        canRetry: true,
        showListeningIndicator: false,
      }
    }

    if (
      sessionPhase === 'candidate_answering' &&
      inputMode === 'voice' &&
      micArmed &&
      isListening &&
      permissionState === 'granted' &&
      !userMicMuted
    ) {
      const live = recognitionState === 'active'
      return {
        phase: live ? 'listening' : 'starting_microphone',
        label: live ? 'Listening…' : 'Getting microphone ready…',
        canRetry: true,
        showListeningIndicator: live,
      }
    }

    if (
      sessionPhase === 'candidate_answering' &&
      inputMode === 'voice' &&
      webSpeechActive
    ) {
      return {
        phase: 'listening' as const,
        label: 'Listening…',
        canRetry: true,
        showListeningIndicator: true,
      }
    }

    if (
      sessionPhase === 'candidate_answering' &&
      inputMode === 'voice' &&
      (recognitionState === 'starting' || micSessionState === 'starting') &&
      isMicSupported &&
      permissionState === 'granted' &&
      !userMicMuted
    ) {
      return {
        phase: 'starting_microphone' as const,
        label: micArmed ? 'Getting microphone ready…' : 'Connecting microphone…',
        canRetry: true,
        showListeningIndicator: false,
      }
    }

    if (micError && !micArmed) {
      return {
        phase: 'error' as const,
        label: micError,
        canRetry: true,
        showListeningIndicator: false,
      }
    }

    if (inputMode === 'deepgram' && dgListening) {
      return {
        phase: 'listening' as const,
        label: 'Listening…',
        canRetry: true,
        showListeningIndicator: true,
      }
    }

    if (userMicMuted) {
      return {
        phase: 'idle' as const,
        label: 'Microphone muted — tap mic to resume',
        canRetry: true,
        showListeningIndicator: false,
      }
    }

    if (micSessionState === 'recovering') {
      return {
        phase: 'starting_microphone' as const,
        label: 'Reconnecting microphone…',
        canRetry: true,
        showListeningIndicator: false,
      }
    }

    if (recognitionState === 'starting' || micSessionState === 'starting') {
      return {
        phase: 'starting_microphone' as const,
        label: micArmed ? 'Getting microphone ready…' : 'Connecting microphone…',
        canRetry: true,
        showListeningIndicator: false,
      }
    }

    if (webSpeechActive || (inputMode === 'deepgram' && dgListening)) {
      return {
        phase: 'listening' as const,
        label: 'Listening…',
        canRetry: true,
        showListeningIndicator: true,
      }
    }

    if (micArmed && permissionState === 'granted') {
      return {
        phase: 'permission_granted' as const,
        label: webSpeechActive ? 'Listening…' : 'Tap microphone to start',
        canRetry: true,
        showListeningIndicator: webSpeechActive,
      }
    }

    if (permissionState === 'granted' && sessionPhase === 'candidate_answering') {
      return {
        phase: 'permission_granted' as const,
        label: 'Mic Ready',
        canRetry: true,
        showListeningIndicator: false,
      }
    }

    return {
      phase: 'idle' as const,
      label: 'Mic Ready',
      canRetry: sessionPhase === 'candidate_answering',
      showListeningIndicator: false,
    }
  }, [
    inputMode,
    useManualInput,
    isMicSupported,
    permissionState,
    recognitionState,
    isListening,
    micError,
    webSpeechActive,
    dgListening,
    sessionPhase,
    micArmed,
    userMicMuted,
    micSessionState,
    micFailed,
  ])
}
