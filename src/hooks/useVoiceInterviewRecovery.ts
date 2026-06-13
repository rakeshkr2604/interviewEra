'use client'

import { useCallback, useRef, useState } from 'react'
import type { InterviewDraft } from '@/lib/session/interview-draft'
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'
import {
  VOICE_RECOVERY_INITIAL,
  buildVoiceRecoveryAnalyticsPayload,
  buildVoiceRecoveryState,
  isVoiceRecoveryBlockingMic,
  logVoiceRecovery,
  logVoiceRecoveryFailure,
  logVoiceRecoverySuccess,
  shouldOfferVoiceRecovery,
  type SavedVoiceMode,
  type VoiceRecoveryState,
} from '@/lib/voice/voice-recovery'

type TrackFn = (
  type: 'VOICE',
  event: string,
  data?: Record<string, unknown>,
  options?: { critical?: boolean; level?: 'info' | 'warn' | 'error' },
) => void

export interface UseVoiceInterviewRecoveryReturn {
  state: VoiceRecoveryState
  isBlockingMic: boolean
  isActive: boolean
  /** Stage recovery from a reconciled draft. Returns true if voice recovery UX should run. */
  beginFromDraft: (draft: InterviewDraft, questionIndex: number) => boolean
  markResuming: () => void
  markSuccess: () => void
  markFailed: (error: string) => void
  dismissToTyping: () => void
  trackBannerShown: () => void
  trackResumeClicked: () => void
  trackContinueTyping: () => void
}

export function useVoiceInterviewRecovery(
  interviewId: string,
  track: TrackFn,
  _telemetryCtx: InterviewTelemetryContext,
): UseVoiceInterviewRecoveryReturn {
  const [state, setState] = useState<VoiceRecoveryState>(VOICE_RECOVERY_INITIAL)
  const bannerTrackedRef = useRef(false)

  const emit = useCallback(
    (
      event: string,
      mode: SavedVoiceMode,
      extra?: Record<string, unknown>,
      options?: { critical?: boolean; level?: 'info' | 'warn' | 'error' },
    ) => {
      track(
        'VOICE',
        event,
        buildVoiceRecoveryAnalyticsPayload(interviewId, mode, extra),
        options,
      )
    },
    [interviewId, track],
  )

  const beginFromDraft = useCallback(
    (draft: InterviewDraft, questionIndex: number): boolean => {
      if (!shouldOfferVoiceRecovery(draft, questionIndex)) return false
      const next = buildVoiceRecoveryState(draft)
      setState(next)
      bannerTrackedRef.current = false
      logVoiceRecovery('banner_staged', {
        interviewId,
        mode: next.savedMode,
        transcriptLen: next.transcript.length,
      })
      return true
    },
    [interviewId],
  )

  const trackBannerShown = useCallback(() => {
    if (bannerTrackedRef.current) return
    if (state.phase !== 'pending' && state.phase !== 'failed') return
    bannerTrackedRef.current = true
    logVoiceRecovery('banner_shown', { interviewId, mode: state.savedMode })
    emit('voice_resume_banner_shown', state.savedMode, { transcript_len: state.transcript.length }, { critical: true })
  }, [emit, interviewId, state.phase, state.savedMode, state.transcript.length])

  const trackResumeClicked = useCallback(() => {
    logVoiceRecovery('resume_clicked', { interviewId, mode: state.savedMode })
    emit('voice_resume_clicked', state.savedMode, {}, { critical: true })
  }, [emit, interviewId, state.savedMode])

  const trackContinueTyping = useCallback(() => {
    logVoiceRecovery('continue_typing', { interviewId, mode: state.savedMode })
    emit('voice_resume_continue_typing', state.savedMode, {}, { critical: true })
  }, [emit, interviewId, state.savedMode])

  const markResuming = useCallback(() => {
    setState((s) => ({ ...s, phase: 'resuming', error: null }))
  }, [])

  const markSuccess = useCallback(() => {
    logVoiceRecoverySuccess({ interviewId, mode: state.savedMode })
    emit('voice_resume_success', state.savedMode, {}, { critical: true })
    setState(VOICE_RECOVERY_INITIAL)
    bannerTrackedRef.current = false
  }, [emit, interviewId, state.savedMode])

  const markFailed = useCallback(
    (error: string) => {
      logVoiceRecoveryFailure({ interviewId, mode: state.savedMode, error })
      emit('voice_resume_failed', state.savedMode, { error }, { critical: true, level: 'warn' })
      setState((s) => ({ ...s, phase: 'failed', error }))
    },
    [emit, interviewId, state.savedMode],
  )

  const dismissToTyping = useCallback(() => {
    setState(VOICE_RECOVERY_INITIAL)
    bannerTrackedRef.current = false
  }, [])

  return {
    state,
    isBlockingMic: isVoiceRecoveryBlockingMic(state),
    isActive: state.phase !== 'idle',
    beginFromDraft,
    markResuming,
    markSuccess,
    markFailed,
    dismissToTyping,
    trackBannerShown,
    trackResumeClicked,
    trackContinueTyping,
  }
}
