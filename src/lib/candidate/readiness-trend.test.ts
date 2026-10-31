import { describe, expect, it } from 'vitest';
import {
  computeCategoryDeltaPercent,
  computeReadinessTrend,
  computeTrendDeltaPercent,
  computeWindowedFocusAreas,
  computeWindowedReadiness,
  type ReadinessHistoryReport,
} from './readiness-trend';

describe('computeReadinessTrend', () => {
  it('returns one point per report, in the same order', () => {
    const reports: ReadinessHistoryReport[] = [
      { generatedAt: '2026-10-01T00:00:00.000Z', overallScore: 5, communicationClarity: 5, technicalDepth: 5, answerStructure: null, confidence: null, relevance: null },
      { generatedAt: '2026-10-10T00:00:00.000Z', overallScore: 7, communicationClarity: 7, technicalDepth: 7, answerStructure: null, confidence: null, relevance: null },
    ];
    const trend = computeReadinessTrend(reports, 80, 50);
    expect(trend).toHaveLength(2);
    expect(trend[0].dateLabel).toBe('1 Oct');
    expect(trend[1].dateLabel).toBe('10 Oct');
  });

  it('score increases as cumulative interview average rises', () => {
    const reports: ReadinessHistoryReport[] = [
      { generatedAt: '2026-10-01T00:00:00.000Z', overallScore: 4, communicationClarity: null, technicalDepth: null, answerStructure: null, confidence: null, relevance: null },
      { generatedAt: '2026-10-10T00:00:00.000Z', overallScore: 9, communicationClarity: null, technicalDepth: null, answerStructure: null, confidence: null, relevance: null },
    ];
    const trend = computeReadinessTrend(reports, 50, 50);
    expect(trend[1].score).toBeGreaterThan(trend[0].score);
  });

  it('holds resume/consistency constant across all points', () => {
    const reports: ReadinessHistoryReport[] = [
      { generatedAt: '2026-10-01T00:00:00.000Z', overallScore: 6, communicationClarity: 6, technicalDepth: 6, answerStructure: null, confidence: null, relevance: null },
      { generatedAt: '2026-10-10T00:00:00.000Z', overallScore: 6, communicationClarity: 6, technicalDepth: 6, answerStructure: null, confidence: null, relevance: null },
    ];
    // All categories identical across points except resume/consistency, which are
    // fixed inputs — so a flat interview/comm/tech series should yield a flat trend.
    const trend = computeReadinessTrend(reports, 90, 30);
    expect(trend[0].score).toBe(trend[1].score);
  });

  it('never returns a score outside 0–100', () => {
    const reports: ReadinessHistoryReport[] = [
      { generatedAt: null, overallScore: 10, communicationClarity: 10, technicalDepth: 10, answerStructure: null, confidence: null, relevance: null },
    ];
    const trend = computeReadinessTrend(reports, 100, 100);
    expect(trend[0].score).toBeLessThanOrEqual(100);
    expect(trend[0].score).toBeGreaterThanOrEqual(0);
  });

  it('uses "—" as dateLabel when generatedAt is null', () => {
    const reports: ReadinessHistoryReport[] = [
      { generatedAt: null, overallScore: 5, communicationClarity: null, technicalDepth: null, answerStructure: null, confidence: null, relevance: null },
    ];
    expect(computeReadinessTrend(reports, 50, 50)[0].dateLabel).toBe('—');
  });
});

describe('computeTrendDeltaPercent', () => {
  it('returns null for fewer than 2 points', () => {
    expect(computeTrendDeltaPercent([])).toBeNull();
    expect(computeTrendDeltaPercent([{ score: 50 }])).toBeNull();
  });

  it('computes percent change from first to last point', () => {
    expect(computeTrendDeltaPercent([{ score: 50 }, { score: 60 }])).toBe(20);
    expect(computeTrendDeltaPercent([{ score: 50 }, { score: 25 }])).toBe(-50);
  });

  it('returns null when baseline is zero (division by zero)', () => {
    expect(computeTrendDeltaPercent([{ score: 0 }, { score: 50 }])).toBeNull();
  });
});

describe('computeCategoryDeltaPercent', () => {
  it('returns null for fewer than 2 present values', () => {
    expect(computeCategoryDeltaPercent([])).toBeNull();
    expect(computeCategoryDeltaPercent([5])).toBeNull();
  });

  it('filters out null/NaN entries before computing', () => {
    expect(
      computeCategoryDeltaPercent([5, Number.NaN, 10] as unknown as number[]),
    ).toBe(100);
  });

  it('computes percent change from first to last present value', () => {
    expect(computeCategoryDeltaPercent([4, 6, 8])).toBe(100);
  });
});

describe('computeWindowedReadiness', () => {
  const reports: ReadinessHistoryReport[] = [
    { generatedAt: '2026-10-01T00:00:00.000Z', overallScore: 5, communicationClarity: 5, technicalDepth: 4, answerStructure: null, confidence: null, relevance: null },
    { generatedAt: '2026-10-15T00:00:00.000Z', overallScore: 7, communicationClarity: 7, technicalDepth: 6, answerStructure: null, confidence: null, relevance: null },
    { generatedAt: '2026-10-30T00:00:00.000Z', overallScore: 9, communicationClarity: 9, technicalDepth: 8, answerStructure: null, confidence: null, relevance: null },
  ];

  it('recomputes interview/communication/technical scores from only the given window', () => {
    const windowed = computeWindowedReadiness(reports.slice(0, 1), 80, 'resume', 50, 'consistency');
    const interview = windowed.categories.find((c) => c.key === 'interview_performance');
    expect(interview?.score).toBe(50); // 5/10 -> 50/100
  });

  it('marks resume_quality and consistency as lifetime-only with no delta', () => {
    const windowed = computeWindowedReadiness(reports, 80, 'resume summary', 50, 'consistency summary');
    const resume = windowed.categories.find((c) => c.key === 'resume_quality');
    const consistency = windowed.categories.find((c) => c.key === 'consistency');
    expect(resume?.isLifetimeOnly).toBe(true);
    expect(resume?.deltaPercent).toBeNull();
    expect(resume?.score).toBe(80);
    expect(consistency?.isLifetimeOnly).toBe(true);
    expect(consistency?.deltaPercent).toBeNull();
    expect(consistency?.score).toBe(50);
  });

  it('computes a real delta for windowed categories across multiple reports', () => {
    const windowed = computeWindowedReadiness(reports, 80, 'resume', 50, 'consistency');
    const interview = windowed.categories.find((c) => c.key === 'interview_performance');
    // 5 -> 9 on a 0-10 scale is +80%
    expect(interview?.deltaPercent).toBe(80);
  });

  it('produces a human range label spanning the given reports', () => {
    const windowed = computeWindowedReadiness(reports, 80, 'resume', 50, 'consistency');
    expect(windowed.rangeLabel).toContain('3 sessions between');
    expect(windowed.rangeLabel).toContain('1 Oct');
    expect(windowed.rangeLabel).toContain('30 Oct');
  });

  it('reports "no sessions in this window" for an empty report list', () => {
    const windowed = computeWindowedReadiness([], 80, 'resume', 50, 'consistency');
    expect(windowed.rangeLabel).toBe('No sessions in this window');
    expect(windowed.sessionCount).toBe(0);
    const interview = windowed.categories.find((c) => c.key === 'interview_performance');
    expect(interview?.score).toBeNull();
  });

  it('overall score reflects the windowed sub-scores, not a fixed lifetime number', () => {
    const narrowWindow = computeWindowedReadiness(reports.slice(0, 1), 80, 'resume', 50, 'consistency');
    const wideWindow = computeWindowedReadiness(reports, 80, 'resume', 50, 'consistency');
    expect(narrowWindow.overall).not.toBe(wideWindow.overall);
  });
});

describe('computeWindowedFocusAreas', () => {
  it('returns the N lowest-scoring dimensions, ascending', () => {
    const reports: ReadinessHistoryReport[] = [
      {
        generatedAt: '2026-10-01T00:00:00.000Z',
        overallScore: 7,
        communicationClarity: 3,
        technicalDepth: 8,
        answerStructure: 5,
        confidence: 9,
        relevance: 6,
      },
    ];
    const areas = computeWindowedFocusAreas(reports, 3);
    expect(areas).toHaveLength(3);
    expect(areas[0].dimensionKey).toBe('communication_clarity'); // 3/10 -> lowest
    expect(areas.map((a) => a.pct)).toEqual([...areas.map((a) => a.pct)].sort((a, b) => a - b));
  });

  it('recomputes from only the reports passed in (caller windows first)', () => {
    const wide: ReadinessHistoryReport[] = [
      {
        generatedAt: '2026-10-01T00:00:00.000Z',
        overallScore: 5,
        communicationClarity: 2,
        technicalDepth: 2,
        answerStructure: 2,
        confidence: 2,
        relevance: 2,
      },
      {
        generatedAt: '2026-10-30T00:00:00.000Z',
        overallScore: 9,
        communicationClarity: 9,
        technicalDepth: 9,
        answerStructure: 9,
        confidence: 9,
        relevance: 9,
      },
    ];
    const narrow = computeWindowedFocusAreas(wide.slice(1), 3);
    expect(narrow.every((a) => a.pct === 90)).toBe(true);
  });

  it('excludes dimensions with no data in the window rather than inventing a score', () => {
    const reports: ReadinessHistoryReport[] = [
      {
        generatedAt: '2026-10-01T00:00:00.000Z',
        overallScore: 7,
        communicationClarity: null,
        technicalDepth: null,
        answerStructure: null,
        confidence: null,
        relevance: 5,
      },
    ];
    const areas = computeWindowedFocusAreas(reports, 3);
    expect(areas).toHaveLength(1);
    expect(areas[0].dimensionKey).toBe('relevance');
  });

  it('returns an empty array for no reports', () => {
    expect(computeWindowedFocusAreas([], 3)).toEqual([]);
  });
});
