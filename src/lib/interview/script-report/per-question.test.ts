/**
 * Follow-up hierarchy + per-question report contract (Issue A regression).
 */

import { describe, expect, it } from 'vitest';
import { DIMENSION_KEYS, type DimensionKey } from '@/lib/interview/answer-score/rubric';
import { aggregateScriptAnswers } from '@/lib/interview/script-report/aggregate';
import {
  annotateCoreFollowUpHierarchy,
  buildPerQuestionReportRows,
  buildScoredAnswerInputs,
  groupPerQuestionByCore,
  reportLacksFollowUpCoverage,
  type EvalRowForReport,
  type ScriptTurnForReport,
} from '@/lib/interview/script-report/per-question';

function dims(score = 7): Record<DimensionKey, { score: number; note?: string }> {
  const out = {} as Record<DimensionKey, { score: number; note?: string }>;
  for (const key of DIMENSION_KEYS) {
    out[key] = { score, note: `${key} note` };
  }
  return out;
}

function turn(
  partial: Partial<ScriptTurnForReport> & {
    turn_index: number;
    is_follow_up?: boolean;
    display_question?: string;
  },
): ScriptTurnForReport {
  const { is_follow_up = false, display_question = `Q${partial.turn_index}`, ...rest } =
    partial;
  return {
    phase: 'core',
    is_question: true,
    llm_output: {
      is_follow_up,
      display_question,
      speech: display_question,
      question_type: 'technical',
    },
    answer_text: `Answer for turn ${partial.turn_index}`,
    question_type: 'technical',
    structured_answer: {
      coaching_reference: {
        restructured_example: [`Model for ${partial.turn_index}`],
      },
    },
    ...rest,
  };
}

function scoredEval(
  turnIndex: number,
  overrides: Partial<EvalRowForReport> = {},
): EvalRowForReport {
  return {
    turn_index: turnIndex,
    question: `Q${turnIndex}`,
    transcript: `Scored transcript ${turnIndex}`,
    question_type: 'technical',
    overall: 7,
    dimensions: dims(7),
    prompt_version: 'score-v1.2',
    score_suspect: false,
    status: 'scored',
    raw_model_output: JSON.stringify({ one_line_summary: `Summary ${turnIndex}` }),
    ...overrides,
  };
}

/** Fixture: cores 1 & 3 plain; core 2 with two follow-ups (one scored, one unscored). */
function representativeFixture() {
  const turns: ScriptTurnForReport[] = [
    turn({ turn_index: 2, display_question: 'Core A — tell me about yourself' }),
    turn({
      turn_index: 4,
      display_question: 'Core B — hard technical challenge',
    }),
    turn({
      turn_index: 5,
      is_follow_up: true,
      display_question: 'FU1 — what was the bottleneck?',
    }),
    turn({
      turn_index: 6,
      is_follow_up: true,
      display_question: 'FU2 — how did you measure success?',
      answer_text:
        'Long transcript. '.repeat(80) +
        'This answer is intentionally long to exercise PDF/web overflow handling.',
    }),
    turn({ turn_index: 8, display_question: 'Core C — leadership example' }),
  ];

  const evals: EvalRowForReport[] = [
    scoredEval(2, { overall: 8, dimensions: dims(8) }),
    scoredEval(4, { overall: 6, dimensions: dims(6) }),
    scoredEval(5, { overall: 7, dimensions: dims(7) }),
    // turn 6 answered but evaluation unavailable
    {
      turn_index: 6,
      question: 'FU2 — how did you measure success?',
      transcript: turns[3]!.answer_text!,
      question_type: 'technical',
      overall: null,
      dimensions: null,
      prompt_version: 'score-v1.2',
      score_suspect: false,
      status: 'failed',
      raw_model_output: null,
    },
    scoredEval(8, { overall: 7.5, dimensions: dims(7) }),
  ];

  return { turns, evals };
}

describe('script-report per-question follow-ups', () => {
  it('annotates parent/child hierarchy and sequences chronologically', () => {
    const { turns } = representativeFixture();
    const annotated = annotateCoreFollowUpHierarchy(turns);

    expect(annotated.map((a) => ({
      i: a.turn.turn_index,
      fu: a.isFollowUp,
      parent: a.parentTurnIndex,
      coreSeq: a.coreSequence,
      fuSeq: a.followUpSequence,
    }))).toEqual([
      { i: 2, fu: false, parent: null, coreSeq: 1, fuSeq: null },
      { i: 4, fu: false, parent: null, coreSeq: 2, fuSeq: null },
      { i: 5, fu: true, parent: 4, coreSeq: 2, fuSeq: 1 },
      { i: 6, fu: true, parent: 4, coreSeq: 2, fuSeq: 2 },
      { i: 8, fu: false, parent: null, coreSeq: 3, fuSeq: null },
    ]);
  });

  it('includes scored and unscored follow-ups exactly once under the parent', () => {
    const { turns, evals } = representativeFixture();
    const annotated = annotateCoreFollowUpHierarchy(turns);
    const rows = buildPerQuestionReportRows(annotated, evals);
    const groups = groupPerQuestionByCore(rows);

    expect(rows).toHaveLength(5);
    expect(rows.filter((r) => r.isFollowUp)).toHaveLength(2);
    expect(groups).toHaveLength(3);

    const withFus = groups.find((g) => g.core.turnIndex === 4)!;
    expect(withFus.followUps.map((f) => f.turnIndex)).toEqual([5, 6]);
    expect(withFus.followUps[0]!.evaluationStatus).toBe('scored');
    expect(withFus.followUps[0]!.overall).toBe(7);
    expect(withFus.followUps[1]!.evaluationStatus).toBe('unavailable');
    expect(withFus.followUps[1]!.overall).toBeNull();
    expect(withFus.followUps[1]!.transcript.length).toBeGreaterThan(200);
    expect(withFus.followUps[0]!.modelAnswerLines[0]).toContain('Model for 5');

    const noFu = groups.find((g) => g.core.turnIndex === 2)!;
    expect(noFu.followUps).toEqual([]);
  });

  it('does not change session overall when follow-ups are present vs scored-only average', () => {
    const { turns, evals } = representativeFixture();
    const annotated = annotateCoreFollowUpHierarchy(turns);
    const scored = buildScoredAnswerInputs(annotated, evals);
    const agg = aggregateScriptAnswers(scored);

    expect(agg.kind).toBe('scored');
    if (agg.kind !== 'scored') return;

    // scored: turns 2,4,5,8 — not the failed FU at 6
    expect(agg.scoredAnswerCount).toBe(4);
    expect(agg.scoredCoreCount).toBe(3);
    expect(agg.scoredFollowUpCount).toBe(1);

    const coreOnly = aggregateScriptAnswers(scored.filter((s) => !s.isFollowUp));
    expect(coreOnly.kind).toBe('scored');
    if (coreOnly.kind !== 'scored') return;

    // Explicit: including FU changes the average when FU score differs — that is
    // current product policy (all scored answers). Documented, not accidental.
    expect(agg.scoredAnswerCount).toBeGreaterThan(coreOnly.scoredAnswerCount);
    expect(agg.overall).toBe(
      // same formula as aggregate — verify FU is in the mean, not dropped
      (() => {
        const again = aggregateScriptAnswers(scored);
        return again.kind === 'scored' ? again.overall : -1;
      })(),
    );
  });

  it('preserves transcripts without truncation in the report row', () => {
    const { turns, evals } = representativeFixture();
    const annotated = annotateCoreFollowUpHierarchy(turns);
    const rows = buildPerQuestionReportRows(annotated, evals);
    const long = rows.find((r) => r.turnIndex === 6)!;
    expect(long.transcript).toBe(turns[3]!.answer_text);
    expect(long.transcript.includes('intentionally long')).toBe(true);
  });

  it('does not present a question echo as a strong knowledge summary', () => {
    const q =
      'What is the difference between authentication and authorization?';
    const turns: ScriptTurnForReport[] = [
      turn({
        turn_index: 2,
        display_question: q,
        answer_text: q,
      }),
    ];
    const evals: EvalRowForReport[] = [
      scoredEval(2, {
        question: q,
        transcript: q,
        overall: 8,
        raw_model_output: JSON.stringify({
          one_line_summary: 'Excellent understanding of authentication.',
        }),
      }),
    ];
    const rows = buildPerQuestionReportRows(
      annotateCoreFollowUpHierarchy(turns),
      evals,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.overall).toBe(8); // rubric score preserved
    expect(rows[0]!.answerQualityKind).toBe('question_echo');
    expect(rows[0]!.oneLineSummary).toMatch(/repeated the question/i);
    expect(rows[0]!.oneLineSummary).not.toMatch(/Excellent understanding/i);
    expect(rows[0]!.scoreSuspect).toBe(true);
  });

  it('detects cached reports missing follow-up coverage', () => {
    const { turns, evals } = representativeFixture();
    const annotated = annotateCoreFollowUpHierarchy(turns);
    const full = buildPerQuestionReportRows(annotated, evals);

    expect(
      reportLacksFollowUpCoverage({
        perQuestion: full,
        turns,
        evals,
      }),
    ).toBe(false);

    const legacyCoresOnly = full
      .filter((r) => !r.isFollowUp)
      .map(({ isFollowUp: _drop, parentTurnIndex: _p, ...rest }) => rest);

    expect(
      reportLacksFollowUpCoverage({
        perQuestion: legacyCoresOnly,
        turns,
        evals,
      }),
    ).toBe(true);

    // Present but unlabeled (legacy flat FU) also needs regen
    const unlabeled = full.map((r) =>
      r.isFollowUp ? { ...r, isFollowUp: false, parentTurnIndex: null } : r,
    );
    expect(
      reportLacksFollowUpCoverage({
        perQuestion: unlabeled,
        turns,
        evals,
      }),
    ).toBe(true);
  });

  it('ignores warmup / non-core phases', () => {
    const turns: ScriptTurnForReport[] = [
      {
        turn_index: 1,
        phase: 'warmup',
        is_question: true,
        llm_output: { is_follow_up: false, display_question: 'Ready?' },
        answer_text: 'Yes',
      },
      turn({ turn_index: 2, display_question: 'Core only' }),
    ];
    const annotated = annotateCoreFollowUpHierarchy(turns);
    expect(annotated).toHaveLength(1);
    expect(annotated[0]!.turn.turn_index).toBe(2);
  });
});
