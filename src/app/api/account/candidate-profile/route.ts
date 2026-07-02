import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  candidateProfileSchema,
  mergeCandidateProfile,
  parseStoredCandidateProfile,
  profileToStorage,
  defaultCandidateProfile,
} from '@/lib/candidate/candidate-profile';
import { parsePersistedDraft } from '@/lib/onboarding/persisted-draft';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('users')
      .select('onboarding_draft, candidate_profile')
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to load profile.' }, { status: 500 });
    }

    const draft = parsePersistedDraft(data.onboarding_draft ?? null);
    const stored = parseStoredCandidateProfile(data.candidate_profile ?? null);
    const profile = {
      ...defaultCandidateProfile({
        role: draft?.role,
        experienceYears: draft?.experienceYears,
      }),
      ...stored,
    };

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('[account/candidate-profile] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = candidateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid body' },
        { status: 400 },
      );
    }

    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('onboarding_draft, candidate_profile')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to load profile.' }, { status: 500 });
    }

    const draft = parsePersistedDraft(existing.onboarding_draft ?? null);
    const stored = parseStoredCandidateProfile(existing.candidate_profile ?? null);
    const base = {
      ...defaultCandidateProfile({
        role: draft?.role,
        experienceYears: draft?.experienceYears,
      }),
      ...stored,
    };

    const merged = mergeCandidateProfile(base, parsed.data);
    const { error: updateError } = await supabase
      .from('users')
      .update({ candidate_profile: profileToStorage(merged) })
      .eq('id', user.id);

    if (updateError) {
      console.error('[account/candidate-profile] PATCH error:', updateError.message);
      return NextResponse.json({ error: 'Failed to save profile.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, profile: merged });
  } catch (err) {
    console.error('[account/candidate-profile] PATCH unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
