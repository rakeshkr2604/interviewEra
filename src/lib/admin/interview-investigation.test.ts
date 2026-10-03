import { describe, expect, it } from 'vitest';
import type { AdminInterviewReview } from '@/lib/admin/interview-review';
import {
  buildDiagnosticSummaryText,
  buildInvestigationSummary,
  buildInvestigationTimeline,
  dedupeTimelineEvents,
  deriveInvestigationStatus,
  filterTimelineEvents,
  formatDurationMs,
} from './interview-investigation';

const IV_ID = 'bec8589c-5b34-4545-a6e1-82f94ca9d1d7';
const OWNER_ID = 'aaaaaaaa-1111-4111-8111-111111111111';

function baseReview(overrides: Partial<AdminInterviewReview> = {}): AdminInterviewReview {
  return {
    interview: {
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
      current_turn_index: 2,
      credit_deducted: true,
      abandoned_resume_used: false,
      abandoned_resumed_at: null,
      skips_used: 0,
      max_skips: 2,
      session_context: { interviewMode: 'voice' },
    },
    owner: { id: OWNER_ID, email: 'candidate@example.com', name: 'Candidate' },
    turns: [
      {
        turn_index: 1,
        phase: 'core',
        is_question: true,
        question_type: 'technical',
        question_text: 'Why Redis?',
        answer_text: 'Caching',
        raw_transcript: 'Caching',
        submitted_as: 'raw',
        timer_seconds: 60,
        created_at: '2026-10-01T10:05:00.000Z',
        delivery_state: 'persisted',
        answer_state: 'captured',
        evaluation: {
          status: 'scored',
          overall: 3.2,
          question_type: 'technical',
          stt_min_confidence: 0.8,
          score_suspect: false,
          created_at: '2026-10-01T10:06:00.000Z',
        },
      },
    ],
    legacy_qa: [],
    report: null,
    credit_transactions: [
      {
        id: 'tx-1',
        type: 'debit',
        amount: 1,
        reason: 'interview_start',
        created_at: '2026-10-01T10:00:01.000Z',
      },
    ],
    product_events: [
      {
        id: 'pe-1',
        event_name: 'interview_mic_blocked',
        created_at: '2026-10-01T10:01:00.000Z',
        props: { interview_id: IV_ID, platform: 'desktop' },
      },
    ],
    ai_call_logs: [
      {
        id: 'ai-1',
        operation: 'question_generation',
        provider: 'openrouter',
        model: 'x',
        success: false,
        error_category: 'timeout',
        error_code: '504',
        retries: 1,
        latency_ms: 1200,
        session_id: 'sess-1',
        user_agent: 'Chrome',
        created_at: '2026-10-01T10:04:00.000Z',
      },
    ],
    voice_logs: [],
    linked_feedback: [
      {
        id: 'exit-1',
        source: 'exit',
        created_at: '2026-10-01T10:20:30.000Z',
        severity: null,
        exit_reason: 'I ran into a technical problem',
        issue_type: 'Microphone not working',
        is_resolved: false,
        is_archived: false,
        is_read: false,
        notes: null,
        screenshot_url: null,
        device_info: { browser: 'Chrome' },
        progress_percent: 40,
        question_index: 2,
      },
    ],
    technical_failure_case: null,
    visual_evidence: [
      {
        id: 'replay-unavailable',
        type: 'replay',
        capture_timestamp: null,
        source: 'in-product session replay',
        availability: 'unavailable',
        retention_note: 'none',
        url: null,
      },
    ],
    diagnostics: [
      {
        id: 'ai-1',
        category: 'ai',
        error_code: '504',
        message: 'timeout',
        timestamp: '2026-10-01T10:04:00.000Z',
        source: 'openrouter/question_generation',
        http_status: null,
        correlation_id: 'sess-1',
        retry_count: 1,
        browser_context: 'Chrome',
      },
    ],
    diagnostic_events: [
      {
        id: 'diag-1',
        event_type: 'mic_permission_denied',
        occurred_at: '2026-10-01T10:00:30.000Z',
        recorded_at: '2026-10-01T10:00:31.000Z',
        source: 'client',
        severity: 'error',
        error_code: 'mic_permission_denied',
        correlation_id: 'run1',
        turn_index: 0,
        confirmation: 'client_reported',
        metadata: { component: 'mic' },
      },
    ],
    credit_policy_context: 'policy',
    progress: {
      turn_count: 1,
      answered_turn_count: 1,
      evaluation_count: 1,
      has_report: false,
      duration_ms: 20 * 60 * 1000,
    },
    ...overrides,
  };
}

describe('investigation timeline helpers', () => {
  it('builds a chronological timeline without fabricating missing steps', () => {
    const timeline = buildInvestigationTimeline(baseReview());
    expect(timeline.some((e) => e.name === 'Interview started')).toBe(true);
    expect(timeline.some((e) => e.name === 'Interview abandoned')).toBe(true);
    expect(timeline.some((e) => e.name === 'Credit deducted')).toBe(true);
    expect(timeline.some((e) => e.name === 'AI provider call failed')).toBe(true);
    expect(timeline[0].timestamp! <= timeline[timeline.length - 1].timestamp!).toBe(true);
  });

  it('dedupes duplicate events and filters errors', () => {
    const event = {
      id: 'a',
      timestamp: '2026-10-01T10:00:00.000Z',
      name: 'Interview started',
      category: 'lifecycle' as const,
      source: 'x',
      severity: 'info' as const,
      detail: null,
      correlation_id: null,
    };
    expect(dedupeTimelineEvents([event, { ...event, id: 'b' }])).toHaveLength(1);
    const timeline = buildInvestigationTimeline(baseReview());
    expect(filterTimelineEvents(timeline, 'errors').every((e) => e.severity !== 'info')).toBe(
      true,
    );
  });

  it('summary does not invent root cause and reports credit verification separately', () => {
    const review = baseReview();
    const timeline = buildInvestigationTimeline(review);
    const summary = buildInvestigationSummary(review, timeline);
    expect(summary.abandonment_reason).toBe('I ran into a technical problem');
    expect(summary.credit_transaction_verified).toBe(true);
    expect(summary.recording_replay_available).toBe(false);
    expect(summary.first_observed_failure).toBeTruthy();

    const noCredit = baseReview({
      credit_transactions: [],
      interview: { ...baseReview().interview, credit_deducted: true },
    });
    const s2 = buildInvestigationSummary(noCredit, buildInvestigationTimeline(noCredit));
    expect(s2.credit_transaction_verified).toBe(false);
  });

  it('derives investigation status from existing triage without new columns', () => {
    expect(deriveInvestigationStatus(baseReview()).label).toBe('Feedback open');
    expect(
      deriveInvestigationStatus(
        baseReview({
          technical_failure_case: {
            id: 'tfc-1',
            feedback_id: 'fb-1',
            failure_category: 'server_error',
            status: 'investigating',
            submitted_at: '2026-10-01T10:21:00.000Z',
            resolved_at: null,
            reviewed_by_email: null,
            decision_reason: null,
            original_debit_transaction_id: 'tx-1',
            restoration_transaction_id: null,
          },
        }),
      ).label,
    ).toContain('investigating');
  });

  it('builds a privacy-safe copy summary without claiming unverified root cause', () => {
    const review = baseReview();
    const timeline = buildInvestigationTimeline(review);
    const summary = buildInvestigationSummary(review, timeline);
    const status = deriveInvestigationStatus(review);
    const text = buildDiagnosticSummaryText(review, timeline, summary, status);
    expect(text).toContain(IV_ID);
    expect(text).toContain('Session replay in-product: unavailable');
    expect(text).not.toMatch(/API_KEY|Bearer |sk-/i);
    expect(formatDurationMs(65000)).toBe('1m 5s');
  });
});
