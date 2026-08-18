import 'server-only';

import { createClient } from '@/lib/supabase/server';
import {
  resolveProfileOnboarding,
  type ProfileOnboardingResolution,
} from '@/lib/profile/onboarding-state';

export type ActiveProfileResume = {
  id: string;
  status: 'uploading' | 'parsing' | 'parsed';
  isPrimary: boolean;
  createdAt: string;
};

export type LoadedProfileOnboarding = {
  resolution: ProfileOnboardingResolution;
  candidateProfile: unknown;
  activeResume: ActiveProfileResume | null;
};

export async function loadProfileOnboardingState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<LoadedProfileOnboarding | null> {
  const [{ data: profile, error: profileError }, { data: resumes }, { count: interviewCount }] =
    await Promise.all([
      supabase
        .from('users')
        .select('name, candidate_profile')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('resumes')
        .select('id, status, is_primary, created_at, storage_path')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .in('status', ['uploading', 'parsing', 'parsed'])
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('interviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ]);

  if (profileError || !profile) return null;

  const activeRow =
    (resumes ?? []).find(
      (row) => typeof row.storage_path === 'string' && row.storage_path.trim().length > 0,
    ) ?? null;
  const activeResume: ActiveProfileResume | null = activeRow
    ? {
        id: String(activeRow.id),
        status: activeRow.status as ActiveProfileResume['status'],
        isPrimary: Boolean(activeRow.is_primary),
        createdAt: String(activeRow.created_at),
      }
    : null;

  return {
    resolution: resolveProfileOnboarding({
      name: profile.name as string | null,
      candidateProfile: profile.candidate_profile,
      hasActiveResume: Boolean(activeResume),
      hasInterviewHistory: (interviewCount ?? 0) > 0,
    }),
    candidateProfile: profile.candidate_profile,
    activeResume,
  };
}
