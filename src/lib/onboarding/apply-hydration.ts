import { DEFAULT_INTERVIEW_DIFFICULTY } from '@/lib/settings/client-preferences'
import type { OnboardingHydration } from '@/lib/onboarding/load-hydration'
import { resolveHydratedResumeId } from '@/lib/onboarding/hydration-shared'
import type { InterviewGoal } from '@/types/onboarding.types'
import type { InterviewDifficulty } from '@/types/app.types'
import type { ParsedJobDescription, ParsedResume } from '@/types/app.types'

export type OnboardingPageSnapshot = {
  step: 1 | 2
  data: {
    goal: InterviewGoal | null
    role: string
    experienceYears: number
    mode: 'Technical' | 'HR' | 'Mixed'
    interviewerId: 'priya' | 'arjun' | null
    resumeId: string | null
  }
  resumeFileName: string | null
  parsedResume: ParsedResume | null
  resumeState: 'idle' | 'uploading' | 'processing' | 'parsed' | 'failed'
  jdText: string
  parsedJd: ParsedJobDescription | null
  jdParseStatus: 'idle' | 'parsing' | 'ready' | 'failed'
  difficulty: InterviewDifficulty
  difficultyTouched: boolean
  aiFollowupsEnabled: boolean
  aiFollowupsTouched: boolean
  cameraInterviewModeEnabled: boolean
  cameraModeTouched: boolean
}

/** Merge server hydration into a page snapshot (used on refresh / client fallback). */
export function mergeOnboardingHydration(
  current: OnboardingPageSnapshot,
  hydration: OnboardingHydration,
): OnboardingPageSnapshot {
  const resumeId = resolveHydratedResumeId(hydration.draft, hydration.resume, hydration.data.resumeId)

  return {
    step: hydration.step ?? current.step,
    data: {
      goal: hydration.data.goal ?? current.data.goal,
      role: hydration.data.role ?? current.data.role,
      experienceYears:
        typeof hydration.data.experienceYears === 'number'
          ? hydration.data.experienceYears
          : current.data.experienceYears,
      mode: hydration.data.mode ?? current.data.mode,
      interviewerId: hydration.data.interviewerId ?? current.data.interviewerId,
      resumeId: resumeId ?? current.data.resumeId,
    },
    resumeFileName: hydration.resumeFileName ?? current.resumeFileName,
    parsedResume: hydration.parsedResume ?? current.parsedResume,
    resumeState: hydration.resumeState ?? current.resumeState,
    jdText: hydration.jdText ?? current.jdText,
    parsedJd: hydration.parsedJd ?? current.parsedJd,
    jdParseStatus: hydration.jdParseStatus ?? current.jdParseStatus,
    difficulty: hydration.difficulty ?? current.difficulty,
    difficultyTouched: hydration.difficultyTouched ?? current.difficultyTouched,
    aiFollowupsEnabled: hydration.draft?.aiFollowupsEnabled ?? current.aiFollowupsEnabled,
    aiFollowupsTouched: hydration.draft?.aiFollowupsTouched ?? current.aiFollowupsTouched,
    cameraInterviewModeEnabled:
      hydration.draft?.cameraInterviewModeEnabled ?? current.cameraInterviewModeEnabled,
    cameraModeTouched: hydration.draft?.cameraModeTouched ?? current.cameraModeTouched,
  }
}

export function emptyOnboardingPageSnapshot(): OnboardingPageSnapshot {
  return {
    step: 1,
    data: {
      goal: null,
      role: '',
      experienceYears: 0,
      mode: 'Technical',
      interviewerId: null,
      resumeId: null,
    },
    resumeFileName: null,
    parsedResume: null,
    resumeState: 'idle',
    jdText: '',
    parsedJd: null,
    jdParseStatus: 'idle',
    difficulty: DEFAULT_INTERVIEW_DIFFICULTY,
    difficultyTouched: false,
    aiFollowupsEnabled: true,
    aiFollowupsTouched: false,
    cameraInterviewModeEnabled: true,
    cameraModeTouched: false,
  }
}

export function snapshotFromHydration(hydration: OnboardingHydration): OnboardingPageSnapshot {
  const resumeId = resolveHydratedResumeId(hydration.draft, hydration.resume, hydration.data.resumeId)
  return {
    step: hydration.step,
    data: {
      goal: hydration.data.goal,
      role: hydration.data.role,
      experienceYears: hydration.data.experienceYears,
      mode: hydration.data.mode,
      interviewerId: hydration.data.interviewerId,
      resumeId,
    },
    resumeFileName: hydration.resumeFileName,
    parsedResume: hydration.parsedResume,
    resumeState: hydration.resumeState,
    jdText: hydration.jdText,
    parsedJd: hydration.parsedJd,
    jdParseStatus: hydration.jdParseStatus,
    difficulty: hydration.difficulty,
    difficultyTouched: hydration.difficultyTouched,
    aiFollowupsEnabled: hydration.draft?.aiFollowupsEnabled ?? true,
    aiFollowupsTouched: hydration.draft?.aiFollowupsTouched ?? false,
    cameraInterviewModeEnabled: hydration.draft?.cameraInterviewModeEnabled ?? true,
    cameraModeTouched: hydration.draft?.cameraModeTouched ?? false,
  }
}
