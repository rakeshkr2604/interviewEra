import { describe, expect, it } from 'vitest';
import { generatePersonalizedRoadmap } from './roadmap';
import type { CandidateSnapshot } from './types';

describe('generatePersonalizedRoadmap', () => {
  it('produces interview, topic, question, and tool recommendations', () => {
    const snapshot: CandidateSnapshot = {
      userId: 'u1',
      targetRole: 'Frontend Developer',
      profile: {
        preferredRole: 'Frontend Developer',
        graduationYear: 2026,
        collegeName: '',
        experienceLevel: 'fresher',
      },
      latestResume: null,
      resumeCompletionPct: 40,
      progress: null,
      completedSessionCount: 1,
      inProgressInterviewId: null,
      inProgressInterviewRole: null,
      inProgressInterviewEngine: null,
      dimensionAverages: {
        communication_clarity: 6.5,
        technical_depth: 4.2,
        answer_structure: 5.8,
        confidence: 5.0,
        relevance: 6.0,
      },
      recentReportIds: [],
      collegeEnrollmentAccepted: false,
      collegeName: null,
    };

    const roadmap = generatePersonalizedRoadmap(snapshot);

    expect(roadmap.targetRole).toBe('Frontend Developer');
    expect(roadmap.weakDimensions[0]).toBe('technical_depth');
    expect(roadmap.recommendedInterviews.length).toBeGreaterThanOrEqual(3);
    expect(roadmap.recommendedTopics.length).toBeGreaterThan(0);
    expect(roadmap.suggestedQuestions.length).toBeGreaterThan(0);
    expect(roadmap.suggestedTools.some((t) => t.id === 'tool-dsa')).toBe(true);
  });
});
