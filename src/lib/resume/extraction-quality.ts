/**
 * Lightweight extraction quality scoring (no ML).
 */

export type ExtractionQualityBand = 'good' | 'weak' | 'minimal' | 'unusable';

export type ExtractionQualityReport = {
  score: number;
  band: ExtractionQualityBand;
  charCount: number;
  wordCount: number;
  printableRatio: number;
};

import { approximateWordCount } from '@/lib/resume/parse-input';

const MIN_WORDS_GOOD = 80;
const MIN_WORDS_WEAK = 35;
const MIN_WORDS_MINIMAL = 12;
const MIN_CHARS_UNUSABLE = 8;

/** Quality band uses a prefix sample — full raw_text can be 400k+ in DB. */
const QUALITY_SAMPLE_CHARS = 16_000;

function printableRatioSample(text: string): number {
  if (text.length === 0) return 0;
  const sample = text.length > QUALITY_SAMPLE_CHARS ? text.slice(0, QUALITY_SAMPLE_CHARS) : text;
  let printable = 0;
  for (const ch of sample) {
    const code = ch.charCodeAt(0);
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126) || code > 160) {
      printable += 1;
    }
  }
  return printable / sample.length;
}

export function scoreExtractedText(raw: string): ExtractionQualityReport {
  const text = raw.trim();
  const charCount = text.length;
  const wordCount = approximateWordCount(text);
  const ratio = printableRatioSample(text);

  let band: ExtractionQualityBand = 'good';
  if (charCount < MIN_CHARS_UNUSABLE || ratio < 0.55) {
    band = 'unusable';
  } else if (wordCount < MIN_WORDS_MINIMAL) {
    band = 'minimal';
  } else if (wordCount < MIN_WORDS_WEAK) {
    band = 'weak';
  } else if (wordCount < MIN_WORDS_GOOD) {
    band = 'weak';
  }

  const score = Math.min(
    100,
    Math.round(
      Math.min(charCount / 400, 1) * 35 +
        Math.min(wordCount / 120, 1) * 45 +
        ratio * 20,
    ),
  );

  return { score, band, charCount, wordCount, printableRatio: ratio };
}

export function isObviouslyGarbage(text: string): boolean {
  const report = scoreExtractedText(text);
  return report.band === 'unusable';
}
