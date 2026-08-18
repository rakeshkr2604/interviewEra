import { z } from 'zod';

export const EXPERIENCE_LEVELS = ['fresher', 'junior', 'mid', 'senior'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const PROFILE_COMPLETION_FIELDS = ['name', 'role', 'experience', 'resume'] as const;
export type ProfileCompletionField = (typeof PROFILE_COMPLETION_FIELDS)[number];

export type ProfileOnboardingState =
  | 'first_time'
  | 'established_bypass'
  | 'incomplete'
  | 'complete';

export type ProfileOnboardingStep = 1 | 2 | 3 | 4;

const onboardingMetadataSchema = z.object({
  version: z.literal(1),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  current_step: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  highest_step_completed: z
    .union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    .optional(),
  last_completion_pct: z.number().int().min(0).max(100).optional(),
});

export type ProfileOnboardingMetadata = z.infer<typeof onboardingMetadataSchema>;

const storedCandidateProfileSchema = z.object({
  preferred_role: z.string().trim().min(1).max(120).optional(),
  experience_level: z.enum(EXPERIENCE_LEVELS).optional(),
  onboarding: onboardingMetadataSchema.optional(),
}).passthrough();

export type ProfileOnboardingInput = {
  name: string | null | undefined;
  candidateProfile: unknown;
  hasActiveResume: boolean;
  hasInterviewHistory: boolean;
};

export type ProfileOnboardingResolution = {
  state: ProfileOnboardingState;
  completionPercentage: number;
  completedFields: ProfileCompletionField[];
  missingFields: ProfileCompletionField[];
  firstMissingStep: ProfileOnboardingStep;
  name: string;
  preferredRole: string;
  experienceLevel: ExperienceLevel | null;
  hasActiveResume: boolean;
  metadata: ProfileOnboardingMetadata | null;
  shouldRedirectToWelcome: boolean;
};

function objectRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

export function parseProfileOnboardingMetadata(raw: unknown): ProfileOnboardingMetadata | null {
  const profile = storedCandidateProfileSchema.safeParse(raw);
  return profile.success && profile.data.onboarding ? profile.data.onboarding : null;
}

export function isMeaningfulProfileName(value: string | null | undefined): boolean {
  const name = value?.trim() ?? '';
  return name.length >= 2 && name.length <= 50 && name.toLowerCase() !== 'user';
}

export function mergeCandidateProfileJson(
  existing: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...objectRecord(existing), ...patch };
}

export function withProfileOnboardingMetadata(
  existing: unknown,
  metadata: ProfileOnboardingMetadata,
): Record<string, unknown> {
  return mergeCandidateProfileJson(existing, { onboarding: metadata });
}

export function shouldTrackOnboardingStarted(metadata: ProfileOnboardingMetadata | null): boolean {
  return !metadata?.started_at;
}

export function shouldTrackOnboardingStepCompleted(
  metadata: ProfileOnboardingMetadata | null,
  step: 1 | 2 | 3,
): boolean {
  return step > (metadata?.highest_step_completed ?? 0);
}

export function didProfileCompletionChange(
  before: Pick<ProfileOnboardingResolution, 'state' | 'completionPercentage'>,
  after: Pick<ProfileOnboardingResolution, 'state' | 'completionPercentage'>,
): boolean {
  return (
    before.state !== after.state ||
    before.completionPercentage !== after.completionPercentage
  );
}

export function resolveProfileOnboarding(
  input: ProfileOnboardingInput,
): ProfileOnboardingResolution {
  const parsed = storedCandidateProfileSchema.safeParse(input.candidateProfile);
  const profile = parsed.success ? parsed.data : {};
  const name = input.name?.trim() ?? '';
  const preferredRole = profile.preferred_role?.trim() ?? '';
  const experienceLevel = profile.experience_level ?? null;
  const metadata = profile.onboarding ?? null;

  const completedFields: ProfileCompletionField[] = [];
  if (isMeaningfulProfileName(name)) completedFields.push('name');
  if (preferredRole) completedFields.push('role');
  if (experienceLevel) completedFields.push('experience');
  if (input.hasActiveResume) completedFields.push('resume');

  const missingFields = PROFILE_COMPLETION_FIELDS.filter(
    (field) => !completedFields.includes(field),
  );
  const completionPercentage = completedFields.length * 25;

  const legacyCoreProfile = Boolean(preferredRole && experienceLevel);
  const establishedEvidence =
    legacyCoreProfile ||
    input.hasInterviewHistory ||
    input.hasActiveResume ||
    Boolean(metadata?.started_at || metadata?.completed_at);

  let state: ProfileOnboardingState;
  if (completionPercentage === 100) {
    state = 'complete';
  } else if (!establishedEvidence) {
    state = 'first_time';
  } else if (legacyCoreProfile && !metadata?.started_at && !metadata?.completed_at) {
    state = 'established_bypass';
  } else {
    state = 'incomplete';
  }

  let firstMissingStep: ProfileOnboardingStep = 4;
  if (!completedFields.includes('name') || !completedFields.includes('role')) {
    firstMissingStep = 1;
  } else if (!completedFields.includes('experience')) {
    firstMissingStep = 2;
  } else if (!completedFields.includes('resume')) {
    firstMissingStep = 3;
  }

  const persistedStep = metadata?.current_step;
  if (
    persistedStep &&
    persistedStep < firstMissingStep &&
    !metadata?.completed_at
  ) {
    firstMissingStep = persistedStep;
  }

  return {
    state,
    completionPercentage,
    completedFields,
    missingFields,
    firstMissingStep,
    name,
    preferredRole,
    experienceLevel,
    hasActiveResume: input.hasActiveResume,
    metadata,
    shouldRedirectToWelcome: state === 'first_time',
  };
}

export function profileFieldLabel(field: ProfileCompletionField): string {
  switch (field) {
    case 'name':
      return 'Name';
    case 'role':
      return 'Target role';
    case 'experience':
      return 'Experience';
    case 'resume':
      return 'Resume';
  }
}
