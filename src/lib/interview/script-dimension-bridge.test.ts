import { describe, expect, it } from 'vitest';
import {
  isScriptDimensionAverages,
  scriptDimsToV1Shape,
  scriptReportDimsToV1Shape,
} from './script-dimension-bridge';

const sample = {
  relevance: 7,
  content_accuracy: 6.5,
  communication_clarity: 8,
  structure: 7.5,
  specificity: 6,
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
});
