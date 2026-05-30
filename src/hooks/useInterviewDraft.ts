'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  saveInterviewDraft,
  clearInterviewDraft,
  reconcileDraft,
  type InterviewDraftInput,
  type DraftReconciliation,
} from '@/lib/session/interview-draft';

export interface UseInterviewDraftReturn {
  /** Persist the current in-progress state. Cheap; safe to call on each change. */
  persist: (input: InterviewDraftInput) => void;
  /** Delete the draft — call after a successful submit and on completion. */
  clear: () => void;
  /** Decide whether a stored draft should be replayed given server progress. */
  reconcile: (serverQuestionIndex: number) => DraftReconciliation;
  /**
   * Toggle the `beforeunload` guard. Pass true while the candidate has genuine
   * in-progress work so an accidental refresh/close prompts a confirmation.
   */
  setUnloadGuard: (active: boolean) => void;
}

/**
 * Client-side interview recovery layer (audit P0 — refresh safety).
 *
 * Owns draft persistence, server reconciliation, and the `beforeunload` guard.
 * The page calls {@link persist} as in-progress state changes, {@link clear} on
 * successful submit / completion, and {@link reconcile} once on load to decide
 * whether to restore.
 */
export function useInterviewDraft(interviewId: string): UseInterviewDraftReturn {
  const guardRef = useRef(false);

  const persist = useCallback((input: InterviewDraftInput) => {
    saveInterviewDraft(input);
  }, []);

  const clear = useCallback(() => {
    if (interviewId) clearInterviewDraft(interviewId);
  }, [interviewId]);

  const reconcile = useCallback(
    (serverQuestionIndex: number) => reconcileDraft(interviewId, serverQuestionIndex),
    [interviewId],
  );

  const setUnloadGuard = useCallback((active: boolean) => {
    guardRef.current = active;
  }, []);

  // beforeunload — the draft is already persisted (progress is RECOVERABLE), but
  // the native prompt still lets the user cancel an accidental refresh/close.
  // Guarded by a ref so toggling it never re-registers the listener.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: BeforeUnloadEvent) => {
      if (!guardRef.current) return;
      e.preventDefault();
      // Legacy browsers require returnValue to be set to trigger the prompt.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return { persist, clear, reconcile, setUnloadGuard };
}
