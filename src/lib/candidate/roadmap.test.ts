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
      hasActiveResume: false,
      resumeCompletionPct: 40,
      progress: null,
      completedSessionCount: 1,
      inProgressInterviewId: null,
      inProgressInterviewRole: null,
      inProgressInterviewEngine: null,
      abandonedResumeInterviewId: null,
      abandonedResumeInterviewRole: null,
      abandonedResumeInterviewEngine: null,
      dimensionAverages: {
        communication_clarity: 6.5,
        technical_depth: 4.2,
        answer_structure: 5.8,
        confidence: 5.0,
        relevance: 6.0,
      },
      recentReportIds: [],
      recentReports: [],
      collegeEnrollmentAccepted: false,
      collegeName: null,
    };

    const roadmap = generatePersonalizedRoadmap(snapshot);

    expect(roadmap.targetRole).toBe('Frontend Developer');
    expect(roadmap.weakDimensions[0]).toBe('technical_depth');
    expect(roadmap.recommendedInterviews.length).toBeGreaterThanOrEqual(3);
    expect(roadmap.recommendedInterviews[0]?.href).toContain('role=Frontend');
    expect(roadmap.recommendedInterviews[0]?.href).toContain('difficulty=');
    expect(roadmap.recommendedInterviews[2]?.href).toContain('mode=hr_behavioral');
    expect(roadmap.recommendedTopics.length).toBeGreaterThan(0);
    expect(roadmap.suggestedQuestions.length).toBeGreaterThan(0);
    expect(roadmap.suggestedTools.some((t) => t.id === 'tool-dsa')).toBe(true);
  });

  it('omits dimension personalization when averages are missing', () => {
    const snapshot: CandidateSnapshot = {
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
      recentReports: [],
      collegeEnrollmentAccepted: false,
      collegeName: null,
    };
    const roadmap = generatePersonalizedRoadmap(snapshot);
    expect(roadmap.weakDimensions).toEqual([]);
    expect(roadmap.recommendedTopics).toEqual([]);
  });
});
