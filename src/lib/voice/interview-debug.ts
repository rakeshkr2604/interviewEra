import { getPlatformContext } from '@/lib/voice/lifecycle-log'
import { needsAudioGestureUnlock } from '@/lib/voice/audio-gesture'
export interface InterviewDebugSnapshot {
  phase: string
  questionIndex: number
  questionText: string | null
  audio: {
    needsUnlock: boolean
    unlocked: boolean
    actuallyStarted: boolean
    showRecovery: boolean
    failureMessage: string | null
  }
  video: {
    speakingUiActive: boolean
  }
  mic: {
    label: string
    phase: string
    permission: string
    recognition: string
    inputMode: string
    micState: string
    restartCount: number
    lastRestartAt: number | null
    watchdogActive: boolean
  }
  /** Filled by installInterviewDebug() at read time if omitted. */
  platform?: ReturnType<typeof getPlatformContext>
  ts: number
}

export function installInterviewDebug(
  getSnapshot: () => InterviewDebugSnapshot,
): void {
  if (typeof window === 'undefined') return
  const w = window as Window & { __INTERVIEW_DEBUG?: () => InterviewDebugSnapshot }
  w.__INTERVIEW_DEBUG = () => ({
    ...getSnapshot(),
    ts: Date.now(),
    platform: getPlatformContext(),
  })
}

export function getInterviewDebugNeedsUnlock(): boolean {
  return needsAudioGestureUnlock()
}
