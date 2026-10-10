import { describe, expect, it } from 'vitest';
import {
  isScriptDimensionAverages,
  scriptDimsToV1Shape,
  scriptEvalDimsToAverages,
  scriptEvalDimsToV1Shape,
  scriptReportDimsToV1Shape,
} from './script-dimension-bridge';

const sample = {
  relevance: 7,
  content_accuracy: 6.5,
  communication_clarity: 8,
  structure: 7.5,
  specificity: 6,
};

const scoredEvalDims = {
  relevance: { score: 7, note: 'on topic' },
  content_accuracy: { score: 10, note: 'sound' },
  communication_clarity: { score: 7, note: 'clear' },
  structure: { score: 7, note: 'logical' },
  specificity: { score: 7, note: 'concrete' },
};

describe('script-dimension-bridge', () => {
  it('maps score-v1.2 keys onto V1 DimensionScores slots', () => {
    expect(scriptDimsToV1Shape(sample)).toEqual({
      communication_clarity: 8,
      technical_depth: 6.5,
      answer_structure: 7.5,
      confidence: 6,
      relevance: 7,
    });
  });

  it('rejects incomplete dimension payloads', () => {
    expect(isScriptDimensionAverages({ relevance: 7 })).toBe(false);
    expect(scriptReportDimsToV1Shape({ relevance: 7 })).toBeNull();
    expect(scriptReportDimsToV1Shape(sample)).toEqual(scriptDimsToV1Shape(sample));
  });

  it('extracts scores from per-answer { score, note } audit rows', () => {
    expect(scriptEvalDimsToAverages(scoredEvalDims)).toEqual({
      relevance: 7,
      content_accuracy: 10,
      communication_clarity: 7,
      structure: 7,
      specificity: 7,
    });
    expect(scriptEvalDimsToV1Shape(scoredEvalDims)).toEqual({
      communication_clarity: 7,
      technical_depth: 10,
      answer_structure: 7,
      confidence: 7,
      relevance: 7,
    });
  });

  it('does not treat interviewer-shaped incomplete objects as averages', () => {
    expect(scriptEvalDimsToAverages({ relevance: { note: 'x' } })).toBeNull();
    expect(scriptEvalDimsToV1Shape(null)).toBeNull();
  });
});
