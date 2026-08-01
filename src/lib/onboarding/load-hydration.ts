import { createClient } from '@/lib/supabase/server'
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume'
import {
  coerceParsedJdFromDraft,
  draftToOnboardingData,
  parsePersistedDraft,
  type OnboardingPersistedDraft,
} from '@/lib/onboarding/persisted-draft'
import { resolveHydratedResumeId } from '@/lib/onboarding/hydration-shared'
import type { ParsedResume, InterviewDifficulty } from '@/types/app.types'
import type { InterviewGoal } from '@/types/onboarding.types'
import { DEFAULT_INTERVIEW_DIFFICULTY } from '@/lib/settings/client-preferences'

export type OnboardingResumeHydration = {
  id: string
  status: 'uploading' | 'parsing' | 'parsed' | 'failed'
  parsedData: ParsedResume | null
  fileName: string | null
}

export type OnboardingHydration = {
  draft: OnboardingPersistedDraft | null
  resume: OnboardingResumeHydration | null
  /** Wizard step restored from draft (defaults to 1). */
  step: 1 | 2
  data: ReturnType<typeof draftToOnboardingData>
  resumeFileName: string | null
  parsedResume: ParsedResume | null
  resumeState: 'idle' | 'uploading' | 'processing' | 'parsed' | 'failed'
  jdText: string
  parsedJd: ReturnType<typeof coerceParsedJdFromDraft>
  jdParseStatus: 'idle' | 'parsing' | 'ready' | 'failed'
  difficulty: InterviewDifficulty
  difficultyTouched: boolean
  aiFollowupsEnabled: boolean
  aiFollowupsTouched: boolean
  cameraInterviewModeEnabled: boolean
  cameraModeTouched: boolean
}

function resumeStateFromDbStatus(
  status: OnboardingResumeHydration['status'],
): OnboardingHydration['resumeState'] {
  if (status === 'parsed') return 'parsed'
  if (status === 'parsing' || status === 'uploading') return 'processing'
  if (status === 'failed') return 'failed'
  return 'idle'
}

async function fetchResumeForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  resumeId: string | null,
): Promise<OnboardingResumeHydration | null> {
  if (resumeId) {
    const { data } = await supabase
      .from('resumes')
      .select('id, status, parsed_data')
      .eq('user_id', userId)
      .eq('id', resumeId)
      .maybeSingle()
    if (data) {
      return {
        id: data.id,
        status: data.status as OnboardingResumeHydration['status'],
        parsedData: data.parsed_data ? coerceParsedResume(data.parsed_data) : null,
        fileName: null,
      }
    }
  }

  const { data: parsed } = await supabase
    .from('resumes')
    .select('id, status, parsed_data')
    .eq('user_id', userId)
    .eq('status', 'parsed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (parsed) {
    return {
      id: parsed.id,
      status: 'parsed',
      parsedData: parsed.parsed_data ? coerceParsedResume(parsed.parsed_data) : null,
      fileName: null,
    }
  }

  const { data: inFlight } = await supabase
    .from('resumes')
    .select('id, status, parsed_data')
    .eq('user_id', userId)
    .in('status', ['parsing', 'uploading'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!inFlight) return null

  return {
    id: inFlight.id,
    status: inFlight.status as OnboardingResumeHydration['status'],
    parsedData: inFlight.parsed_data ? coerceParsedResume(inFlight.parsed_data) : null,
    fileName: null,
  }
}

/** Server-side: load onboarding wizard + latest resume for initial client render. */
export async function loadOnboardingHydration(): Promise<OnboardingHydration | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_draft')
    .eq('id', user.id)
    .maybeSingle()

  const draft = parsePersistedDraft(profile?.onboarding_draft ?? null)
  const resume = await fetchResumeForUser(supabase, user.id, draft?.resumeId ?? null)

  const resumeFileName = draft?.resumeFileName ?? null

  const data = draft
    ? draftToOnboardingData({ ...draft, resumeId: resolveHydratedResumeId(draft, resume) })
    : {
        goal: null as InterviewGoal | null,
        role: '',
        experienceYears: 0,
        mode: 'Technical' as const,
        interviewerId: null,
        resumeId: resolveHydratedResumeId(null, resume),
        resumeText: '',
        skills: [],
        projects: [],
        placementDate: null,
      }

  const resumeId = resolveHydratedResumeId(draft, resume, data.resumeId)
  if (resumeId) {
    data.resumeId = resumeId
  }

  const parsedResume =
    resume?.status === 'parsed' && resume.parsedData ? resume.parsedData : null

  const resumeState = resume ? resumeStateFromDbStatus(resume.status) : 'idle'

  let step: 1 | 2 = 1
  const isStep1Complete =
    data.goal !== null &&
    data.role.trim().length > 0 &&
    data.experienceYears >= 0 &&
    data.interviewerId !== null

  if (isStep1Complete) {
    step = draft?.step ?? 2
  } else {
    step = 1
  }

  return {
    draft,
    resume,
    step,
    data,
    resumeFileName,
    parsedResume,
    resumeState,
    jdText: draft?.jdText ?? '',
    parsedJd: draft?.parsedJd ? coerceParsedJdFromDraft(draft.parsedJd) : null,
    jdParseStatus: draft?.jdParseStatus ?? (draft?.parsedJd ? 'ready' : 'idle'),
    difficulty: draft?.difficulty ?? DEFAULT_INTERVIEW_DIFFICULTY,
    difficultyTouched: draft?.difficultyTouched ?? false,
    aiFollowupsEnabled: draft?.aiFollowupsEnabled ?? true,
    aiFollowupsTouched: draft?.aiFollowupsTouched ?? false,
    cameraInterviewModeEnabled: draft?.cameraInterviewModeEnabled ?? true,
    cameraModeTouched: draft?.cameraModeTouched ?? false,
  }
}
