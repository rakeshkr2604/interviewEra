import { describe, expect, it } from 'vitest';
import { buildCandidateNotifications } from './notifications';
import type { CandidateSnapshot } from './types';

function baseSnapshot(overrides: Partial<CandidateSnapshot> = {}): CandidateSnapshot {
  return {
    userId: 'u1',
    targetRole: 'SWE',
    profile: {
      preferredRole: 'SWE',
      graduationYear: 2026,
      collegeName: '',
      experienceLevel: 'fresher',
    },
    latestResume: null,
    hasActiveResume: false,
    resumeCompletionPct: 0,
    progress: null,
    completedSessionCount: 0,
    inProgressInterviewId: null,
    inProgressInterviewRole: null,
    inProgressInterviewEngine: null,
    abandonedResumeInterviewId: null,
    abandonedResumeInterviewRole: null,
    abandonedResumeInterviewEngine: null,
    dimensionAverages: {
      communication_clarity: null,
      technical_depth: null,
      answer_structure: null,
      confidence: null,
      relevance: null,
    },
    recentReportIds: [],
    collegeEnrollmentAccepted: false,
    collegeName: null,
    ...overrides,
  };
}

describe('buildCandidateNotifications — interview recovery', () => {
  it('emits Continue notification for active in-progress session', () => {
    const once = buildCandidateNotifications(
      baseSnapshot({
        inProgressInterviewId: 'iv-active',
        inProgressInterviewRole: 'Backend',
        inProgressInterviewEngine: 'v2.1',
      }),
    );
    const twice = buildCandidateNotifications(
      baseSnapshot({
        inProgressInterviewId: 'iv-active',
        inProgressInterviewRole: 'Backend',
        inProgressInterviewEngine: 'v2.1',
      }),
    );
    const reminders = once.filter((n) => n.type === 'interview_reminder');
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({
      id: 'interview-iv-active',
      href: '/interview/script/iv-active',
      ctaLabel: 'Continue interview',
    });
    expect(reminders[0]!.resumeInterviewId).toBeUndefined();
    // Stable id across rebuilds — no stacked duplicates on repeated loads.
    expect(twice.filter((n) => n.type === 'interview_reminder').map((n) => n.id)).toEqual([
      'interview-iv-active',
    ]);
  });

  it('emits Resume notification only for abandoned one-continue eligible', () => {
    const notes = buildCandidateNotifications(
      baseSnapshot({
        abandonedResumeInterviewId: 'iv-ab',
        abandonedResumeInterviewRole: 'Frontend',
        abandonedResumeInterviewEngine: 'v2.1',
      }),
    );
    const reminders = notes.filter((n) => n.type === 'interview_reminder');
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({
      id: 'interview-abandoned-iv-ab',
      title: 'Your interview is still available',
      body: 'You can continue where you left off.',
      href: null,
      resumeInterviewId: 'iv-ab',
      ctaLabel: 'Resume interview',
    });
  });

  it('prefers active over abandoned when both are present on the snapshot', () => {
    const notes = buildCandidateNotifications(
      baseSnapshot({
        inProgressInterviewId: 'iv-active',
        inProgressInterviewEngine: 'v2.1',
        abandonedResumeInterviewId: 'iv-ab',
        abandonedResumeInterviewEngine: 'v2.1',
      }),
    );
    const reminders = notes.filter((n) => n.type === 'interview_reminder');
    expect(reminders).toHaveLength(1);
    expect(reminders[0]!.id).toBe('interview-iv-active');
  });

  it('does not emit interview_reminder when no unfinished recovery target', () => {
    const notes = buildCandidateNotifications(baseSnapshot());
    expect(notes.filter((n) => n.type === 'interview_reminder')).toHaveLength(0);
  });

  it('rebuilds produce identical reminder ids (no stack on repeated loads)', () => {
    const snap = baseSnapshot({
      abandonedResumeInterviewId: 'iv-ab',
      abandonedResumeInterviewEngine: 'v2.1',
    });
    const builds = Array.from({ length: 5 }, () =>
      buildCandidateNotifications(snap)
        .filter((n) => n.type === 'interview_reminder')
        .map((n) => n.id),
    );
    expect(builds.every((ids) => ids.length === 1 && ids[0] === 'interview-abandoned-iv-ab')).toBe(
      true,
    );
    // Derived feed is not append-only — each build returns one reminder slot.
    expect(new Set(builds.flat()).size).toBe(1);
  });
});
