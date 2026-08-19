import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';
import type { ProductEventPayload } from '@/lib/analytics/product-events';
import { loadProfileOnboardingState } from '@/lib/profile/load-onboarding-state';
import { onboardingActionSchema } from '@/lib/profile/onboarding-actions';
import {
  mergeCandidateProfileJson,
  parseProfileOnboardingMetadata,
  resolveProfileOnboarding,
  shouldTrackOnboardingStarted,
  shouldTrackOnboardingStepCompleted,
  didProfileCompletionChange,
  withProfileOnboardingMetadata,
  type ProfileOnboardingMetadata,
  type ProfileOnboardingResolution,
} from '@/lib/profile/onboarding-state';
const PRODUCT_EVENT_TRACE_ENABLED = process.env.IE_DIAGNOSTICS_PRODUCT_EVENT_TRACE === '1';

type ResumeOwnershipResult =
  | { ok: true; hasActiveResume: boolean }
  | { ok: false; response: NextResponse };

function responseState(
  resolution: ProfileOnboardingResolution,
  activeResume: { id: string; status: string; isPrimary: boolean } | null,
) {
  return {
    state: resolution.state,
    completionPercentage: resolution.completionPercentage,
    completedFields: resolution.completedFields,
    missingFields: resolution.missingFields,
    firstMissingStep: resolution.firstMissingStep,
    profile: {
      name: resolution.name,
      preferredRole: resolution.preferredRole,
      experienceLevel: resolution.experienceLevel,
    },
    resume: activeResume,
  };
}

async function verifyResumeOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  resumeId: string | null | undefined,
  existingHasResume: boolean,
): Promise<ResumeOwnershipResult> {
  if (!resumeId) return { ok: true, hasActiveResume: existingHasResume };

  const { data: resume, error } = await supabase
    .from('resumes')
    .select('id, status, deleted_at, storage_path')
    .eq('id', resumeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !resume) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Resume not found for this account.' }, { status: 403 }),
    };
  }
  if (resume.deleted_at) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Deleted resumes cannot be used.' }, { status: 400 }),
    };
  }
  const hasFile =
    typeof resume.storage_path === 'string' && resume.storage_path.trim().length > 0;
  if (!hasFile || resume.status === 'failed') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Resume is not active.' }, { status: 400 }),
    };
  }
  return { ok: true, hasActiveResume: true };
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const loaded = await loadProfileOnboardingState(supabase, user.id);
    if (!loaded) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }
    return NextResponse.json(
      responseState(
        loaded.resolution,
        loaded.activeResume
          ? {
              id: loaded.activeResume.id,
              status: loaded.activeResume.status,
              isPrimary: loaded.activeResume.isPrimary,
            }
          : null,
      ),
    );
  } catch (error) {
    console.error('[account/onboarding] GET error', error);
    return NextResponse.json({ error: 'Failed to load onboarding.' }, { status: 500 });
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const requestId = PRODUCT_EVENT_TRACE_ENABLED
      ? (request.headers.get('x-ie-correlation-id') ??
        request.headers.get('x-vercel-id') ??
        randomUUID().slice(0, 12))
      : null;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
    const parsed = onboardingActionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid onboarding action.' },
        { status: 400 },
      );
    }

    const loaded = await loadProfileOnboardingState(supabase, user.id);
    if (!loaded) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });

    const before = loaded.resolution;
    const previousMetadata = parseProfileOnboardingMetadata(loaded.candidateProfile);
    const now = new Date().toISOString();
    let candidateProfile = loaded.candidateProfile;
    let name = before.name;
    let hasActiveResume = before.hasActiveResume;
    let metadata: ProfileOnboardingMetadata = previousMetadata ?? {
      version: 1,
      current_step: before.firstMissingStep,
      highest_step_completed: 0,
      last_completion_pct: before.completionPercentage,
    };
    const events: ProductEventPayload[] = [];

    if (parsed.data.action === 'start') {
      if (shouldTrackOnboardingStarted(previousMetadata)) {
        metadata = { ...metadata, started_at: now, current_step: before.firstMissingStep };
        events.push({ event_name: 'onboarding_started', source: 'welcome' });
      }
    } else if (parsed.data.action === 'save-step') {
      const ownership =
        parsed.data.step === 3
          ? await verifyResumeOwnership(
              supabase,
              user.id,
              parsed.data.resumeId,
              before.hasActiveResume,
            )
          : { ok: true as const, hasActiveResume: before.hasActiveResume };
      if (!ownership.ok) return ownership.response;
      hasActiveResume = ownership.hasActiveResume;

      if (parsed.data.step === 1) {
        name = parsed.data.name;
        candidateProfile = mergeCandidateProfileJson(candidateProfile, {
          preferred_role: parsed.data.preferredRole,
        });
      } else if (parsed.data.step === 2) {
        candidateProfile = mergeCandidateProfileJson(candidateProfile, {
          experience_level: parsed.data.experienceLevel,
        });
      }

      const priorHighest = metadata.highest_step_completed ?? 0;
      const nextStep = Math.min(4, parsed.data.step + 1) as 2 | 3 | 4;
      metadata = {
        ...metadata,
        started_at: metadata.started_at ?? now,
        current_step: nextStep,
        highest_step_completed: Math.max(priorHighest, parsed.data.step) as 1 | 2 | 3 | 4,
      };
      if (shouldTrackOnboardingStepCompleted(previousMetadata, parsed.data.step)) {
        events.push({
          event_name: 'onboarding_step_completed',
          step: parsed.data.step,
          source: 'welcome',
        });
      }
    } else {
      const ownership = await verifyResumeOwnership(
        supabase,
        user.id,
        parsed.data.resumeId,
        before.hasActiveResume,
      );
      if (!ownership.ok) return ownership.response;
      hasActiveResume = ownership.hasActiveResume;

      const preComplete = resolveProfileOnboarding({
        name,
        candidateProfile,
        hasActiveResume,
        hasInterviewHistory: before.state !== 'first_time',
      });
      if (!preComplete.completedFields.includes('name')) {
        return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
      }
      if (!preComplete.completedFields.includes('role')) {
        return NextResponse.json({ error: 'Target role is required.' }, { status: 400 });
      }
      if (!preComplete.completedFields.includes('experience')) {
        return NextResponse.json({ error: 'Experience level is required.' }, { status: 400 });
      }

      metadata = {
        ...metadata,
        started_at: metadata.started_at ?? now,
        completed_at: metadata.completed_at ?? now,
        current_step: 4,
        highest_step_completed: 4,
      };
      if (!previousMetadata?.completed_at) {
        events.push({ event_name: 'onboarding_completed', source: 'welcome' });
      }
    }

    candidateProfile = withProfileOnboardingMetadata(candidateProfile, metadata);
    const after = resolveProfileOnboarding({
      name,
      candidateProfile,
      hasActiveResume,
      hasInterviewHistory: before.state !== 'first_time',
    });
    metadata = { ...metadata, last_completion_pct: after.completionPercentage };
    candidateProfile = withProfileOnboardingMetadata(candidateProfile, metadata);

    const { error: updateError } = await supabase
      .from('users')
      .update({ name, candidate_profile: candidateProfile })
      .eq('id', user.id);
    if (updateError) {
      console.error('[account/onboarding] update error', updateError.message);
      return NextResponse.json({ error: 'Failed to save onboarding progress.' }, { status: 500 });
    }

    if (didProfileCompletionChange(before, after)) {
      events.push({
        event_name: 'profile_completion_updated',
        previous_pct: before.completionPercentage,
        current_pct: after.completionPercentage,
        previous_state: before.state,
        current_state: after.state,
      });
    }
    for (const event of events) {
      const payload: ProductEventPayload = { ...event, user_id: user.id };
      if (PRODUCT_EVENT_TRACE_ENABLED) {
        payload.request_id = requestId ?? undefined;
        payload.route = '/api/account/onboarding';
      }
      trackProductEventServer(payload);
    }

    return NextResponse.json(responseState(after, loaded.activeResume));
  } catch (error) {
    console.error('[account/onboarding] PATCH error', error);
    return NextResponse.json({ error: 'Failed to save onboarding.' }, { status: 500 });
  }
}
