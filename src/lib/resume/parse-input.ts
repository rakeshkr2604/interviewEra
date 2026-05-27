/**
 * Bounded resume text for AI + heuristic paths (latency-critical).
 */

import { clampText } from '@/lib/ai/context-hygiene';

/** Max chars sent to the LLM — keeps prompt tokens ~1.5–2.5k. */
export const RESUME_AI_INPUT_MAX_CHARS = 5_500;

/** Sample window for heuristic / quality scans (avoid O(n) on 400k blobs). */
export const RESUME_HEURISTIC_SAMPLE_CHARS = 12_000;

const WS = /\s/;

/** O(n) word count without allocating a huge split array. */
export function approximateWordCount(text: string, maxScan = RESUME_HEURISTIC_SAMPLE_CHARS): number {
  const sample = text.length > maxScan ? text.slice(0, maxScan) : text;
  let words = 0;
  let inWhitespace = true;
  for (let i = 0; i < sample.length; i++) {
    const isWs = WS.test(sample[i]!);
    if (!isWs && inWhitespace) words += 1;
    inWhitespace = isWs;
  }
  if (text.length > sample.length && words > 0) {
    return Math.min(Math.round(words * (text.length / sample.length)), 80_000);
  }
  return words;
}

/** Collapse noise and clamp for the AI parse call. */
export function prepareTextForAiParse(raw: string): string {
  const collapsed = raw
    .replace(/\u0000/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return clampText(collapsed, RESUME_AI_INPUT_MAX_CHARS);
}

/** Bounded slice for regex/heuristic work. */
export function sampleTextForHeuristic(raw: string): string {
  const t = raw.trim();
  return t.length > RESUME_HEURISTIC_SAMPLE_CHARS ? t.slice(0, RESUME_HEURISTIC_SAMPLE_CHARS) : t;
}
