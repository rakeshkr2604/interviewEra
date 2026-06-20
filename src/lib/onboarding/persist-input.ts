import type { OnboardingData } from '@/types/onboarding.types'
import type { InterviewDifficulty, ParsedJobDescription } from '@/types/app.types'

/** Snapshot passed from the onboarding page into the persist hook. */
export type PersistInput = {
  step: 1 | 2
  data: OnboardingData
  resumeFileName: string | null
  jdText: string
  parsedJd: ParsedJobDescription | null
  jdParseStatus: 'idle' | 'parsing' | 'ready' | 'failed'
  difficulty: InterviewDifficulty
  difficultyTouched: boolean
  aiFollowupsEnabled: boolean
  aiFollowupsTouched: boolean
  cameraInterviewModeEnabled: boolean
  cameraModeTouched: boolean
  /** Skip while upload/parse is in-flight to avoid overwriting with stale resumeId. */
  enabled: boolean
}
