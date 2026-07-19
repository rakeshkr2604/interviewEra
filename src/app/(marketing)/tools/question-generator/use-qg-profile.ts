'use client';

/**
 * QG preference profile state — anonymous-first, signed-in sync (Phase 2).
 *
 * Signed out: reads/writes the localStorage profile only.
 * Signed in: also reads users.candidate_profile via the existing
 * /api/account/candidate-profile route on load (server values win for
 * role/level/degree/targets; `domain` is client-only and always comes from
 * localStorage) and writes through to it on save. All network failures
 * degrade silently to the local profile — never block the generator.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CandidateProfileFields } from '@/lib/candidate/types';
import {
  mapCanonicalLevelToQgLevel,
  mapQgLevelToCanonicalLevel,
  type CanonicalExperienceLevel,
  type QgPreferenceProfile,
} from '@/lib/question-engine/preference-profile';
import {
  QG_PROFILE_CTA_DISMISSED_KEY,
  QG_PROFILE_SYNC_DISMISSED_KEY,
  getLocalProfile,
  isProfileFlagSet,
  setLocalProfile,
  setProfileFlag,
} from './qg-profile-storage';
import {
  trackQgProfileCreated,
  trackQgProfileSavedToAccount,
  trackQgProfileUpdated,
} from './qg-analytics';

export type QgProfileDraft = Omit<QgPreferenceProfile, 'profile_version'>;

export interface QgProfileState {
  /** True once the initial load (auth probe + profile fetch) finished. */
  ready: boolean;
  isSignedIn: boolean;
  /** Merged profile for prefill (server-over-local when signed in). */
  profile: QgProfileDraft | null;
  /** Signed out + local profile present + not dismissed. */
  showSignupCta: boolean;
  dismissSignupCta: () => void;
  /** Signed in + local profile present + no Phase-2 server data yet + not dismissed. */
  showAccountSyncPrompt: boolean;
  dismissAccountSyncPrompt: () => void;
  /** Push the local profile into candidate_profile. Resolves false on any failure. */
  syncLocalToAccount: () => Promise<boolean>;
  /** Write-through save: localStorage always, candidate_profile too when signed in. */
  saveProfile: (patch: QgProfileDraft) => void;
}

const AUTH_PROBE_TIMEOUT_MS = 8_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function mergeDraft(base: QgProfileDraft | null, patch: QgProfileDraft): QgProfileDraft {
  return {
    role: patch.role ?? base?.role,
    level: patch.level ?? base?.level,
    domain: patch.domain ?? base?.domain,
    degree: patch.degree ?? base?.degree,
    target_roles: patch.target_roles ?? base?.target_roles,
    target_companies: patch.target_companies ?? base?.target_companies,
  };
}

/** Map a QG draft onto the candidate-profile PATCH body (camelCase, D2 level rule). */
function buildAccountPatchBody(
  draft: QgProfileDraft,
  currentCanonicalLevel: CanonicalExperienceLevel | null,
): Record<string, unknown> {
  return {
    ...(draft.role?.trim() ? { preferredRole: draft.role.trim() } : {}),
    ...(draft.level
      ? { experienceLevel: mapQgLevelToCanonicalLevel(draft.level, currentCanonicalLevel) }
      : {}),
    ...(draft.degree?.trim() ? { degree: draft.degree.trim() } : {}),
    ...(draft.target_roles?.length ? { targetRoles: draft.target_roles } : {}),
    ...(draft.target_companies?.length ? { targetCompanies: draft.target_companies } : {}),
  };
}

function serverFieldsToDraft(fields: CandidateProfileFields, local: QgProfileDraft | null): QgProfileDraft {
  return {
    ...(local ?? {}),
    ...(fields.preferredRole ? { role: fields.preferredRole } : {}),
    level: mapCanonicalLevelToQgLevel(fields.experienceLevel),
    ...(fields.degree ? { degree: fields.degree } : {}),
    ...(fields.targetRoles?.length ? { target_roles: fields.targetRoles } : {}),
    ...(fields.targetCompanies?.length ? { target_companies: fields.targetCompanies } : {}),
  };
}

function serverHasPhase2Data(fields: CandidateProfileFields): boolean {
  return Boolean(
    fields.degree || fields.targetRoles?.length || fields.targetCompanies?.length,
  );
}

export function useQgProfile(): QgProfileState {
  const [ready, setReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [profile, setProfile] = useState<QgProfileDraft | null>(null);
  const [showSignupCta, setShowSignupCta] = useState(false);
  const [showAccountSyncPrompt, setShowAccountSyncPrompt] = useState(false);

  const signedInRef = useRef(false);
  const profileRef = useRef<QgProfileDraft | null>(null);
  const serverLevelRef = useRef<CanonicalExperienceLevel | null>(null);
  const hasSavedBeforeRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const stored = getLocalProfile();
      const local: QgProfileDraft | null = stored
        ? (({ profile_version: _v, ...rest }) => rest)(stored)
        : null;
      hasSavedBeforeRef.current = stored !== null;

      let signedIn = false;
      try {
        const supabase = createClient();
        const auth = await withTimeout(supabase.auth.getUser(), AUTH_PROBE_TIMEOUT_MS);
        signedIn = Boolean(auth && !auth.error && auth.data.user);
      } catch {
        signedIn = false;
      }

      let serverFields: CandidateProfileFields | null = null;
      if (signedIn) {
        try {
          const res = await fetch('/api/account/candidate-profile');
          if (res.ok) {
            const data = (await res.json()) as { profile?: CandidateProfileFields };
            serverFields = data.profile ?? null;
          }
        } catch {
          // Degrade to the local profile.
        }
      }

      if (cancelled) return;

      signedInRef.current = signedIn;
      serverLevelRef.current = serverFields?.experienceLevel ?? null;

      const merged = serverFields ? serverFieldsToDraft(serverFields, local) : local;
      profileRef.current = merged;

      setIsSignedIn(signedIn);
      setProfile(merged);
      setShowSignupCta(
        !signedIn && local !== null && !isProfileFlagSet(QG_PROFILE_CTA_DISMISSED_KEY),
      );
      setShowAccountSyncPrompt(
        signedIn &&
          local !== null &&
          serverFields !== null &&
          !serverHasPhase2Data(serverFields) &&
          !isProfileFlagSet(QG_PROFILE_SYNC_DISMISSED_KEY),
      );
      setReady(true);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveProfile = useCallback((patch: QgProfileDraft) => {
    const merged = mergeDraft(profileRef.current, patch);
    profileRef.current = merged;
    setProfile(merged);
    setLocalProfile(merged);

    const eventProps = {
      signedIn: signedInRef.current,
      role: merged.role,
      level: merged.level,
      domain: merged.domain,
    };
    if (hasSavedBeforeRef.current) {
      trackQgProfileUpdated(eventProps);
    } else {
      trackQgProfileCreated(eventProps);
      hasSavedBeforeRef.current = true;
    }

    if (!signedInRef.current) return;

    const body = buildAccountPatchBody(merged, serverLevelRef.current);
    if (Object.keys(body).length === 0) return;
    const resolvedLevel = body.experienceLevel as CanonicalExperienceLevel | undefined;
    void fetch('/api/account/candidate-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (res.ok && resolvedLevel) serverLevelRef.current = resolvedLevel;
        if (res.ok) {
          // Account already holds the latest data — the one-time sync prompt is moot.
          setProfileFlag(QG_PROFILE_SYNC_DISMISSED_KEY);
          setShowAccountSyncPrompt(false);
        }
      })
      .catch(() => {
        // Degrade: local copy is already saved.
      });
  }, []);

  const syncLocalToAccount = useCallback(async (): Promise<boolean> => {
    const stored = getLocalProfile();
    if (!stored || !signedInRef.current) return false;
    const body = buildAccountPatchBody(stored, serverLevelRef.current);
    if (Object.keys(body).length === 0) return false;
    try {
      const res = await fetch('/api/account/candidate-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return false;
      const resolvedLevel = body.experienceLevel as CanonicalExperienceLevel | undefined;
      if (resolvedLevel) serverLevelRef.current = resolvedLevel;
      setProfileFlag(QG_PROFILE_SYNC_DISMISSED_KEY);
      setShowAccountSyncPrompt(false);
      trackQgProfileSavedToAccount({
        signedIn: true,
        role: stored.role,
        level: stored.level,
        domain: stored.domain,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const dismissSignupCta = useCallback(() => {
    setProfileFlag(QG_PROFILE_CTA_DISMISSED_KEY);
    setShowSignupCta(false);
  }, []);

  const dismissAccountSyncPrompt = useCallback(() => {
    setProfileFlag(QG_PROFILE_SYNC_DISMISSED_KEY);
    setShowAccountSyncPrompt(false);
  }, []);

  return {
    ready,
    isSignedIn,
    profile,
    showSignupCta,
    dismissSignupCta,
    showAccountSyncPrompt,
    dismissAccountSyncPrompt,
    syncLocalToAccount,
    saveProfile,
  };
}
