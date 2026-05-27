/**
 * Layered text extraction / normalization after PDF or TXT decode.
 */

import { normalizeExtractedDocumentText } from '@/lib/utils/normalize-extracted-document-text';
import { scoreExtractedText, type ExtractionQualityBand } from '@/lib/resume/extraction-quality';

export type ExtractionStage =
  | 'direct'
  | 'normalized'
  | 'aggressive_cleanup'
  | 'degraded_accept';

export type LayeredExtractionResult = {
  text: string;
  stage: ExtractionStage;
  qualityBand: ExtractionQualityBand;
  qualityScore: number;
};

function stage1Direct(raw: string): string {
  return raw;
}

function stage2Normalize(raw: string, maxLen: number): string {
  return normalizeExtractedDocumentText(raw, maxLen);
}

/** Collapse noisy PDF extraction artifacts; preserve section breaks loosely. */
function stage3AggressiveCleanup(raw: string, maxLen: number): string {
  let t = raw.replace(/\u0000/g, '');
  t = t.replace(/[\u200B-\u200D\uFEFF]/g, '');
  t = t.replace(/([a-z])([A-Z])/g, '$1 $2');
  t = t.replace(/(\w)-(\w)/g, '$1$2');
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  return normalizeExtractedDocumentText(t, maxLen);
}

/**
 * Run staged cleanup; accept weak/minimal text rather than failing at upload.
 */
export function runLayeredTextExtraction(
  raw: string,
  maxLen = 400_000,
): LayeredExtractionResult {
  const direct = stage1Direct(raw);
  let text = stage2Normalize(direct, maxLen);
  let stage: ExtractionStage = 'direct';

  let report = scoreExtractedText(text);
  if (report.band === 'unusable' || report.band === 'minimal') {
    text = stage3AggressiveCleanup(direct, maxLen);
    stage = 'aggressive_cleanup';
    report = scoreExtractedText(text);
  }

  if (report.band === 'unusable' || report.band === 'minimal') {
    stage = 'normalized';
    text = stage2Normalize(direct, maxLen);
    report = scoreExtractedText(text);
  } else if (stage === 'aggressive_cleanup') {
    stage = 'aggressive_cleanup';
  } else {
    stage = 'normalized';
  }

  if (report.band === 'weak' || report.band === 'minimal') {
    return {
      text,
      stage: 'degraded_accept',
      qualityBand: report.band,
      qualityScore: report.score,
    };
  }

  return {
    text,
    stage: report.band === 'good' ? stage : 'degraded_accept',
    qualityBand: report.band,
    qualityScore: report.score,
  };
}
