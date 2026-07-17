/**
 * Filler / speech-pattern summary for v2.1 script reports.
 *
 * v2.1 does not persist per-answer speech_metrics or wall-clock speaking duration.
 * We analyze answer transcripts with the shared filler dictionary and estimate
 * duration from word count (same 130 WPM fallback as v1 report aggregation).
 * UI must label this as transcript-estimated — never as mic telemetry.
 */

import { analyzeFillerWords } from '@/lib/filler-words/analyze';
import { FILLER_MESSAGES, FILLER_THRESHOLDS } from '@/lib/filler-words/config';
import type { ReportSpeechSummary } from '@/types/app.types';

const FALLBACK_WPM = 130;

export type ScriptSpeechInput = {
  transcript: string;
};

export function buildScriptSpeechSummary(answers: ScriptSpeechInput[]): ReportSpeechSummary | null {
  const withText = answers.filter((a) => a.transcript.trim().length > 0);
  if (withText.length === 0) return null;

  let totalFillerCount = 0;
  let totalDurationSeconds = 0;
  let totalWords = 0;
  const fillerMap = new Map<string, number>();

  for (const answer of withText) {
    const text = answer.transcript;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    totalWords += wordCount;
    const estimatedDuration = Math.max(Math.ceil((wordCount / FALLBACK_WPM) * 60), 1);
    totalDurationSeconds += estimatedDuration;
    const analysis = analyzeFillerWords(text, estimatedDuration);
    totalFillerCount += analysis.count;
    for (const f of analysis.words) {
      fillerMap.set(f.word, (fillerMap.get(f.word) ?? 0) + f.occurrences);
    }
  }

  const durationMinutes = Math.max(totalDurationSeconds / 60, 0.1);
  const ratePerMinute = Math.round(totalFillerCount / durationMinutes);

  let severity: ReportSpeechSummary['severity'] = 'safe';
  if (ratePerMinute >= FILLER_THRESHOLDS.severe) severity = 'severe';
  else if (ratePerMinute >= FILLER_THRESHOLDS.warning) severity = 'warning';

  return {
    total_filler_count: totalFillerCount,
    total_duration_seconds: totalDurationSeconds,
    rate_per_minute: ratePerMinute,
    severity,
    message: FILLER_MESSAGES[severity],
    percentage: totalWords > 0 ? Math.round((totalFillerCount / totalWords) * 100) : 0,
    top_fillers: Array.from(fillerMap.entries())
      .map(([word, occurrences]) => ({ word, occurrences }))
      .sort((a, b) => b.occurrences - a.occurrences),
    answers_with_metrics: 0,
    total_answers: withText.length,
    source: 'estimated',
  };
}

export function formatSpeechDurationLabel(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}
