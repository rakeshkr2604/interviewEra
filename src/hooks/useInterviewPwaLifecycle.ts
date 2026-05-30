'use client'

import { useEffect, useRef } from 'react'
import { interviewFlowLog } from '@/lib/voice/interview-flow-log'
import type { RuntimePhase } from '@/lib/interview/runtime-phase'
import { resumeSharedInterviewAudioContext } from '@/lib/voice/audio-gesture'

export interface UseInterviewPwaLifecycleOptions {
  phase: RuntimePhase
  onVisibleResume?: () => void
  /** Called when returning visible during avatar_speaking (retry TTS / recovery UI). */
  onAvatarSpeakingResume?: () => void
}

export function useInterviewPwaLifecycle({
  phase,
  onVisibleResume,
  onAvatarSpeakingResume,
}: UseInterviewPwaLifecycleOptions): void {
  const phaseRef = useRef(phase)
  const onVisibleResumeRef = useRef(onVisibleResume)
  const onAvatarSpeakingResumeRef = useRef(onAvatarSpeakingResume)

  useEffect(() => {
    phaseRef.current = phase
    onVisibleResumeRef.current = onVisibleResume
    onAvatarSpeakingResumeRef.current = onAvatarSpeakingResume
  }, [phase, onVisibleResume, onAvatarSpeakingResume])

  useEffect(() => {
    const handleResume = (source: string, persisted?: boolean) => {
      interviewFlowLog('session', 'lifecycle_resume', {
        phase: phaseRef.current,
        source,
        persisted: persisted ?? false,
      })
      void resumeSharedInterviewAudioContext()
      onVisibleResumeRef.current?.()
      if (
        phaseRef.current === 'avatar_speaking' ||
        phaseRef.current === 'awaiting_audio_unlock'
      ) {
        onAvatarSpeakingResumeRef.current?.()
      }
    }

    const onVisibility = () => {
      const state = document.visibilityState
      interviewFlowLog('session', state === 'visible' ? 'page_visible' : 'page_hidden', {
        phase: phaseRef.current,
      })
      if (state === 'visible') handleResume('visibilitychange')
    }

    const onPageShow = (ev: PageTransitionEvent) => {
      handleResume('pageshow', ev.persisted)
    }

    const onPageHide = () => {
      interviewFlowLog('session', 'pagehide', { phase: phaseRef.current })
    }

    const onFocus = () => handleResume('focus')

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('focus', onFocus)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('focus', onFocus)
    }
  }, [])
}
