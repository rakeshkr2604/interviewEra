'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  needsAudioGestureUnlock,
  unlockAudioForInterview,
  closeSharedInterviewAudioContext,
} from '@/lib/voice/audio-gesture'
import { interviewFlowLog } from '@/lib/voice/interview-flow-log'

export interface UseInterviewAudioReturn {
  needsUnlock: boolean
  isUnlocked: boolean
  unlock: () => void
}

/**
 * Central audio-gesture state for the interview session.
 * Desktop / Android Chrome: auto-unlocked on mount.
 * iOS Safari / PWA: requires unlock() from a tap handler before TTS.
 */
export function useInterviewAudio(interviewId: string | undefined): UseInterviewAudioReturn {
  const needsUnlock = needsAudioGestureUnlock()
  const [isUnlocked, setIsUnlocked] = useState(() => !needsUnlock)

  useEffect(() => {
    return () => {
      closeSharedInterviewAudioContext()
    }
  }, [])

  const unlock = useCallback(() => {
    unlockAudioForInterview()
    setIsUnlocked(true)
    interviewFlowLog('audio', 'gesture_unlocked', { interviewId })
  }, [interviewId])

  return { needsUnlock, isUnlocked, unlock }
}
