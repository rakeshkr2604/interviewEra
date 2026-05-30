// ─────────────────────────────────────────────────────────────────────────────
// Interview draft persistence (audit P0 — "Refresh loses in-progress answer").
//
// Today a hard refresh mid-interview reruns the startup machine and restarts the
// candidate from the server's `answeredCount`; the in-progress transcript,
// phase, timer, skip count and queued follow-up are all destroyed. The server
// only knows SUBMITTED answers. This module is the missing client-side recovery
// layer.
//
// STORAGE CHOICE — localStorage (not sessionStorage):
//   • Survives a hard refresh AND a PWA standalone relaunch / tab restore, which
//     sessionStorage does not. Mobile/PWA is exactly where the audit reports the
//     worst loss.
//   • Keyed by interviewId so concurrent / sequential interviews never collide.
//   • Bounded by a TTL so an abandoned draft cannot resurface days later.
//   • Reconciled against the server on restore (see reconcileDraft) so a draft
//     for an already-submitted question is discarded rather than replayed.
//
// The draft is cleared on every successful submission and on completion, so the
// only time a draft exists is genuinely-in-progress work.
// ─────────────────────────────────────────────────────────────────────────────

export const INTERVIEW_DRAFT_VERSION = 1;

/** Draft TTL — drafts older than this are treated as abandoned and ignored. */
export const INTERVIEW_DRAFT_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

export type DraftPhase =
  | 'avatar_speaking'
  | 'candidate_answering'
  | 'submitting'
  | 'feedback';

export interface InterviewDraft {
  version: number;
  interviewId: string;
  questionIndex: number;
  /** Runtime phase at save time. Restore normalizes this to a safe entry phase. */
  phase: DraftPhase;
  /** Best-available answer text (voice merged ∪ manual ∪ deepgram). */
  transcript: string;
  /** Seconds left on the answer timer when saved. */
  timerRemaining: number;
  /** Total budget the timer was counting down from (text vs voice differ). */
  timerBudget: number;
  skipCount: number;
  pendingFollowUp: { text: string; tone: string } | null;
  inputMode: 'voice' | 'text' | 'deepgram';
  /** epoch ms of last write — drives TTL + staleness. */
  updatedAt: number;
}

export type InterviewDraftInput = Omit<InterviewDraft, 'version' | 'updatedAt'>;

function storageKey(interviewId: string): string {
  return `ie-interview-draft:${interviewId}`;
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    // Touch it — Safari private mode throws on access, not just write.
    const ls = window.localStorage;
    return ls ?? null;
  } catch {
    return null;
  }
}

/** Persist (or overwrite) the draft for an interview. Best-effort; never throws. */
export function saveInterviewDraft(input: InterviewDraftInput): void {
  const storage = getStorage();
  if (!storage) return;
  if (!input.interviewId) return;
  const draft: InterviewDraft = {
    ...input,
    version: INTERVIEW_DRAFT_VERSION,
    updatedAt: Date.now(),
  };
  try {
    storage.setItem(storageKey(input.interviewId), JSON.stringify(draft));
  } catch {
    /* quota / private-mode — drafts are best-effort */
  }
}

/** Remove the draft for an interview (call on successful submit / completion). */
export function clearInterviewDraft(interviewId: string): void {
  const storage = getStorage();
  if (!storage || !interviewId) return;
  try {
    storage.removeItem(storageKey(interviewId));
  } catch {
    /* ignore */
  }
}

function isValidDraft(value: unknown): value is InterviewDraft {
  if (typeof value !== 'object' || value === null) return false;
  const d = value as Record<string, unknown>;
  return (
    d.version === INTERVIEW_DRAFT_VERSION &&
    typeof d.interviewId === 'string' &&
    typeof d.questionIndex === 'number' &&
    typeof d.phase === 'string' &&
    typeof d.transcript === 'string' &&
    typeof d.timerRemaining === 'number' &&
    typeof d.timerBudget === 'number' &&
    typeof d.skipCount === 'number' &&
    typeof d.inputMode === 'string' &&
    typeof d.updatedAt === 'number'
  );
}

/**
 * Load a draft if it exists, is the current schema version, and is within TTL.
 * Returns null (and proactively clears) otherwise. Does NOT reconcile against
 * server state — call {@link reconcileDraft} for that.
 */
export function loadInterviewDraft(interviewId: string): InterviewDraft | null {
  const storage = getStorage();
  if (!storage || !interviewId) return null;
  let raw: string | null = null;
  try {
    raw = storage.getItem(storageKey(interviewId));
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearInterviewDraft(interviewId);
    return null;
  }

  if (!isValidDraft(parsed)) {
    clearInterviewDraft(interviewId);
    return null;
  }
  if (Date.now() - parsed.updatedAt > INTERVIEW_DRAFT_TTL_MS) {
    clearInterviewDraft(interviewId);
    return null;
  }
  return parsed;
}

export type DraftReconciliation =
  | { action: 'discard'; reason: 'no_draft' | 'expired' | 'already_submitted' | 'ahead_of_draft' }
  | { action: 'restore'; draft: InterviewDraft };

/**
 * Decide whether a stored draft should be replayed, given the server's
 * authoritative progress (`serverQuestionIndex` = answeredCount / current index).
 *
 *   • No draft / expired                       → discard.
 *   • Server already past the draft's question → the answer was submitted before
 *                                                the refresh; discard so we don't
 *                                                replay an answered question.
 *   • Server behind the draft's question       → impossible normally; trust the
 *                                                server, discard the draft.
 *   • Indices match                            → restore the in-progress work.
 */
export function reconcileDraft(
  interviewId: string,
  serverQuestionIndex: number,
): DraftReconciliation {
  const draft = loadInterviewDraft(interviewId);
  if (!draft) return { action: 'discard', reason: 'no_draft' };

  if (serverQuestionIndex > draft.questionIndex) {
    clearInterviewDraft(interviewId);
    return { action: 'discard', reason: 'already_submitted' };
  }
  if (serverQuestionIndex < draft.questionIndex) {
    clearInterviewDraft(interviewId);
    return { action: 'discard', reason: 'ahead_of_draft' };
  }
  return { action: 'restore', draft };
}
