import { z } from 'zod'
import type { InterviewDifficulty, ParsedJobDescription } from '@/types/app.types'
import type { OnboardingData } from '@/types/onboarding.types'

const interviewGoalSchema = z.enum([
  'fresher_placement',
  'job_switch',
  'promotion_prep',
  'general_practice',
])

const interviewModeSchema = z.enum(['Technical', 'HR', 'Mixed'])

const interviewerIdSchema = z.enum(['priya', 'arjun'])

const difficultySchema = z.enum(['easy', 'medium', 'hard'])

/** Shape stored in users.onboarding_draft (JSONB). */
export const onboardingPersistedDraftSchema = z.object({
  version: z.literal(1),
  step: z.union([z.literal(1), z.literal(2)]),
  goal: interviewGoalSchema.nullable(),
  role: z.string().max(200),
  experienceYears: z.number().int().min(0).max(60),
  mode: interviewModeSchema,
  interviewerId: interviewerIdSchema.nullable(),
  resumeId: z.string().uuid().nullable(),
  resumeFileName: z.string().max(255).nullable(),
  jdText: z.string().max(12_000),
  parsedJd: z.unknown().nullable().optional(),
  jdParseStatus: z.enum(['idle', 'parsing', 'ready', 'failed']).optional(),
  difficulty: difficultySchema.optional(),
  difficultyTouched: z.boolean().optional(),
  /** Session summary — adaptive AI follow-ups after each answer. */
  aiFollowupsEnabled: z.boolean().optional(),
  aiFollowupsTouched: z.boolean().optional(),
  /** Selfie camera preview during answer phase. */
  cameraInterviewModeEnabled: z.boolean().optional(),
  cameraModeTouched: z.boolean().optional(),
  updatedAt: z.string().datetime(),
})

export type OnboardingPersistedDraft = z.infer<typeof onboardingPersistedDraftSchema>

export function buildPersistedDraft(input: {
  step: 1 | 2
  data: OnboardingData
  resumeFileName: string | null
  jdText: string
  parsedJd: ParsedJobDescription | null
  jdParseStatus: 'idle' | 'parsing' | 'ready' | 'failed'
  difficulty: InterviewDifficulty
  difficultyTouched: boolean
  aiFollowupsEnabled?: boolean
  aiFollowupsTouched?: boolean
  cameraInterviewModeEnabled?: boolean
  cameraModeTouched?: boolean
}): OnboardingPersistedDraft {
  return {
    version: 1,
    step: input.step,
    goal: input.data.goal,
    role: input.data.role.slice(0, 200),
    experienceYears: Math.min(60, Math.max(0, Math.trunc(input.data.experienceYears))),
    mode: input.data.mode,
    interviewerId: input.data.interviewerId,
    resumeId: input.data.resumeId,
    resumeFileName: input.resumeFileName?.slice(0, 255) ?? null,
    jdText: input.jdText.slice(0, 12_000),
    ...(input.parsedJd ? { parsedJd: input.parsedJd } : { parsedJd: null }),
    jdParseStatus: input.jdParseStatus,
    difficulty: input.difficulty,
    difficultyTouched: input.difficultyTouched,
    aiFollowupsEnabled: input.aiFollowupsEnabled ?? true,
    aiFollowupsTouched: input.aiFollowupsTouched ?? false,
    cameraInterviewModeEnabled: input.cameraInterviewModeEnabled ?? true,
    cameraModeTouched: input.cameraModeTouched ?? false,
    updatedAt: new Date().toISOString(),
  }
}

export function parsePersistedDraft(raw: unknown): OnboardingPersistedDraft | null {
  const parsed = onboardingPersistedDraftSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function draftToOnboardingData(draft: OnboardingPersistedDraft): OnboardingData {
  return {
    goal: draft.goal,
    role: draft.role,
    experienceYears: draft.experienceYears,
    mode: draft.mode,
    interviewerId: draft.interviewerId,
    resumeId: draft.resumeId,
    resumeText: '',
    skills: [],
    projects: [],
    placementDate: null,
  }
}

export function coerceParsedJdFromDraft(raw: unknown): ParsedJobDescription | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as ParsedJobDescription
  if (typeof o.role_title !== 'string') return null
  return o
}
