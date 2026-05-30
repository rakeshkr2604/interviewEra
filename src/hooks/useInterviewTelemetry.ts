'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  interviewTelemetry,
  type InterviewEventType,
  type InterviewTelemetryOptions,
} from '@/lib/telemetry/interview-telemetry';

export interface InterviewTelemetryLiveContext {
  interviewId: string;
  questionIndex: number;
  phase: string;
}

export interface UseInterviewTelemetryReturn {
  /**
   * Emit a structured interview telemetry event. The mandatory context fields
   * (interviewId / questionIndex / phase) are read from a ref that is refreshed
   * on every render, so a `track` captured once in a long-lived callback or
   * watchdog always logs the CURRENT question/phase — no stale-closure context.
   */
  track: (
    type: InterviewEventType,
    event: string,
    data?: Record<string, unknown>,
    options?: InterviewTelemetryOptions,
  ) => void;
}

/**
 * Binds the live interview context to the unified telemetry layer.
 *
 * The page passes the current interviewId / questionIndex / phase on each
 * render; this hook mirrors them into a ref so the returned `track` is stable
 * (safe to use in effect deps and to pass into watchdogs) yet never logs stale
 * context. This is the fix for the audit's "mandatory fields missing /
 * inconsistent" finding — every event from every call site is complete.
 */
export function useInterviewTelemetry(
  ctx: InterviewTelemetryLiveContext,
): UseInterviewTelemetryReturn {
  const ctxRef = useRef(ctx);
  // Refresh after each render (per React's latest-ref guidance) so the stable
  // `track` always reads current context. `track` is only ever invoked from
  // event handlers / effects / timeouts — never during render — so it observes
  // the committed value, not a stale one.
  useEffect(() => {
    ctxRef.current = ctx;
  });

  const track = useCallback<UseInterviewTelemetryReturn['track']>(
    (type, event, data, options) => {
      interviewTelemetry(type, event, ctxRef.current, data, options);
    },
    [],
  );

  return { track };
}
