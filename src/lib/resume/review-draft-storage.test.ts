import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearResumeReviewDraft,
  loadResumeReviewDraft,
  saveResumeReviewDraft,
  type ResumeReviewDraft,
} from '@/lib/resume/review-draft-storage';

const store = new Map<string, string>();

describe('resume review draft storage', () => {
  afterEach(() => {
    store.clear();
    vi.unstubAllGlobals();
  });

  it('round-trips a draft through localStorage', () => {
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
    vi.stubGlobal('window', { localStorage: globalThis.localStorage });

    const draft: ResumeReviewDraft = {
      resumeId: 'r1',
      baseVersionId: 'v1',
      targetRole: 'SDE',
      experienceEstimate: '1–3 years',
      skills: ['React', 'Node.js'],
      removedSkills: [],
      updatedAt: '2026-07-18T00:00:00.000Z',
    };
    saveResumeReviewDraft(draft);
    expect(loadResumeReviewDraft('r1', 'v1')).toEqual(draft);
    clearResumeReviewDraft('r1', 'v1');
    expect(loadResumeReviewDraft('r1', 'v1')).toBeNull();
  });
});
