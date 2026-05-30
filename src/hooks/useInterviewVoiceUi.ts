'use client'

import { useMemo } from 'react'

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
  micError: string | null
  webSpeechActive: boolean
  dgListening: boolean
  sessionPhase: string
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
    micError,
    webSpeechActive,
    dgListening,
    sessionPhase,
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

    if (micError) {
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

    if (recognitionState === 'starting') {
      return {
        phase: 'starting_microphone' as const,
        label: 'Starting microphone…',
        canRetry: true,
        showListeningIndicator: false,
      }
    }

    if (webSpeechActive) {
      return {
        phase: 'listening' as const,
        label: 'Listening…',
        canRetry: true,
        showListeningIndicator: true,
      }
    }

    if (permissionState === 'granted' && sessionPhase === 'candidate_answering') {
      return {
        phase: 'permission_granted' as const,
        label: 'Tap the microphone to start',
        canRetry: true,
        showListeningIndicator: false,
      }
    }

    return {
      phase: 'idle' as const,
      label: 'Mic off',
      canRetry: sessionPhase === 'candidate_answering',
      showListeningIndicator: false,
    }
  }, [
    inputMode,
    useManualInput,
    isMicSupported,
    permissionState,
    recognitionState,
    micError,
    webSpeechActive,
    dgListening,
    sessionPhase,
  ])
}
