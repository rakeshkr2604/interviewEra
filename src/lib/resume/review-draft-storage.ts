/**
 * Client draft persistence for the resume review step.
 * Uses localStorage (product app — not a Cursor artifact constraint).
 * Debounced writes mirror onboarding's persist-scheduler pattern.
 */

import type {
  ResumeEducationEntry,
  ResumeExperienceEntry,
  ResumeProjectEntry,
} from '@/types/app.types';

export type ResumeReviewDraft = {
  resumeId: string;
  baseVersionId: string;
  targetRole: string;
  experienceEstimate: string;
  skills: string[];
  /** Skills user explicitly removed (so refresh doesn't resurrect them). */
  removedSkills: string[];
  experience?: ResumeExperienceEntry[];
  education?: ResumeEducationEntry[];
  projects?: ResumeProjectEntry[];
  updatedAt: string;
};

const KEY_PREFIX = 'ie:resume-review-draft:';

function key(resumeId: string, baseVersionId: string): string {
  return `${KEY_PREFIX}${resumeId}:${baseVersionId}`;
}

export function loadResumeReviewDraft(
  resumeId: string,
  baseVersionId: string,
): ResumeReviewDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key(resumeId, baseVersionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeReviewDraft;
    if (
      !parsed ||
      parsed.resumeId !== resumeId ||
      parsed.baseVersionId !== baseVersionId ||
      typeof parsed.targetRole !== 'string' ||
      !Array.isArray(parsed.skills)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveResumeReviewDraft(draft: ResumeReviewDraft): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key(draft.resumeId, draft.baseVersionId), JSON.stringify(draft));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

export function clearResumeReviewDraft(resumeId: string, baseVersionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key(resumeId, baseVersionId));
  } catch {
    /* ignore */
  }
}

/** Debounced draft writer (same class as onboarding persist scheduler). */
export function createReviewDraftScheduler(debounceMs = 400) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule(draft: ResumeReviewDraft) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        saveResumeReviewDraft({ ...draft, updatedAt: new Date().toISOString() });
      }, debounceMs);
    },
    flush(draft: ResumeReviewDraft) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      saveResumeReviewDraft({ ...draft, updatedAt: new Date().toISOString() });
    },
    cancel() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
