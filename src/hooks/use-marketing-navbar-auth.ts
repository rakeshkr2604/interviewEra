'use client';

import { useEffect, useState } from 'react';
import { resolveOAuthPictureUrl } from '@/lib/profile/user-display';
import type { PlanTier } from '@/types/app.types';

export interface MarketingNavUser {
  name: string | null;
  email: string;
  plan_tier: PlanTier;
  credits_remaining: number;
  avatar_path: string | null;
  oauth_picture_url: string | null;
}

export type MarketingNavbarVariant = 'anon' | 'student' | 'admin';

export interface MarketingNavbarAuthState {
  /** True until the initial client auth probe finishes. */
  authPending: boolean;
  /**
   * Neutral skeleton until auth resolves — used for SSR + first paint so
   * logged-in users never flash AnonymousNav ("Sign in / Sign up").
   */
  showAuthPlaceholder: boolean;
  variant: MarketingNavbarVariant;
  user: MarketingNavUser | null;
}

const AUTH_DETECT_TIMEOUT_MS = 8_000;

async function withAuthTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
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

/**
 * Resolves marketing navbar auth variant + user profile for Navbar rendering.
 * All Supabase/session probing lives here — not in presentation components.
 *
 * Perf: `@/lib/supabase/client` is dynamically imported inside the mount effect
 * so the marketing homepage initial JS does not pay for supabase-js upfront.
 *
 * SSR / first paint always uses a neutral skeleton (`showAuthPlaceholder`) so
 * logged-in users never see AnonymousNav ("Sign in / Sign up") before the
 * client auth probe finishes. Homepage stays cookie-free / ISR-cacheable.
 */
export function useMarketingNavbarAuth(): MarketingNavbarAuthState {
  const [authPending, setAuthPending] = useState(true);
  const [variant, setVariant] = useState<MarketingNavbarVariant>('anon');
  const [user, setUser] = useState<MarketingNavUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const detect = async () => {
      try {
        if (cancelled) return;
        const { createClient } = await import('@/lib/supabase/client');
        if (cancelled) return;
        const supabase = createClient();

        const resolveUser = async (
          uid: string,
          email: string,
          metadata?: Record<string, unknown>,
        ) => {
          const { data: profile } = await supabase
            .from('users')
            .select('name, plan_tier, credits_remaining, avatar_path')
            .eq('id', uid)
            .maybeSingle();
          if (cancelled) return;
          const planTier = (profile?.plan_tier ?? 'free') as PlanTier;
          setUser({
            name: profile?.name ?? null,
            email,
            plan_tier: planTier,
            credits_remaining: profile?.credits_remaining ?? 0,
            avatar_path:
              profile && typeof profile.avatar_path === 'string' ? profile.avatar_path : null,
            oauth_picture_url: resolveOAuthPictureUrl(metadata),
          });
          setVariant(planTier === 'campus_admin' ? 'admin' : 'student');
        };

        const subscribeAuth = () => {
          const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (cancelled) return;
            if (!session?.user) {
              setVariant('anon');
              setUser(null);
              return;
            }
            await resolveUser(session.user.id, session.user.email ?? '', session.user.user_metadata);
          });
          unsubscribe = () => sub.subscription.unsubscribe();
        };

        const authResult = await withAuthTimeout(supabase.auth.getUser(), AUTH_DETECT_TIMEOUT_MS);
        if (!authResult) {
          if (!cancelled) setVariant('anon');
          subscribeAuth();
          return;
        }

        const { data: authData, error: authError } = authResult;

        if (authError) {
          const { signOutIfStaleAuth } = await import('@/lib/supabase/session');
          await signOutIfStaleAuth(supabase, authError);
          if (!cancelled) setVariant('anon');
          subscribeAuth();
          return;
        }

        const authUser = authData.user;
        if (!authUser) {
          if (!cancelled) setVariant('anon');
        } else {
          await resolveUser(authUser.id, authUser.email ?? '', authUser.user_metadata);
        }

        subscribeAuth();
      } catch {
        if (!cancelled) setVariant('anon');
      } finally {
        if (!cancelled) setAuthPending(false);
      }
    };

    void detect();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return {
    authPending,
    // Always skeleton until the client probe finishes — never SSR AnonymousNav.
    showAuthPlaceholder: authPending,
    variant,
    user,
  };
}
