'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import { hasClientSessionStorageHint } from '@/lib/supabase/client-session-hint';
import { trackEvent } from '@/lib/analytics/gtag';
import { trackProductEventClient } from '@/lib/analytics/product-events';
import { isSafePath } from '@/lib/auth/auth-params';
import {
  IE_MARKETING_CTA_SECONDARY_CLASS,
  IE_MARKETING_CTA_SECONDARY_STYLE,
  IE_SUBMIT_BUTTON_CLASS,
  IE_SUBMIT_BUTTON_STYLE,
} from '@/lib/theme/component-classes';

export type FreeToolGateTool = 'ats' | 'question_generator' | 'star' | 'prompt_builder';
export type FreeToolGateReason = 'AUTH_REQUIRED' | 'EMAIL_UNVERIFIED';

const TOOL_COPY: Record<FreeToolGateTool, { title: string; body: string }> = {
  ats: {
    title: 'Sign in to analyse your resume',
    body: 'The ATS Resume Checker is free with a registered InterviewEra account.',
  },
  question_generator: {
    title: 'Create a free account to generate interview questions',
    body: 'The Interview Question Generator is free with a registered InterviewEra account.',
  },
  star: {
    title: 'Prepare stronger behavioural answers with your free account',
    body: 'The STAR Answer Builder is free with a registered InterviewEra account.',
  },
  prompt_builder: {
    title: 'Sign in to build your interview prompt',
    body: 'The Interview Prompt Builder is free with a registered InterviewEra account.',
  },
};

/** Gate codes the server actions return; anything else is a normal tool error. */
export function isFreeToolGateCode(code: unknown): code is FreeToolGateReason {
  return code === 'AUTH_REQUIRED' || code === 'EMAIL_UNVERIFIED';
}

/**
 * UX-only pre-check + gate state. The server action / API route is the real
 * boundary (verified `auth.getUser()`); the cookie hint only avoids uploading a
 * resume or sending a form that the server would reject anyway.
 */
export function useFreeToolAuthGate(tool: FreeToolGateTool) {
  const [reason, setReason] = useState<FreeToolGateReason | null>(null);

  const openGate = useCallback(
    (next: FreeToolGateReason) => {
      setReason(next);
      trackEvent('free_tool_auth_gate_shown', { tool, reason: next });
      trackProductEventClient('free_tool_auth_gate_shown', { tool, reason: next });
    },
    [tool],
  );

  /** Returns true when the caller should stop and show the gate instead of submitting. */
  const blockIfSignedOut = useCallback((): boolean => {
    if (hasClientSessionStorageHint()) return false;
    openGate('AUTH_REQUIRED');
    return true;
  }, [openGate]);

  const closeGate = useCallback(() => setReason(null), []);

  return { gateReason: reason, openGate, closeGate, blockIfSignedOut };
}

export function FreeToolAuthGate({
  tool,
  reason,
  onDismiss,
}: {
  tool: FreeToolGateTool;
  reason: FreeToolGateReason;
  onDismiss?: () => void;
}) {
  const pathname = usePathname();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const next = isSafePath(pathname) ? pathname : '/dashboard';
  const nextParam = encodeURIComponent(next);
  const copy = TOOL_COPY[tool];

  useEffect(() => {
    headingRef.current?.focus();
  }, [reason]);

  return (
    <section
      role="region"
      aria-labelledby="free-tool-auth-gate-title"
      data-testid="free-tool-auth-gate"
      className="rounded-2xl border px-5 py-5 sm:px-6"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
        background: 'color-mix(in srgb, var(--accent-primary) 6%, var(--card-bg, transparent))',
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)' }}
          aria-hidden
        >
          <LockKeyhole className="size-4" style={{ color: 'var(--accent-primary)' }} />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id="free-tool-auth-gate-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-base font-semibold outline-none"
            style={{ color: 'var(--text-primary)' }}
          >
            {reason === 'EMAIL_UNVERIFIED' ? 'Verify your email to continue' : copy.title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {reason === 'EMAIL_UNVERIFIED'
              ? 'Confirm the link we emailed you, then come back to this tool.'
              : `${copy.body} It never uses your mock-interview credits. Fair-use limits apply.`}
          </p>

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            {reason === 'EMAIL_UNVERIFIED' ? (
              <Link
                href={`/auth/verify-pending?next=${nextParam}`}
                className={IE_SUBMIT_BUTTON_CLASS}
                style={IE_SUBMIT_BUTTON_STYLE}
              >
                Verify email
              </Link>
            ) : (
              <>
                <Link
                  href={`/signup?next=${nextParam}`}
                  className={`${IE_SUBMIT_BUTTON_CLASS} sm:w-auto`}
                  style={IE_SUBMIT_BUTTON_STYLE}
                  data-testid="free-tool-auth-gate-signup"
                >
                  Create your free account
                </Link>
                <Link
                  href={`/login?next=${nextParam}`}
                  className={IE_MARKETING_CTA_SECONDARY_CLASS}
                  style={IE_MARKETING_CTA_SECONDARY_STYLE}
                  data-testid="free-tool-auth-gate-login"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="ie-focus-visible mt-3 text-xs font-medium underline-offset-4 hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Keep editing
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
