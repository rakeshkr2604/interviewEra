'use client';

/**
 * Narrow interview-session diagnostic hooks (network + critical exceptions).
 * Must never throw into interview flow; self-skips diagnostic recursion.
 */

import { classifyClientException } from '@/lib/diagnostics/classify';
import { emitInterviewDiagnostic } from '@/lib/diagnostics/client';

const NETWORK_DEDUPE_MS = 30_000;

type InstallArgs = {
  interviewId: string;
  getPhase?: () => string | undefined;
};

/**
 * offline/online listeners with transition dedupe.
 * Emits initial offline only (online-at-start is not actionable).
 */
export function installInterviewNetworkDiagnostics(args: InstallArgs): () => void {
  if (typeof window === 'undefined') return () => {};

  let lastState: 'online' | 'offline' | null = null;
  let lastAt = 0;

  const emit = (state: 'online' | 'offline') => {
    try {
      const now = Date.now();
      if (lastState === state && now - lastAt < NETWORK_DEDUPE_MS) return;
      lastState = state;
      lastAt = now;
      emitInterviewDiagnostic({
        interviewId: args.interviewId,
        eventType: state === 'offline' ? 'network_offline' : 'network_online',
        errorCode: state,
        metadata: {
          component: 'network',
          network_state: state,
          ...(args.getPhase?.() ? { phase: args.getPhase()! } : {}),
        },
      });
    } catch {
      /* never throw */
    }
  };

  const onOffline = () => emit('offline');
  const onOnline = () => emit('online');

  window.addEventListener('offline', onOffline);
  window.addEventListener('online', onOnline);

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    emit('offline');
  }

  return () => {
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('online', onOnline);
  };
}

/**
 * Window error + unhandledrejection — failure-biased codes only.
 * Skips diagnostic self-noise and benign abort-like rejections.
 */
export function installInterviewExceptionDiagnostics(args: InstallArgs): () => void {
  if (typeof window === 'undefined') return () => {};

  const onError = (event: ErrorEvent) => {
    try {
      const classified = classifyClientException({
        name: event.error instanceof Error ? event.error.name : 'Error',
        message: event.message,
      });
      if (classified.errorCode === 'diag_self_skip') return;
      emitInterviewDiagnostic({
        interviewId: args.interviewId,
        eventType: classified.eventType,
        errorCode: classified.errorCode,
        severity: 'error',
        metadata: {
          component: 'ui',
          ...(args.getPhase?.() ? { phase: args.getPhase()! } : {}),
        },
      });
    } catch {
      /* never throw */
    }
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    try {
      const reason = event.reason;
      const name = reason instanceof Error ? reason.name : 'UnhandledRejection';
      const message = reason instanceof Error ? reason.message : String(reason ?? '');
      if (name === 'AbortError' || /aborted|signal is aborted/i.test(message)) return;
      const classified = classifyClientException({ name, message });
      if (classified.errorCode === 'diag_self_skip') return;
      emitInterviewDiagnostic({
        interviewId: args.interviewId,
        eventType: classified.eventType,
        errorCode: classified.errorCode,
        severity: 'error',
        metadata: {
          component: 'ui',
          ...(args.getPhase?.() ? { phase: args.getPhase()! } : {}),
        },
      });
    } catch {
      /* never throw */
    }
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
