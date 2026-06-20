/**
 * Single source for "what the interview setup flow should assume by default".
 * Resolution order for each field: session override (React state) wins elsewhere — this module only reads persisted Settings (localStorage).
 * Platform fallbacks live in `client-preferences.ts` readers.
 */

import { getInterviewerById } from '@/lib/config/interviewers'
import type { InterviewerId } from '@/lib/config/interviewers'
import type { InterviewDifficulty } from '@/types/app.types'
import {
  readAdaptiveFollowUpEnabled,
  readAiVoiceEnabled,
  readAnswerStyle,
  readCameraInterviewModeEnabled,
  readDefaultDifficulty,
  readInterviewLanguage,
  INTERVIEW_LANGUAGE_LABELS,
  readNoiseCancellationPreferred,
  readPreferredInterviewerId,
  readTtsRate,
  type AnswerStyle,
  type InterviewLanguageCode,
} from '@/lib/settings/client-preferences'

export type ResolvedInterviewSetupPreferences = {
  difficulty: InterviewDifficulty
  difficultyLabel: string
  interviewerId: InterviewerId
  interviewerName: string
  answerStyle: AnswerStyle
  answerStyleLabel: string
  interviewLanguage: InterviewLanguageCode
  interviewLanguageLabel: string
  ttsRate: number
  aiVoiceEnabled: boolean
  noiseCancellationEnabled: boolean
  adaptiveFollowUpEnabled: boolean
  cameraInterviewModeEnabled: boolean
}

const DIFFICULTY_LABEL: Record<InterviewDifficulty, string> = {
  easy: 'Beginner',
  medium: 'Intermediate',
  hard: 'Advanced',
}

const ANSWER_STYLE_LABEL: Record<AnswerStyle, string> = {
  concise: 'Concise',
  balanced: 'Balanced',
  detailed: 'Detailed',
}

export function readResolvedInterviewSetupPreferences(): ResolvedInterviewSetupPreferences {
  const interviewerId = readPreferredInterviewerId()
  const interviewer = getInterviewerById(interviewerId)
  const difficulty = readDefaultDifficulty()
  const answerStyle = readAnswerStyle()
  const lang = readInterviewLanguage()

  return {
    difficulty,
    difficultyLabel: DIFFICULTY_LABEL[difficulty],
    interviewerId,
    interviewerName: interviewer?.name ?? interviewerId,
    answerStyle,
    answerStyleLabel: ANSWER_STYLE_LABEL[answerStyle],
    interviewLanguage: lang,
    interviewLanguageLabel: INTERVIEW_LANGUAGE_LABELS[lang],
    ttsRate: readTtsRate(),
    aiVoiceEnabled: readAiVoiceEnabled(),
    noiseCancellationEnabled: readNoiseCancellationPreferred(),
    adaptiveFollowUpEnabled: readAdaptiveFollowUpEnabled(),
    cameraInterviewModeEnabled: readCameraInterviewModeEnabled(),
  }
}
