import { describe, expect, it } from 'vitest';
import { computeReadinessScore } from './readiness-score';
import type { CandidateSnapshot } from './types';

function baseSnapshot(overrides: Partial<CandidateSnapshot> = {}): CandidateSnapshot {
  return {
    userId: '00000000-0000-4000-8000-000000000001',
    targetRole: 'Software Engineer',
    profile: {
      preferredRole: 'Software Engineer',
      graduationYear: 2026,
      collegeName: 'Test College',
      experienceLevel: 'fresher',
    },
    latestResume: null,
    resumeCompletionPct: 0,
    progress: null,
    completedSessionCount: 0,
    inProgressInterviewId: null,
    inProgressInterviewRole: null,
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

describe('computeReadinessScore', () => {
  it('returns early-stage score for empty snapshot', () => {
    const result = computeReadinessScore(baseSnapshot());
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThan(50);
    expect(result.level).toBe('early_stage');
    expect(result.categories).toHaveLength(5);
  });

  it('weights interview performance and dimensions', () => {
    const result = computeReadinessScore(
      baseSnapshot({
        resumeCompletionPct: 90,
        latestResume: {
          id: 'r1',
          status: 'parsed',
          createdAt: new Date().toISOString(),
          fileUrl: null,
          parsed: {
            target_role: 'Software Engineer',
            skills: ['TypeScript', 'React', 'Node'],
            experience_estimate: '1 year',
            parse_quality: 'full',
          },
          parseQuality: 'full',
          parseWarning: null,
        },
        completedSessionCount: 3,
        progress: {
          id: 'p1',
          user_id: 'u1',
          current_tier: 2,
          tier_unlocked_at: new Date().toISOString(),
          total_sessions: 3,
          sessions_at_current_tier: 1,
          overall_avg_score: 7.2,
          max_dimension_score: 8.1,
          last_5_sessions_avg: 7.8,
          total_xp: 120,
          current_streak: 4,
          longest_streak: 4,
          last_quality_session_date: null,
          badges_earned: [],
          last_unlock_at: null,
          last_check_at: null,
          unlock_attempts: 0,
          consecutive_rejections: 0,
          flagged_suspicious: false,
          flagged_reason: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        dimensionAverages: {
          communication_clarity: 7.5,
          technical_depth: 6.8,
          answer_structure: 7.0,
          confidence: 6.5,
          relevance: 7.2,
        },
      }),
    );

    expect(result.overall).toBeGreaterThan(55);
    expect(result.level).not.toBe('early_stage');
    expect(result.improvementTrend).toBe('improving');
  });
});
