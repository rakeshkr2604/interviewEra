import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { FakeDb } from '@/test-utils/supabase-fake';
import { makeFakeServiceClient } from '@/test-utils/supabase-fake';

/**
 * Route-level tests for POST /api/interview/complete, focused on the P1
 * ordering guarantees:
 *   - report is generated BEFORE status flips to 'completed'
 *   - a 0-answer session is abandoned, never completed (no zombie)
 *   - a retry when a report already exists repairs status without duplicating
 */

const USER = { id: 'user-1', email: 'u@example.com' };

let db: FakeDb;
let aggregateReportMock: ReturnType<typeof vi.fn>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: USER }, error: null }) },
  }),
  createServiceClient: () => makeFakeServiceClient(db),
}));

vi.mock('@/lib/utils/report', () => ({
  aggregateReport: (...args: unknown[]) => aggregateReportMock(...args),
}));

// Retention + funnel + email are exercised in their own suites; keep them inert
// here so the test isolates the route's ordering logic.
vi.mock('@/lib/retention/process-interview-complete', () => ({
  processInterviewRetentionSafely: vi.fn(async () => null),
}));
vi.mock('@/lib/analytics/funnel-server', () => ({
  buildFunnelCompleteGa4Payload: vi.fn(async () => ({ interviewId: 'iv-1' })),
}));
vi.mock('@/lib/email/lifecycle/send-interview-completed', () => ({
  sendInterviewCompletedEmail: vi.fn(async () => undefined),
}));
const trackInterviewEvent = vi.fn();
vi.mock('@/lib/analytics/interview-events', () => ({
  trackInterviewEvent: (...args: unknown[]) => trackInterviewEvent(...args),
}));
const persistMilestoneEventOnce = vi.fn();
vi.mock('@/lib/analytics/milestone-events-store', () => ({
  persistMilestoneEventOnce: (...args: unknown[]) => persistMilestoneEventOnce(...args),
}));

import { POST } from '@/app/api/interview/complete/route';

// Schema requires a UUID-shaped interviewId.
const IV = '11111111-1111-4111-8111-111111111111';

function req(body: unknown): Request {
  return new Request('http://localhost/api/interview/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validDims = {
  communication_clarity: 6,
  technical_depth: 6,
  answer_structure: 6,
  confidence: 6,
  relevance: 6,
};

beforeEach(() => {
  trackInterviewEvent.mockClear();
  persistMilestoneEventOnce.mockClear();
  aggregateReportMock = vi.fn(async () => ({
    reportId: 'rep-new',
    overallScore: 6,
    radarData: [],
    trendData: null,
  }));
  db = {
    interviews: [
      {
        id: IV,
        user_id: USER.id,
        status: 'in_progress',
        started_at: '2026-07-01T00:00:00Z',
        session_context: { resume: { foo: 1 } },
      },
    ],
    questions: [{ id: 'q1', interview_id: IV }],
    answers: [{ id: 'a1', question_id: 'q1' }],
    evaluations: [{ answer_id: 'a1', overall_score: 6, dimension_scores: validDims }],
    reports: [],
  };
});

describe('POST /complete — report is written before status flips to completed', () => {
  it('generates the report first, then sets status=completed (Invariant #4)', async () => {
    let statusAtReportTime: string | undefined;
    aggregateReportMock = vi.fn(async () => {
      // Capture interview status at the moment the report is generated.
      statusAtReportTime = db.interviews[0].status as string;
      return { reportId: 'rep-new', overallScore: 6, radarData: [], trendData: null };
    });

    const res = await POST(req({ interviewId: IV }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.reportId).toBe('rep-new');
    // Status was NOT yet 'completed' while the report was being generated…
    expect(statusAtReportTime).toBe('in_progress');
    // …and IS 'completed' only after the report exists.
    expect(db.interviews[0].status).toBe('completed');
    expect(db.interviews[0].completed_at).toBeTruthy();
    // resume snapshot stripped from session_context on completion.
    expect((db.interviews[0].session_context as Record<string, unknown>).resume).toBeUndefined();
    // Durable interview_completed fires exactly once, after report + status flip.
    expect(persistMilestoneEventOnce).toHaveBeenCalledWith(
      'interview_completed',
      expect.objectContaining({ interview_id: IV, report_id: 'rep-new' }),
    );
  });

  it('does NOT flip status to completed if report generation throws (no zombie)', async () => {
    aggregateReportMock = vi.fn(async () => {
      throw new Error('No valid evaluations found for interview');
    });

    const res = await POST(req({ interviewId: IV }));
    expect(res.status).toBe(500);
    expect(persistMilestoneEventOnce).not.toHaveBeenCalled();
    // Interview stays non-completed → no completed-without-report zombie.
    expect(db.interviews[0].status).toBe('in_progress');
    expect(db.reports).toHaveLength(0);
  });
});

describe('POST /complete — 0-answer guard', () => {
  it('abandons a session with no answers instead of completing it', async () => {
    db.answers = [];

    const res = await POST(req({ interviewId: IV }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.abandoned).toBe(true);
    expect(json.reason).toBe('no_answers_recorded');
    expect(json.message).toMatch(/no answers were recorded/i);
    expect(json.reportId).toBeUndefined();

    expect(db.interviews[0].status).toBe('abandoned');
    expect(aggregateReportMock).not.toHaveBeenCalled();
    expect(trackInterviewEvent).toHaveBeenCalledWith(
      'interview_abandoned',
      expect.objectContaining({ reason: 'no_answers_recorded' }),
    );
    // Abandoned is a non-completion outcome — must never also fire interview_completed.
    expect(persistMilestoneEventOnce).not.toHaveBeenCalledWith(
      'interview_completed',
      expect.anything(),
    );
    // Durable now — previously interview_abandoned was console-only.
    expect(persistMilestoneEventOnce).toHaveBeenCalledWith('interview_abandoned', {
      user_id: USER.id,
      interview_id: IV,
      reason: 'no_answers_recorded',
    });
  });

  it('abandons when questions exist but zero answers were recorded', async () => {
    db.questions = [{ id: 'q1', interview_id: IV }, { id: 'q2', interview_id: IV }];
    db.answers = [];

    const res = await POST(req({ interviewId: IV }));
    const json = await res.json();
    expect(json.abandoned).toBe(true);
    expect(db.interviews[0].status).toBe('abandoned');
  });
});

describe('POST /complete — FM-5 pending_backfill answers (Redis-outage degrade)', () => {
  it('never neutral-backfills a pending_backfill answer (no fabricated score)', async () => {
    db.questions = [
      { id: 'q1', interview_id: IV },
      { id: 'q2', interview_id: IV },
    ];
    db.answers = [
      { id: 'a1', question_id: 'q1' },
      { id: 'a2', question_id: 'q2', evaluation_status: 'pending_backfill' },
    ];
    // a1 evaluated normally; a2 was saved during the Redis outage — no eval.
    db.evaluations = [{ answer_id: 'a1', overall_score: 6, dimension_scores: validDims }];

    const res = await POST(req({ interviewId: IV }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.reportId).toBe('rep-new');
    expect(db.interviews[0].status).toBe('completed');
    // The pending answer got NO neutral evaluation row — it stays unevaluated
    // until the backfill script re-scores it.
    expect(db.evaluations.filter((e) => e.answer_id === 'a2')).toHaveLength(0);
    expect(db.evaluations).toHaveLength(1);
  });

  it('still neutral-backfills a NON-pending answer that lost its evaluation', async () => {
    db.questions = [
      { id: 'q1', interview_id: IV },
      { id: 'q2', interview_id: IV },
    ];
    db.answers = [
      { id: 'a1', question_id: 'q1' },
      { id: 'a2', question_id: 'q2' }, // evaluated path, eval lost — legacy backfill
    ];
    db.evaluations = [{ answer_id: 'a1', overall_score: 6, dimension_scores: validDims }];

    const res = await POST(req({ interviewId: IV }));
    expect(res.status).toBe(200);
    expect(db.evaluations.filter((e) => e.answer_id === 'a2')).toHaveLength(1);
  });

  it('defers completion (503, no zombie) when EVERY answer is pending_backfill', async () => {
    db.answers = [{ id: 'a1', question_id: 'q1', evaluation_status: 'pending_backfill' }];
    db.evaluations = [];

    const res = await POST(req({ interviewId: IV }));
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.code).toBe('evaluations_pending_backfill');
    expect(json.error).toMatch(/nothing was lost/i);
    // Interview must not complete without an honest scored report…
    expect(db.interviews[0].status).toBe('in_progress');
    expect(aggregateReportMock).not.toHaveBeenCalled();
    // …and no fabricated evaluations appear.
    expect(db.evaluations).toHaveLength(0);
    expect(persistMilestoneEventOnce).not.toHaveBeenCalled();
  });
});

describe('POST /complete — repair-aware idempotency under new ordering', () => {
  it('report exists but status not completed → repairs status, returns same report, no duplicate', async () => {
    // Simulate a crash between report insert and status update.
    db.reports = [
      { id: 'rep-existing', interview_id: IV, generated_at: '2026-07-05T00:00:00Z' },
    ];
    db.interviews[0].status = 'in_progress';

    const res = await POST(req({ interviewId: IV }));
    const json = await res.json();

    expect(json.reportId).toBe('rep-existing');
    expect(db.interviews[0].status).toBe('completed');
    // No new report generated.
    expect(aggregateReportMock).not.toHaveBeenCalled();
    expect(db.reports).toHaveLength(1);
    // Repair path never reaches the fresh-completion code — no duplicate event.
    expect(persistMilestoneEventOnce).not.toHaveBeenCalled();
  });

  it('already completed with a report → returns stored report, regenerates nothing', async () => {
    db.reports = [
      { id: 'rep-existing', interview_id: IV, generated_at: '2026-07-05T00:00:00Z' },
    ];
    db.interviews[0].status = 'completed';

    const res = await POST(req({ interviewId: IV }));
    const json = await res.json();

    expect(json.reportId).toBe('rep-existing');
    expect(aggregateReportMock).not.toHaveBeenCalled();
    expect(db.reports).toHaveLength(1);
    // A repeat POST after completion must not re-fire interview_completed.
    expect(persistMilestoneEventOnce).not.toHaveBeenCalled();
  });

  it('returns 404 when the interview is not owned / not found', async () => {
    db.interviews = [];
    const res = await POST(req({ interviewId: IV }));
    expect(res.status).toBe(404);
  });
});
