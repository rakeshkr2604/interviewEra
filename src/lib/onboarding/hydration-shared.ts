import type { OnboardingPersistedDraft } from '@/lib/onboarding/persisted-draft'

/** Minimal resume ref for client + server hydration (no Supabase imports). */
export type HydratedResumeRef = { id: string } | null

/** Prefer live resume row over draft snapshot (draft often lacks resumeId until re-upload). */
export function resolveHydratedResumeId(
  draft: OnboardingPersistedDraft | null,
  resume: HydratedResumeRef,
  dataResumeId?: string | null,
): string | null {
  return resume?.id ?? dataResumeId ?? draft?.resumeId ?? null
}
