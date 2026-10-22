/**
 * PDF content regression for adaptive follow-ups + long transcripts (Issue B).
 */

import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { DIMENSION_KEYS, type DimensionKey } from '@/lib/interview/answer-score/rubric';
import type { PerQuestionReportRow } from '@/lib/interview/script-report/aggregate';
import { ScriptReportPDF } from '@/components/report/ScriptReportPDF';
import type { ScriptReportSynthesis } from '@/lib/interview/script-report/synthesis';

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText } = await import('@/lib/pdf/parser');
  return extractText(new Uint8Array(buffer), {
    source: 'script-report-pdf-test',
    fileNameHint: 'script-report.pdf',
  });
}

function dims(score: number): NonNullable<PerQuestionReportRow['dimensions']> {
  const out = {} as NonNullable<PerQuestionReportRow['dimensions']>;
  for (const key of DIMENSION_KEYS) {
    out[key] = { score, note: `${key} note` };
  }
  return out;
}

const LONG =
  'Long candidate answer spanning many sentences to ensure the PDF does not clip. '.repeat(
    40,
  );

function row(
  partial: Partial<PerQuestionReportRow> & Pick<PerQuestionReportRow, 'turnIndex' | 'question'>,
): PerQuestionReportRow {
  return {
    questionType: 'technical',
    overall: 7,
    dimensions: dims(7),
    transcript: `Answer ${partial.turnIndex}`,
    scoreSuspect: false,
    oneLineSummary: null,
    modelAnswerLines: [`Model answer for ${partial.turnIndex}`],
    focusNote: null,
    evaluationStatus: 'scored',
    isFollowUp: false,
    parentTurnIndex: null,
    coreSequence: 1,
    followUpSequence: null,
    ...partial,
  };
}

const synthesis: ScriptReportSynthesis = {
  recruiter_assessment:
    'This session shows competitive system-design clarity with room to deepen concurrency detail across probes.',
  behavioral_intelligence:
    'Behavioral answers used concrete ownership language and clear outcomes when leadership was discussed.',
  communication_intelligence:
    'Communication stayed structured; filler rate was moderate under follow-up pressure.',
  technical_intelligence:
    'Technical answers covered trade-offs; follow-ups exposed thinner measurement specifics.',
  hiring_signals: [
    {
      label: 'System design',
      detail: 'Clear capacity and caching reasoning on the core design question.',
      polarity: 'strength',
    },
    {
      label: 'Measurement gaps',
      detail: 'Follow-up on success metrics lacked concrete instrumentation.',
      polarity: 'watch',
    },
  ],
  roadmap_30_day: [
    {
      week: 1,
      focus_dimension: 'specificity',
      title: 'Add measurable detail',
      actions: ['Rewrite one answer with latency and error-budget numbers.'],
    },
    {
      week: 2,
      focus_dimension: 'structure',
      title: 'Tighten STAR',
      actions: ['Practice one behavioral answer with timed STAR beats.'],
    },
    {
      week: 3,
      focus_dimension: 'content_accuracy',
      title: 'Deepen concurrency',
      actions: ['Explain lock vs queue trade-offs aloud twice.'],
    },
  ],
  model_answer_fillins: [],
};

describe('ScriptReportPDF', () => {
  it('embeds core + follow-up text, unavailable eval, and long transcript', async () => {
    const perQuestion: PerQuestionReportRow[] = [
      row({
        turnIndex: 2,
        question: 'Core A unique marker ALPHA',
        coreSequence: 1,
        overall: 8,
        dimensions: dims(8),
      }),
      row({
        turnIndex: 4,
        question: 'Core B unique marker BRAVO',
        coreSequence: 2,
        overall: 6,
        dimensions: dims(6),
      }),
      row({
        turnIndex: 5,
        question: 'Follow-up unique marker CHARLIE',
        isFollowUp: true,
        parentTurnIndex: 4,
        coreSequence: 2,
        followUpSequence: 1,
        overall: 7,
        dimensions: dims(7),
        transcript: 'Scored follow-up answer CHARLIE-ANSWER',
      }),
      row({
        turnIndex: 6,
        question: 'Follow-up unique marker DELTA',
        isFollowUp: true,
        parentTurnIndex: 4,
        coreSequence: 2,
        followUpSequence: 2,
        overall: null,
        dimensions: null,
        evaluationStatus: 'unavailable',
        transcript: LONG + ' DELTA-LONG-TAIL',
        modelAnswerLines: [],
      }),
      row({
        turnIndex: 8,
        question: 'Core C unique marker ECHO',
        coreSequence: 3,
        overall: 7.5,
        dimensions: dims(7),
      }),
    ];

    const dimensionAverages = {} as Record<DimensionKey, number>;
    for (const key of DIMENSION_KEYS) dimensionAverages[key] = 7;

    const buffer = await renderToBuffer(
      createElement(ScriptReportPDF, {
        role: 'Senior Software Engineer',
        completedAt: '20 Apr 2024, 10:00 am',
        overall: 7.2,
        scoreBand: 'competitive',
        placementSignal: 'placement_competitive',
        dimensionAverages,
        scoredAnswerCount: 4,
        synthesis,
        speechSummary: null,
        perQuestion,
        includeModelAnswers: true,
      }),
    );

    expect(Buffer.isBuffer(buffer) || buffer instanceof Uint8Array).toBe(true);
    const header = Buffer.from(buffer).subarray(0, 5).toString('utf8');
    expect(header).toBe('%PDF-');

    const text = await extractPdfText(Buffer.from(buffer));

    expect(text).toContain('Core A unique marker ALPHA');
    expect(text).toContain('Core B unique marker BRAVO');
    expect(text).toContain('Follow-up unique marker CHARLIE');
    expect(text).toContain('Follow-up unique marker DELTA');
    expect(text).toContain('Core C unique marker ECHO');
    expect(text).toContain('CHARLIE-ANSWER');
    expect(text).toContain('DELTA-LONG-TAIL');
    expect(text).toContain('Evaluation unavailable');
    // Badge uses textTransform uppercase in the PDF stylesheet.
    expect(text.toUpperCase()).toContain('ADAPTIVE FOLLOW-UP');
    expect(text).toContain('Model answer for 2');
    expect(text).toContain('This session shows competitive system-design');
    expect(text).toContain('Practice plan from your weakest dimensions');
    expect(text).toContain('Long candidate answer spanning many sentences');
    expect(text).toContain('3 core questions');
    expect(text).toContain('2 adaptive follow-ups');
  }, 30_000);
});
