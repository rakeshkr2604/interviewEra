'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AuthBrandChipIcon } from '@/components/auth/AuthBrandChipIcon';
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit';
import { RecoveryAction } from '@/components/auth/RecoveryAction';
import type { AuthIntent } from '@/lib/auth/auth-intent';
import {
  getAuthErrorDefinition,
  isAuthErrorCode,
  resolveRecoveryActions,
  type AuthErrorCode,
} from '@/lib/auth/auth-errors';
import { useAuthAnalytics } from '@/hooks/use-auth-analytics';

export interface AuthErrorRecoveryProps {
  code: string | null | undefined;
  email?: string;
  intent?: AuthIntent;
  next?: string;
}

export function AuthErrorRecovery({ code, email, intent, next }: AuthErrorRecoveryProps) {
  const { trackRecoveryClicked, trackAuthFailed } = useAuthAnalytics();
  const trackedRef = useRef(false);
  const resolvedCode: AuthErrorCode = isAuthErrorCode(code) ? code : 'auth_callback_failed';
  const definition = getAuthErrorDefinition(resolvedCode);
  const actions = resolveRecoveryActions(definition, { email, intent, next });

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackAuthFailed({ code: resolvedCode, flow: 'error_recovery' });
  }, [resolvedCode, trackAuthFailed]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-2">
          <AuthBrandChipIcon />
          <BrandWordmarkSplit interviewClassName="font-medium" eraClassName="font-semibold" />
        </div>
        <Link
          href="/"
          className="text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ color: 'var(--accent-primary)' }}
        >
          Back to home
        </Link>
      </div>

      <div className="space-y-3 text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
          {definition.title}
        </h1>
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {definition.description}
        </p>
      </div>

      <ul className="space-y-3" role="list">
        {actions.map((action) => (
          <li key={action.id} role="listitem">
            <RecoveryAction
              title={action.title}
              description={action.description}
              href={action.href}
              analyticsAction={action.analyticsAction}
              onNavigate={(analyticsAction) =>
                trackRecoveryClicked({ code: resolvedCode, action: analyticsAction })
              }
            />
          </li>
        ))}
      </ul>

      <div className="space-y-2 text-center text-sm sm:text-left" style={{ color: 'var(--text-secondary)' }}>
        <p>
          Signed in with the wrong account?{' '}
          <Link href="/login" className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
            Switch account
          </Link>
        </p>
        {definition.supportEmail ? (
          <p>
            Need help?{' '}
            <a
              href={`mailto:${definition.supportEmail}`}
              className="font-semibold"
              style={{ color: 'var(--accent-primary)' }}
            >
              {definition.supportEmail}
            </a>
          </p>
        ) : (
          <p>
            Need help?{' '}
            <a href="mailto:help@interviewera.com" className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
              help@interviewera.com
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
