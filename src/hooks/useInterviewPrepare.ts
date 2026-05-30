'use client';

import { useCallback, useRef } from 'react';

type PrepareResult =
  | { ok: true; ready: boolean }
  | { ok: false; error: string };

// Poll window MUST exceed the server's prepare `maxDuration` (60s) plus grace,
// otherwise the client reports a false "taking longer than expected" while the
// serverless function is still generating questions (audit P1 #7). 3 fast polls
// (1.5s) + 27 steady polls (2.5s) ≈ 72s — comfortably past the 60s ceiling.
const FAST_POLL_COUNT = 3;
const FAST_POLL_DELAY_MS = 1_500;
const STEADY_POLL_DELAY_MS = 2_500;
const MAX_POLL_ATTEMPTS = 30;

// Per-request budgets so a dead mobile connection cannot hang a single poll or
// the prepare POST forever (the loop's own deadline only bounds the aggregate).
const POLL_REQUEST_TIMEOUT_MS = 30_000;
const PREPARE_REQUEST_TIMEOUT_MS = 65_000;

/** fetch with an AbortController deadline (AbortSignal.timeout isn't on iOS 15). */
async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Idempotent prepare + poll until questions exist (async interview start).
 */
export function useInterviewPrepare() {
  const prepareStarted = useRef<Set<string>>(new Set());

  const ensureQuestionsReady = useCallback(async (interviewId: string): Promise<PrepareResult> => {
    const poll = async (): Promise<PrepareResult> => {
      let res: Response;
      try {
        res = await fetchWithTimeout(
          `/api/interview/${interviewId}`,
          { credentials: 'include' },
          POLL_REQUEST_TIMEOUT_MS,
        );
      } catch {
        // A single timed-out / dropped poll is transient — report not-ready so
        // the loop retries rather than aborting the whole interview start.
        return { ok: true, ready: false };
      }
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
      let prepRes: Response;
      try {
        prepRes = await fetchWithTimeout(
          `/api/interview/${interviewId}/prepare`,
          { method: 'POST', credentials: 'include' },
          PREPARE_REQUEST_TIMEOUT_MS,
        );
      } catch {
        // Allow a retry of prepare on a later call — clear the once-guard.
        prepareStarted.current.delete(interviewId);
        return { ok: false, error: 'Could not start question generation. Please retry.' };
      }
      if (!prepRes.ok) {
        prepareStarted.current.delete(interviewId);
        const body = (await prepRes.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: body.error ?? 'Could not prepare your interview.' };
      }
    }

    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, i < FAST_POLL_COUNT ? FAST_POLL_DELAY_MS : STEADY_POLL_DELAY_MS));
      status = await poll();
      if (!status.ok) return status;
      if (status.ready) return status;
    }

    return { ok: false, error: 'Question generation is taking longer than expected. Please retry.' };
  }, []);

  return { ensureQuestionsReady };
}
