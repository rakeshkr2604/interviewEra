'use client';

import { useEffect, useRef } from 'react';
import type { UseInterviewTelemetryReturn } from '@/hooks/useInterviewTelemetry';

// ─────────────────────────────────────────────────────────────────────────────
// Interview recovery watchdogs (audit Phase 6 — "No permanent stuck states").
//
// The session page already guards `avatar_speaking` (TTS fast-fail + hard
// deadline) and `candidate_answering` (the answer timer auto-submits at 0). The
// gaps the audit flags are:
//   • `submitting` has NO timeout — a hung / slow evaluation strands the user on
//     "Analyzing…" forever (P1 #8).
//   • `feedback` with a queued follow-up relies on a single 1.5s setTimeout to
//     auto-advance; if that transition is dropped, the interview is stuck (Phase
//     6 "Question advance after submit — Missing").
//   • `candidate_answering` depends on setInterval, which Safari throttles to a
//     crawl in a backgrounded tab — the timer may never reach 0, so the auto-
//     submit never fires.
//
// This hook centralizes those backstops. Every callback is read through a ref so
// a watchdog armed when the phase was entered always invokes the LATEST handler
// with live state — the explicit fix for the audit's "stale-closure watchdogs".
// ─────────────────────────────────────────────────────────────────────────────

/** Time in `submitting` before we force a feedback fallback. */
export const EVALUATION_TIMEOUT_MS = 45_000;
/** Time in `feedback` (with a queued follow-up) before forcing the next turn. */
export const QUESTION_ADVANCE_TIMEOUT_MS = 8_000;
/** Grace beyond the answer budget before the answering backstop force-submits. */
export const ANSWERING_BACKSTOP_GRACE_MS = 12_000;

export interface UseInterviewRecoveryParams {
  /** Current runtime phase. Phase changes re-arm the watchdogs from entry time. */
  phase:
    | 'loading'
    | 'awaiting_audio_unlock'
    | 'avatar_speaking'
    | 'avatar_finished'
    | 'candidate_answering'
    | 'submitting'
    | 'feedback'
    | 'completed';
  /** A queued orchestrator follow-up auto-advances; static questions do not. */
  hasPendingFollowUp: boolean;
  /** Answer budget (seconds) for the current question — drives the backstop deadline. */
  answerBudgetSeconds: number;
  /** Unified telemetry sink. */
  track: UseInterviewTelemetryReturn['track'];
  /** Force the UI out of a stuck `submitting` phase (show fallback feedback). */
  onEvaluationTimeout: () => void;
  /** Force the queued follow-up / next question when `feedback` won't advance. */
  onQuestionAdvanceTimeout: () => void;
  /** Force a submit when `candidate_answering` overruns its budget (throttled timer). */
  onAnsweringTimeout: () => void;
}

export function useInterviewRecovery(params: UseInterviewRecoveryParams): void {
  const {
    phase,
    hasPendingFollowUp,
    answerBudgetSeconds,
    track,
    onEvaluationTimeout,
    onQuestionAdvanceTimeout,
    onAnsweringTimeout,
  } = params;

  // Mirror callbacks into refs so the watchdog effects never need them in their
  // dependency arrays (which would re-arm — and reset — the timer on every
  // render) and always call the latest implementation with live state. The refs
  // are updated in a post-render effect (not during render) per React's
  // latest-ref guidance; the watchdogs read them inside delayed timeouts, long
  // after this effect has committed, so they always see current values.
  const onEvaluationTimeoutRef = useRef(onEvaluationTimeout);
  const onQuestionAdvanceTimeoutRef = useRef(onQuestionAdvanceTimeout);
  const onAnsweringTimeoutRef = useRef(onAnsweringTimeout);
  const trackRef = useRef(track);
  useEffect(() => {
    onEvaluationTimeoutRef.current = onEvaluationTimeout;
    onQuestionAdvanceTimeoutRef.current = onQuestionAdvanceTimeout;
    onAnsweringTimeoutRef.current = onAnsweringTimeout;
    trackRef.current = track;
  });

  // ── Evaluation watchdog: submitting → feedback fallback ───────────────────
  useEffect(() => {
    if (phase !== 'submitting') return;
    const enteredAt = Date.now();
    const t = setTimeout(() => {
      trackRef.current(
        'PHASE_TIMEOUT',
        'evaluation_stalled',
        { thresholdMs: EVALUATION_TIMEOUT_MS, elapsedMs: Date.now() - enteredAt },
        { critical: true, level: 'error' },
      );
      trackRef.current('EVALUATION', 'evaluation_recovery_forced', { elapsedMs: Date.now() - enteredAt });
      onEvaluationTimeoutRef.current();
    }, EVALUATION_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // ── Question-advance watchdog: feedback + follow-up → force advance ───────
  // Static questions intentionally wait on the user's Next click, so they are
  // NOT watchdog'd. Only the auto-advancing follow-up path can silently stall.
  useEffect(() => {
    if (phase !== 'feedback' || !hasPendingFollowUp) return;
    const enteredAt = Date.now();
    const t = setTimeout(() => {
      trackRef.current(
        'PHASE_TIMEOUT',
        'question_advance_stalled',
        { thresholdMs: QUESTION_ADVANCE_TIMEOUT_MS, elapsedMs: Date.now() - enteredAt },
        { critical: true, level: 'warn' },
      );
      trackRef.current('QUESTION_ADVANCE', 'advance_recovery_forced', { elapsedMs: Date.now() - enteredAt });
      onQuestionAdvanceTimeoutRef.current();
    }, QUESTION_ADVANCE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [phase, hasPendingFollowUp]);

  // ── Answering backstop: throttled timer never reaches 0 → force submit ────
  // The normal path is the answer timer auto-submitting at timeLeft===0. This
  // backstop covers Safari/iOS throttling setInterval in a backgrounded tab,
  // where the visible timer can freeze and never fire the submit.
  useEffect(() => {
    if (phase !== 'candidate_answering') return;
    const deadlineMs = answerBudgetSeconds * 1000 + ANSWERING_BACKSTOP_GRACE_MS;
    const enteredAt = Date.now();
    const t = setTimeout(() => {
      trackRef.current(
        'PHASE_TIMEOUT',
        'answering_overrun',
        { thresholdMs: deadlineMs, elapsedMs: Date.now() - enteredAt },
        { critical: true, level: 'warn' },
      );
      trackRef.current('RECOVERY', 'answering_backstop_submit', { elapsedMs: Date.now() - enteredAt });
      onAnsweringTimeoutRef.current();
    }, deadlineMs);
    return () => clearTimeout(t);
  }, [phase, answerBudgetSeconds]);
}
