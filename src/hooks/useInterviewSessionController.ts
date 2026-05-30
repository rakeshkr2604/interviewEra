'use client'

/**
 * Session phase controller — single source of truth for runtime transitions.
 *
 * The avatar session page owns React state; this module defines the allowed
 * phase graph and helpers so transitions stay explicit (audit Phase 3).
 */
import { useCallback } from 'react'
import type { RuntimePhase } from '@/lib/interview/runtime-phase'
import { needsAudioGestureUnlock } from '@/lib/voice/audio-gesture'
import { interviewFlowLog } from '@/lib/voice/interview-flow-log'

export type { RuntimePhase }

export interface UseInterviewSessionControllerParams {
  interviewId?: string
  questionIndex: number
  audioUnlocked: boolean
  setPhase: (phase: RuntimePhase) => void
  stopTimer: () => void
}

export interface UseInterviewSessionControllerReturn {
  goToInterviewerTurn: () => void
  goToAnsweringFromAvatarFinished: () => void
}

/** Next phase when the interviewer turn should begin. */
export function resolveInterviewerEntryPhase(audioUnlocked: boolean): RuntimePhase {
  return needsAudioGestureUnlock() && !audioUnlocked
    ? 'awaiting_audio_unlock'
    : 'avatar_speaking'
}

export function useInterviewSessionController(
  params: UseInterviewSessionControllerParams,
): UseInterviewSessionControllerReturn {
  const { interviewId, questionIndex, audioUnlocked, setPhase, stopTimer } = params

  const goToInterviewerTurn = useCallback(() => {
    stopTimer()
    const next = resolveInterviewerEntryPhase(audioUnlocked)
    interviewFlowLog('session', 'transition_interviewer_turn', {
      interviewId,
      questionIndex,
      nextPhase: next,
    })
    setPhase(next)
  }, [audioUnlocked, interviewId, questionIndex, setPhase, stopTimer])

  const goToAnsweringFromAvatarFinished = useCallback(() => {
    interviewFlowLog('session', 'transition_candidate_answering', {
      interviewId,
      questionIndex,
      fromPhase: 'avatar_finished',
    })
    setPhase('candidate_answering')
  }, [interviewId, questionIndex, setPhase])

  return { goToInterviewerTurn, goToAnsweringFromAvatarFinished }
}
