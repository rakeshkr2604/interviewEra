import { describe, expect, it } from 'vitest';
import {
  computeScriptAvgAnswerDurationSec,
  selectCoreAnsweredTurns,
} from './script-answer-duration';

const baseTurn = {
  phase: 'core' as const,
  is_question: true,
  submitted_as: 'raw',
  answer_text: 'I led a migration of our Next.js API routes…',
  llm_output: { is_follow_up: false },
  structured_answer: null,
};

describe('selectCoreAnsweredTurns', () => {
  it('counts only core parent answers — not interviewer, warmup, CQ, or follow-ups', () => {
    const turns = [
      {
        turn_index: 1,
        ...baseTurn,
        phase: 'warmup',
        submitted_as: 'auto_submit',
        answer_text: 'hi',
        created_at: '2026-10-09T13:15:25Z',
        answered_at: '2026-10-09T13:15:35Z',
      },
      {
        turn_index: 2,
        phase: 'core',
        is_question: false,
        submitted_as: null,
        answer_text: null,
        created_at: '2026-10-09T13:15:45Z',
        answered_at: null,
        llm_output: {},
        structured_answer: null,
      },
      {
        turn_index: 3,
        ...baseTurn,
        created_at: '2026-10-09T13:15:51Z',
        answered_at: '2026-10-09T13:17:51Z',
      },
      {
        turn_index: 4,
        ...baseTurn,
        llm_output: { is_follow_up: true },
        created_at: '2026-10-09T13:18:00Z',
        answered_at: '2026-10-09T13:18:40Z',
      },
      {
        turn_index: 5,
        ...baseTurn,
        submitted_as: 'skipped',
        answer_text: '[SKIPPED]',
        created_at: '2026-10-09T13:19:00Z',
        answered_at: '2026-10-09T13:19:01Z',
      },
      {
        turn_index: 9,
        phase: 'closing',
        is_question: false,
        submitted_as: null,
        answer_text: null,
        created_at: '2026-10-09T13:25:08Z',
        answered_at: null,
        llm_output: {},
        structured_answer: null,
      },
    ];

    expect(selectCoreAnsweredTurns(turns).map((t) => t.turn_index)).toEqual([3]);
  });
});

describe('computeScriptAvgAnswerDurationSec', () => {
  it('uses answered_at − created_at and ignores interviewer turn timestamps', () => {
    const turns = [
      {
        turn_index: 2,
        phase: 'core',
        is_question: false,
        submitted_as: null,
        answer_text: null,
        // Rapid interviewer turn — must NOT pull avg duration toward 0.
        created_at: '2026-10-09T13:15:45.000Z',
        answered_at: null,
        llm_output: {},
        structured_answer: null,
      },
      {
        turn_index: 3,
        ...baseTurn,
        created_at: '2026-10-09T13:15:51.000Z',
        answered_at: '2026-10-09T13:17:51.000Z', // 120s
      },
      {
        turn_index: 4,
        ...baseTurn,
        created_at: '2026-10-09T13:18:14.000Z',
        answered_at: '2026-10-09T13:20:14.000Z', // 120s
      },
      {
        turn_index: 9,
        phase: 'closing',
        is_question: false,
        submitted_as: null,
        answer_text: null,
        created_at: '2026-10-09T13:25:08.000Z',
        answered_at: null,
        llm_output: {},
        structured_answer: null,
      },
    ];

    expect(computeScriptAvgAnswerDurationSec(turns)).toBe(120);
  });

  it('returns 0 when answered_at is missing — never fabricates a passing duration', () => {
    const turns = [
      {
        turn_index: 3,
        ...baseTurn,
        created_at: '2026-10-09T13:15:51.000Z',
        answered_at: null,
        // structured_answer.submitted_at must not invent duration either
        structured_answer: { submitted_at: '2026-10-09T13:20:00.000Z' },
      },
      {
        turn_index: 4,
        ...baseTurn,
        created_at: '2026-10-09T13:18:14.000Z',
        answered_at: null,
      },
    ];

    expect(computeScriptAvgAnswerDurationSec(turns)).toBe(0);
  });

  it('returns 0 for invalid answered_at before created_at', () => {
    const turns = [
      {
        turn_index: 3,
        ...baseTurn,
        created_at: '2026-10-09T13:20:00.000Z',
        answered_at: '2026-10-09T13:15:00.000Z',
      },
    ];
    expect(computeScriptAvgAnswerDurationSec(turns)).toBe(0);
  });
});
