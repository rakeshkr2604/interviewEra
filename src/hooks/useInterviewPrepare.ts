'use client';

import { useCallback, useRef } from 'react';

type PrepareResult =
  | { ok: true; ready: boolean }
  | { ok: false; error: string };

/**
 * Idempotent prepare + poll until questions exist (async interview start).
 */
export function useInterviewPrepare() {
  const prepareStarted = useRef<Set<string>>(new Set());

  const ensureQuestionsReady = useCallback(async (interviewId: string): Promise<PrepareResult> => {
    const poll = async (): Promise<PrepareResult> => {
      const res = await fetch(`/api/interview/${interviewId}`, { credentials: 'include' });
      if (!res.ok) {
        return { ok: false, error: 'Failed to load interview status.' };
      }
      const data = (await res.json()) as { questions?: unknown[]; preparing?: boolean };
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        return { ok: true, ready: true };
      }
      if (!data.preparing) {
        return { ok: false, error: 'Interview has no questions. Please go back and try again.' };
      }
      return { ok: true, ready: false };
    };

    let status = await poll();
    if (status.ok && status.ready) return status;

    if (!prepareStarted.current.has(interviewId)) {
      prepareStarted.current.add(interviewId);
      const prepRes = await fetch(`/api/interview/${interviewId}/prepare`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!prepRes.ok) {
        const body = (await prepRes.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: body.error ?? 'Could not prepare your interview.' };
      }
    }

    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, i < 3 ? 1500 : 2000));
      status = await poll();
      if (!status.ok) return status;
      if (status.ready) return status;
    }

    return { ok: false, error: 'Question generation is taking longer than expected. Please retry.' };
  }, []);

  return { ensureQuestionsReady };
}
