import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { FakeDb } from '@/test-utils/supabase-fake';
import { makeFakeServiceClient } from '@/test-utils/supabase-fake';

// aggregateReport reads exclusively through createServiceClient(). Swap it for
// an in-memory fake so we can drive the throw paths deterministically.
let db: FakeDb;
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => makeFakeServiceClient(db),
}));

import { aggregateReport } from '@/lib/utils/report';

const INTERVIEW = 'iv-1';
const USER = 'user-1';

const validDims = {
  communication_clarity: 7,
  technical_depth: 6,
  answer_structure: 8,
  confidence: 7,
  relevance: 9,
};

beforeEach(() => {
  db = { interviews: [], questions: [], answers: [], evaluations: [], reports: [] };
});

describe('aggregateReport — throw paths (report generation must fail loudly, never silently)', () => {
  it('throws when the interview has no questions', async () => {
    await expect(aggregateReport(INTERVIEW, USER)).rejects.toThrow(
      'No questions found for interview',
    );
  });

  it('throws when questions exist but no answers were recorded', async () => {
    db.questions = [{ id: 'q1', interview_id: INTERVIEW }];
    await expect(aggregateReport(INTERVIEW, USER)).rejects.toThrow(
      'No answers found for interview',
    );
  });

  it('throws when answers exist but none have a valid evaluation', async () => {
    db.questions = [{ id: 'q1', interview_id: INTERVIEW }];
    db.answers = [{ id: 'a1', question_id: 'q1', answer_text: 'hi', duration_seconds: 10, speech_metrics: null }];
    // Evaluation row present but with a null score → not a valid persisted eval.
    db.evaluations = [{ answer_id: 'a1', overall_score: null, dimension_scores: null }];
    await expect(aggregateReport(INTERVIEW, USER)).rejects.toThrow(
      /No valid evaluations found/,
    );
  });
});

describe('aggregateReport — success path persists a scored report', () => {
  it('inserts a report with a non-null overall score from valid evaluations', async () => {
    db.questions = [{ id: 'q1', interview_id: INTERVIEW }];
    db.answers = [{ id: 'a1', question_id: 'q1', answer_text: 'a real answer', duration_seconds: 12, speech_metrics: null }];
    db.evaluations = [{ answer_id: 'a1', overall_score: 7.4, dimension_scores: validDims }];

    const result = await aggregateReport(INTERVIEW, USER);

    expect(result.reportId).toBeTruthy();
    expect(typeof result.overallScore).toBe('number');
    expect(result.overallScore).toBeGreaterThan(0);
    // Report row persisted with the score → a completed interview can never be scoreless.
    expect(db.reports).toHaveLength(1);
    expect(db.reports[0].overall_score).toBe(result.overallScore);
  });

  it('returns the existing report without inserting a duplicate (idempotent)', async () => {
    db.reports = [
      {
        id: 'rep-existing',
        interview_id: INTERVIEW,
        overall_score: 6.1,
        radar_data: [],
        trend_data: null,
        generated_at: '2026-07-01T00:00:00Z',
      },
    ];
    const result = await aggregateReport(INTERVIEW, USER);
    expect(result.reportId).toBe('rep-existing');
    expect(db.reports).toHaveLength(1);
  });
});
