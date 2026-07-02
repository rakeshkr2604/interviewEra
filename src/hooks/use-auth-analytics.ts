'use client';

import { useCallback } from 'react';
import { trackProductEventClient, type ProductEventName } from '@/lib/analytics/product-events';
import type { AuthErrorCode } from '@/lib/auth/auth-errors';
import type { AuthIntent } from '@/lib/auth/auth-intent';

export type AuthFlow = 'login' | 'signup' | 'error_recovery' | 'oauth' | 'verify';

export interface AuthAnalyticsContext {
  flow: AuthFlow;
  intent?: AuthIntent;
  method?: 'password' | 'oauth' | 'email';
  provider?: string;
}

function emit(event: ProductEventName, props?: Record<string, string | number | boolean | undefined>) {
  trackProductEventClient(event, props);
}

export function useAuthAnalytics() {
  const trackAuthStarted = useCallback((ctx: AuthAnalyticsContext & { source_page?: string }) => {
    emit('auth_started', {
      flow: ctx.flow,
      intent: ctx.intent,
      source_page: ctx.source_page,
    });
  }, []);

  const trackSignupStarted = useCallback((ctx: AuthAnalyticsContext) => {
    emit('signup_started', { intent: ctx.intent, method: ctx.method ?? 'email' });
  }, []);

  const trackOauthStarted = useCallback(
    (ctx: { provider: string; flow: AuthFlow; intent?: AuthIntent; next?: string }) => {
      emit('oauth_started', {
        provider: ctx.provider,
        flow: ctx.flow,
        intent: ctx.intent,
        next: ctx.next,
      });
    },
    [],
  );

  const trackOauthCompleted = useCallback(
    (ctx: { provider: string; user_id?: string; is_new_user?: boolean; destination?: string }) => {
      emit('oauth_completed', {
        provider: ctx.provider,
        user_id: ctx.user_id,
        is_new_user: ctx.is_new_user,
        destination: ctx.destination,
      });
    },
    [],
  );

  const trackLoginCompleted = useCallback(
    (ctx: { method: string; user_id?: string; destination?: string }) => {
      emit('login_completed', {
        method: ctx.method,
        user_id: ctx.user_id,
        destination: ctx.destination,
      });
    },
    [],
  );

  const trackAuthFailed = useCallback(
    (ctx: { code: AuthErrorCode | string; flow?: AuthFlow; method?: string }) => {
      emit('auth_failed', {
        code: ctx.code,
        flow: ctx.flow,
        method: ctx.method,
      });
    },
    [],
  );

  const trackVerificationSent = useCallback((ctx: { intent?: AuthIntent; email_domain?: string }) => {
    emit('verification_sent', { intent: ctx.intent, email_domain: ctx.email_domain });
  }, []);

  const trackVerificationResent = useCallback((ctx: { intent?: AuthIntent }) => {
    emit('verification_resent', { intent: ctx.intent });
  }, []);

  const trackIntentDetected = useCallback((ctx: { intent: AuthIntent; source: string }) => {
    emit('intent_detected', { intent: ctx.intent, source: ctx.source });
  }, []);

  const trackRecoveryClicked = useCallback(
    (ctx: { code: AuthErrorCode | string; action: string }) => {
      emit('recovery_clicked', { code: ctx.code, action: ctx.action });
    },
    [],
  );

  const trackRoleSelected = useCallback((role: string) => {
    emit('role_selected', { role });
  }, []);

  return {
    trackAuthStarted,
    trackSignupStarted,
    trackOauthStarted,
    trackOauthCompleted,
    trackLoginCompleted,
    trackAuthFailed,
    trackVerificationSent,
    trackVerificationResent,
    trackIntentDetected,
    trackRecoveryClicked,
    trackRoleSelected,
  };
}
