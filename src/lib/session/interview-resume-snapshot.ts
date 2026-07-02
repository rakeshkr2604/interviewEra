/**
 * Server-persisted interview resume snapshot (stored in interviews.session_context.resume).
 * Enables History "Continue" and cross-device recovery — not just same-tab localStorage.
 */

import type { DraftPhase, InterviewDraftInput } from '@/lib/session/interview-draft';

export const INTERVIEW_RESUME_SNAPSHOT_VERSION = 1 as const;

export type ResumeSnapshotPhase = DraftPhase | 'avatar_speaking' | 'submitting';

export interface InterviewResumeSnapshot {
  version: typeof INTERVIEW_RESUME_SNAPSHOT_VERSION;
  questionIndex: number;
  phase: ResumeSnapshotPhase;
  transcript: string;
  timerRemaining: number;
  timerBudget: number;
  skipCount: number;
  pendingFollowUp: { text: string; tone: string } | null;
  inputMode: 'voice' | 'text' | 'deepgram';
  followUpForIndex: number;
  lastFeedback?: string;
  updatedAt: string;
}

export type InterviewResumeSnapshotInput = Omit<InterviewResumeSnapshot, 'version' | 'updatedAt'>;

export interface SubmittedAnswerPayload {
  questionId: string;
  orderIndex: number;
  transcript: string;
  durationSeconds: number;
  submittedAt: string;
  feedback?: string;
}

export interface ConversationResumePayload {
  currentQuestionIndex: number;
  needsFollowup: boolean;
  followupContext: unknown;
  dialogueHistory: unknown[];
}

export function isValidResumeSnapshot(value: unknown): value is InterviewResumeSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    s.version === INTERVIEW_RESUME_SNAPSHOT_VERSION &&
    typeof s.questionIndex === 'number' &&
    typeof s.phase === 'string' &&
    typeof s.transcript === 'string' &&
    typeof s.timerRemaining === 'number' &&
    typeof s.timerBudget === 'number' &&
    typeof s.skipCount === 'number' &&
    typeof s.inputMode === 'string' &&
    typeof s.followUpForIndex === 'number' &&
    typeof s.updatedAt === 'string'
  );
}

/**
 * Authoritative question index for resume — snapshot beats answeredCount because
 * skips and in-place follow-ups do not align with answer row count alone.
 */
export function resolveResumeQuestionIndex(input: {
  questionCount: number;
  answeredCount: number;
  status: string;
  snapshot: InterviewResumeSnapshot | null;
}): number {
  const maxIndex = Math.max(0, input.questionCount - 1);
  const active = input.status === 'in_progress' || input.status === 'pending';

  if (active && input.snapshot) {
    return Math.min(Math.max(0, input.snapshot.questionIndex), maxIndex);
  }

  return Math.min(Math.max(0, input.answeredCount), maxIndex);
}

export function isResumeSession(input: {
  status: string;
  answeredCount: number;
  snapshot: InterviewResumeSnapshot | null;
}): boolean {
  if (input.status !== 'in_progress' && input.status !== 'pending') return false;
  return input.answeredCount > 0 || input.snapshot !== null;
}

/** Convert server snapshot into draft shape for the existing restore handoff. */
export function snapshotToDraftForRestore(
  snapshot: InterviewResumeSnapshot,
  interviewId: string,
): InterviewDraftInput & { lastFeedback?: string } {
  const phase: DraftPhase =
    snapshot.phase === 'feedback'
      ? 'feedback'
      : snapshot.phase === 'candidate_answering'
        ? 'candidate_answering'
        : 'candidate_answering';

  const budget = snapshot.timerBudget > 0 ? snapshot.timerBudget : 60;
  const remaining =
    snapshot.timerRemaining > 0 ? Math.min(snapshot.timerRemaining, budget) : budget;

  return {
    interviewId,
    questionIndex: snapshot.questionIndex,
    phase,
    transcript: snapshot.transcript,
    timerRemaining: remaining,
    timerBudget: budget,
    skipCount: snapshot.skipCount,
    pendingFollowUp: snapshot.pendingFollowUp,
    inputMode: snapshot.inputMode,
    ...(snapshot.lastFeedback ? { lastFeedback: snapshot.lastFeedback } : {}),
  };
}

export function buildResumeSnapshot(
  input: InterviewResumeSnapshotInput,
): InterviewResumeSnapshot {
  return {
    ...input,
    version: INTERVIEW_RESUME_SNAPSHOT_VERSION,
    updatedAt: new Date().toISOString(),
  };
}
