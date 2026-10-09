import { describe, expect, it } from 'vitest';
import {
  averageDimensions,
  computeImprovementPercent,
  mergeAnalyticsReports,
} from './analytics-reports';

describe('mergeAnalyticsReports', () => {
  it('prefers script reports over V1 for the same interview and keeps chronological order', () => {
    const merged = mergeAnalyticsReports(
      [
        {
          interview_id: 'iv-1',
          overall_score: 4.0,
          radar_data: [{ dimension: 'technical_depth', score: 4 }],
          generated_at: '2026-01-01T00:00:00.000Z',
        },
        {
          interview_id: 'iv-2',
          overall_score: 5.0,
          radar_data: [],
          generated_at: '2026-01-02T00:00:00.000Z',
        },
      ],
      [
        {
          interview_id: 'iv-1',
          overall: 5.2,
          dimension_averages: {
            relevance: 5,
            content_accuracy: 6,
            communication_clarity: 5,
            structure: 5,
            specificity: 5,
          },
          generated_at: '2026-01-01T12:00:00.000Z',
          status: 'ready',
        },
      ],
      5,
    );

    expect(merged).toHaveLength(2);
    expect(merged[0]?.interviewId).toBe('iv-1');
    expect(merged[0]?.engine).toBe('v2.1');
    expect(merged[0]?.overallScore).toBe(5.2);
    expect(merged[0]?.dimensions.technical_depth).toBe(6);
    expect(merged[1]?.interviewId).toBe('iv-2');
  });
});

describe('computeImprovementPercent', () => {
  it('handles missing, zero, and negative baselines safely', () => {
    expect(computeImprovementPercent(null, 5)).toBeNull();
    expect(computeImprovementPercent(0, 5)).toBeNull();
    expect(computeImprovementPercent(5, null)).toBeNull();
    expect(computeImprovementPercent(5, 6)).toBe(20);
    expect(computeImprovementPercent(5, 4)).toBe(-20);
  });
});

describe('averageDimensions', () => {
  it('averages only present dimension scores', () => {
    const avgs = averageDimensions([
      {
        interviewId: 'a',
        overallScore: 5,
        generatedAt: null,
        engine: 'v2.1',
        dimensions: { technical_depth: 6, communication_clarity: 8 },
      },
      {
        interviewId: 'b',
        overallScore: 6,
        generatedAt: null,
        engine: 'v2.1',
        dimensions: { technical_depth: 4 },
      },
    ]);
    expect(avgs.find((a) => a.key === 'technical_depth')?.avg).toBe(5);
    expect(avgs.find((a) => a.key === 'communication_clarity')?.avg).toBe(8);
    expect(avgs.find((a) => a.key === 'relevance')).toBeUndefined();
  });
});
