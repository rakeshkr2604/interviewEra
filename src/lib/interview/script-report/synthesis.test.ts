import { describe, expect, it, vi } from 'vitest';
import {
  buildDeterministicSynthesis,
  normalizeScriptReportSynthesisRaw,
  validateScriptReportSynthesis,
} from '@/lib/interview/script-report/synthesis';
import { aggregateScriptAnswers } from '@/lib/interview/script-report/aggregate';

const validNarratives = {
  recruiter_assessment: 'The candidate demonstrates strong relevance and content accuracy. '.repeat(2),
  behavioral_intelligence: 'Behavioral answers show conflict handling with outcomes. '.repeat(2),
  communication_intelligence: 'Communication is clear with room to tighten flow. '.repeat(2),
  technical_intelligence: 'Technical knowledge shows through project and caching work. '.repeat(2),
};

describe('script-report synthesis', () => {
  it('accepts well-formed nested objects with no coercions', () => {
    const result = validateScriptReportSynthesis({
      ...validNarratives,
      hiring_signals: [
        { label: 'Clarity', detail: 'Clear enough for this session test.', polarity: 'strength' },
        { label: 'Depth', detail: 'Needs more specificity on tools used.', polarity: 'watch' },
      ],
      roadmap_30_day: [
        {
          week: 1,
          focus_dimension: 'specificity',
          title: 'Add numbers',
          actions: ['Rewrite one answer with a measurable outcome.'],
        },
        {
          week: 2,
          focus_dimension: 'structure',
          title: 'STAR practice',
          actions: ['Tell three stories with clear Result lines.'],
        },
        {
          week: 3,
          focus_dimension: 'content_accuracy',
          title: 'Concept check',
          actions: ['Explain one concept without buzzwords.'],
        },
      ],
      model_answer_fillins: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.coercions).toEqual([]);
  });

  it('coerces attempt-1 malformed shapes and reports coercions', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = validateScriptReportSynthesis({
      ...validNarratives,
      hiring_signals:
        'Strong signal on this session due to high relevance and content accuracy scores.',
      roadmap_30_day: {
        week_1: 'Focus on improving answer structure by practicing STAR.',
        week_2: 'Enhance specificity with concrete metrics.',
        week_3: 'Work on communication clarity with recordings.',
        week_4: 'Combine improvements in full mock interviews.',
      },
      model_answer_fillins: {
        '1': ['Line one about the project.', 'Line two about auth.'],
        '2': ['Line one about deadlines.', 'Line two about stakeholders.'],
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.coercions).toEqual(
        expect.arrayContaining([
          'hiring_signals:string→objects',
          'roadmap_30_day:object→array',
          'model_answer_fillins:object→array',
        ]),
      );
    }
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[script-report] synthesis normalizer coerced shapes:'),
    );
    warn.mockRestore();
  });

  it('does not pad a single bare tag into a fake second signal — still fails validation', () => {
    const normalized = normalizeScriptReportSynthesisRaw({
      ...validNarratives,
      hiring_signals: ['strong'],
      roadmap_30_day: [
        {
          week: 1,
          focus_dimension: 'structure',
          title: 'Week 1 ok',
          actions: ['Practice STAR structure this week carefully.'],
        },
        {
          week: 2,
          focus_dimension: 'specificity',
          title: 'Week 2 ok',
          actions: ['Add measurable detail this week carefully.'],
        },
        {
          week: 3,
          focus_dimension: 'communication_clarity',
          title: 'Week 3 ok',
          actions: ['Tighten spoken clarity this week carefully.'],
        },
      ],
      model_answer_fillins: [],
    });
    expect(normalized.coercions).toContain('hiring_signals:string[]→objects');
    const result = validateScriptReportSynthesis({
      ...validNarratives,
      hiring_signals: ['strong'],
      roadmap_30_day: [
        {
          week: 1,
          focus_dimension: 'structure',
          title: 'Week 1 ok',
          actions: ['Practice STAR structure this week carefully.'],
        },
        {
          week: 2,
          focus_dimension: 'specificity',
          title: 'Week 2 ok',
          actions: ['Add measurable detail this week carefully.'],
        },
        {
          week: 3,
          focus_dimension: 'communication_clarity',
          title: 'Week 3 ok',
          actions: ['Tighten spoken clarity this week carefully.'],
        },
      ],
      model_answer_fillins: [],
    });
    // min(2) hiring_signals — one coerced tag must not be silently rescued
    expect(result.ok).toBe(false);
  });

  it('leaves genuinely broken output failing (not force-coerced into valid)', () => {
    const result = validateScriptReportSynthesis({
      recruiter_assessment: 'too short',
      behavioral_intelligence: 42,
      hiring_signals: null,
      roadmap_30_day: 'not a roadmap',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(0);
  });

  it('happy-path normalize returns empty coercions', () => {
    const { coercions } = normalizeScriptReportSynthesisRaw({
      ...validNarratives,
      hiring_signals: [
        { label: 'A', detail: 'Detail long enough here.', polarity: 'strength' },
        { label: 'B', detail: 'Detail long enough here.', polarity: 'watch' },
      ],
      roadmap_30_day: [
        {
          week: 1,
          focus_dimension: 'structure',
          title: 'Week 1',
          actions: ['Do a concrete drill this week.'],
        },
      ],
      model_answer_fillins: [],
    });
    expect(coercions).toEqual([]);
  });

  it('deterministic fallback never fabricates percentiles and uses weakest dims', () => {
    const scored = aggregateScriptAnswers([
      {
        turnIndex: 0,
        question: 'Tell me about a conflict.',
        transcript: 'We disagreed on scope then aligned on a milestone and shipped.',
        questionType: 'behavioral',
        overall: 6,
        dimensions: {
          relevance: { score: 6, note: 'ok' },
          content_accuracy: { score: 6, note: 'ok' },
          communication_clarity: { score: 5, note: 'ok' },
          structure: { score: 4, note: 'weak structure' },
          specificity: { score: 5, note: 'ok' },
        },
        promptVersion: 'score-v1.2',
        scoreSuspect: false,
      },
    ]);
    expect(scored.kind).toBe('scored');
    if (scored.kind !== 'scored') return;
    const synth = buildDeterministicSynthesis(scored);
    expect(synth.recruiter_assessment.toLowerCase()).not.toMatch(/\b98th\b|top \d+%/);
    expect(synth.recruiter_assessment.toLowerCase()).toMatch(/not a peer percentile/);
    expect(synth.roadmap_30_day.length).toBe(4);
    expect(synth.hiring_signals.length).toBeGreaterThanOrEqual(2);
  });
});
