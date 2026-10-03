import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { FakeDb } from '@/test-utils/supabase-fake';
import { makeFakeServiceClient } from '@/test-utils/supabase-fake';
import {
  adminInterviewReviewPath,
  extractTurnAnswerText,
  extractTurnQuestionText,
  feedbackViewInterviewHref,
  isInterviewId,
  loadAdminInterviewReview,
} from './interview-review';

const IV_ID = 'bec8589c-5b34-4545-a6e1-82f94ca9d1d7';
const OWNER_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const ADMIN_ID = 'bbbbbbbb-2222-4222-8222-222222222222';

describe('feedbackViewInterviewHref', () => {
  it('routes script and v2.1 labels to the admin review path by interview id', () => {
    expect(feedbackViewInterviewHref(IV_ID)).toBe(
      `/platform/feedback/interview/${IV_ID}`,
    );
    expect(adminInterviewReviewPath(IV_ID)).toContain(IV_ID);
  });

  it('does not depend on report_id or engine string', () => {
    // Helper only takes interview id — missing report cannot block access.
    const href = feedbackViewInterviewHref(IV_ID);
    expect(href).toBe(`/platform/feedback/interview/${IV_ID}`);
    expect(href).not.toMatch(/^\/report\//);
    expect(href).not.toMatch(/^\/interview\//);
    expect(href).not.toMatch(/^\/report\/script\//);
  });

  it('returns null for missing or invalid interview ids', () => {
    expect(feedbackViewInterviewHref(null)).toBeNull();
    expect(feedbackViewInterviewHref(undefined)).toBeNull();
    expect(feedbackViewInterviewHref('not-a-uuid')).toBeNull();
    expect(isInterviewId('not-a-uuid')).toBe(false);
    expect(isInterviewId(IV_ID)).toBe(true);
  });
});

describe('turn text extractors', () => {
  it('prefers display_question then speech', () => {
    expect(
      extractTurnQuestionText({
        display_question: ' Explain Redis ',
        speech: 'Bridge',
      }),
    ).toBe('Explain Redis');
    expect(extractTurnQuestionText({ speech: ' Warmup ' })).toBe('Warmup');
    expect(extractTurnQuestionText(null)).toBeNull();
  });

  it('prefers answer_text then raw_transcript', () => {
    expect(extractTurnAnswerText(' Typed ', ' voice ')).toBe('Typed');
    expect(extractTurnAnswerText(null, ' voice ')).toBe('voice');
    expect(extractTurnAnswerText('', '')).toBeNull();
  });
});

describe('loadAdminInterviewReview', () => {
  let db: FakeDb;

  beforeEach(() => {
    db = {
      interviews: [
        {
          id: IV_ID,
          user_id: OWNER_ID,
          role: 'SDE Intern',
          difficulty: 'medium',
          engine: 'v2.1',
          script_type: 'SCRIPT_H',
          status: 'abandoned',
          started_at: '2026-10-01T10:00:00.000Z',
          completed_at: '2026-10-01T10:20:00.000Z',
          created_at: '2026-10-01T09:59:00.000Z',
          current_turn_index: 3,
          credit_deducted: true,
          abandoned_resume_used: false,
          abandoned_resumed_at: null,
          skips_used: 0,
          max_skips: 2,
          session_context: { interviewMode: 'voice' },
        },
      ],
      users: [
        { id: OWNER_ID, email: 'candidate@example.com', name: 'Candidate' },
        { id: ADMIN_ID, email: 'admin@interviewera.com', name: 'Admin' },
      ],
      script_turns: [
        {
          interview_id: IV_ID,
          turn_index: 1,
          phase: 'warmup',
          is_question: false,
          question_type: null,
          llm_output: { speech: 'Welcome', display_question: null },
          raw_transcript: null,
          answer_text: null,
          submitted_as: null,
          timer_seconds: null,
          created_at: '2026-10-01T10:01:00.000Z',
        },
        {
          interview_id: IV_ID,
          turn_index: 2,
          phase: 'core',
          is_question: true,
          question_type: 'technical',
          llm_output: {
            speech: 'Tell me about Redis',
            display_question: 'Why Redis over Memcached?',
          },
          raw_transcript: 'I used Redis for caching',
          answer_text: 'I used Redis for caching hot keys',
          submitted_as: 'raw',
          timer_seconds: 90,
          created_at: '2026-10-01T10:05:00.000Z',
        },
      ],
      answer_evaluations: [
        {
          interview_id: IV_ID,
          turn_index: 2,
          status: 'scored',
          overall: 3.5,
          question_type: 'technical',
          stt_min_confidence: 0.77,
          score_suspect: false,
          created_at: '2026-10-01T10:06:00.000Z',
        },
      ],
      script_interview_reports: [],
      questions: [],
      answers: [],
      credit_transactions: [
        {
          id: 'tx-debit-1',
          interview_id: IV_ID,
          type: 'debit',
          amount: 1,
          reason: 'interview_start',
          created_at: '2026-10-01T10:00:01.000Z',
        },
      ],
      product_events: [
        {
          id: 'pe-1',
          user_id: OWNER_ID,
          event_name: 'interview_started',
          props: { interview_id: IV_ID },
          created_at: '2026-10-01T10:00:02.000Z',
        },
        {
          id: 'pe-noise',
          user_id: OWNER_ID,
          event_name: 'pricing_page_viewed',
          props: {},
          created_at: '2026-10-01T09:00:00.000Z',
        },
      ],
      ai_call_logs: [],
      voice_usage_logs: [],
      interview_exit_feedbacks: [
        {
          id: 'exit-1',
          interview_id: IV_ID,
          exit_reason: 'I ran into a technical problem',
          issue_type: 'Audio issue',
          is_resolved: false,
          is_archived: false,
          is_read: false,
          notes: null,
          device_info: { browser: 'Chrome' },
          progress_percent: 35,
          question_index: 2,
          created_at: '2026-10-01T10:20:30.000Z',
        },
      ],
      interview_feedbacks: [],
      technical_failure_cases: [],
      feedbacks: [],
      interview_diagnostic_events: [],
    };
  });

  it('loads an abandoned v2.1 interview without requiring admin ownership or a report', async () => {
    const review = await loadAdminInterviewReview(makeFakeServiceClient(db), IV_ID);
    expect(review).not.toBeNull();
    expect(review!.interview.user_id).toBe(OWNER_ID);
    expect(review!.interview.user_id).not.toBe(ADMIN_ID);
    expect(review!.interview.status).toBe('abandoned');
    expect(review!.interview.engine).toBe('v2.1');
    expect(review!.report).toBeNull();
    expect(review!.progress.has_report).toBe(false);
    expect(review!.turns).toHaveLength(2);
    expect(review!.turns[1].question_text).toBe('Why Redis over Memcached?');
    expect(review!.turns[1].answer_text).toBe('I used Redis for caching hot keys');
    expect(review!.turns[1].answer_state).toBe('captured');
    expect(review!.turns[1].evaluation?.overall).toBe(3.5);
    expect(review!.owner?.email).toBe('candidate@example.com');
    expect(review!.credit_transactions).toHaveLength(1);
    expect(review!.product_events.map((e) => e.event_name)).toEqual(['interview_started']);
    expect(review!.linked_feedback[0]?.exit_reason).toBe('I ran into a technical problem');
    expect(review!.progress.duration_ms).toBe(20 * 60 * 1000);
  });

  it('does not infer credit verification from credit_deducted alone', async () => {
    db.credit_transactions = [];
    const review = await loadAdminInterviewReview(makeFakeServiceClient(db), IV_ID);
    expect(review!.interview.credit_deducted).toBe(true);
    expect(review!.credit_transactions).toHaveLength(0);
  });

  it('returns null for nonexistent interviews', async () => {
    const review = await loadAdminInterviewReview(
      makeFakeServiceClient(db),
      'cccccccc-3333-4333-8333-333333333333',
    );
    expect(review).toBeNull();
  });

  it('handles zero turns and includes report summary when present', async () => {
    db.script_turns = [];
    db.answer_evaluations = [];
    db.script_interview_reports = [
      {
        interview_id: IV_ID,
        id: 'dddddddd-4444-4444-8444-444444444444',
        status: 'ready',
        overall: 4.1,
        score_band: 'strong',
        scored_answer_count: 5,
        generated_at: '2026-10-01T11:00:00.000Z',
      },
    ];
    db.interviews[0].status = 'completed';

    const review = await loadAdminInterviewReview(makeFakeServiceClient(db), IV_ID);
    expect(review!.turns).toHaveLength(0);
    expect(review!.progress.answered_turn_count).toBe(0);
    expect(review!.report?.overall).toBe(4.1);
    expect(review!.progress.has_report).toBe(true);
  });

  it('falls back to legacy questions/answers when script_turns are empty', async () => {
    db.script_turns = [];
    db.questions = [
      {
        id: 'q-1',
        interview_id: IV_ID,
        order_index: 0,
        question_text: 'Legacy question',
      },
    ];
    db.answers = [
      {
        question_id: 'q-1',
        answer_text: 'Legacy answer',
        submitted_at: '2026-10-01T10:10:00.000Z',
      },
    ];

    const review = await loadAdminInterviewReview(makeFakeServiceClient(db), IV_ID);
    expect(review!.legacy_qa).toHaveLength(1);
    expect(review!.legacy_qa[0].answer_text).toBe('Legacy answer');
  });

  it('does not log answer content on load failures', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          order() {
            return this;
          },
          maybeSingle: async () => ({
            data: null,
            error: { code: 'PGRST000', message: 'boom' },
          }),
        };
      },
    };

    await expect(
      loadAdminInterviewReview(broken as never, IV_ID),
    ).rejects.toThrow('Failed to load interview');

    const logged = spy.mock.calls.map((c) => JSON.stringify(c)).join(' ');
    expect(logged).not.toMatch(/Redis|caching|candidate@example/i);
    spy.mockRestore();
  });
});
