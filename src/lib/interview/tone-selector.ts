import type { AnswerAnalysis } from '@/lib/interview/types';
import type { InterviewerTone } from '@/lib/voice/tts-client';

export type { InterviewerTone };

// Maps rapport level (1–10) and recent answer quality to an interviewer tone.
// Rapport drives the primary decision; answer depth is the tie-breaker at the
// high end — we only challenge if the candidate is *actually* performing well,
// not just feeling confident.
export function selectTone(
  rapportLevel: number,
  recentAnalyses: AnswerAnalysis[],
): InterviewerTone {
  if (rapportLevel < 5) {
    return 'encouraging';
  }

  if (rapportLevel > 7) {
    const avgDepth =
      recentAnalyses.length > 0
        ? recentAnalyses.reduce((sum, a) => sum + a.technical_depth, 0) /
          recentAnalyses.length
        : 5;
    return avgDepth >= 7 ? 'challenging' : 'neutral';
  }

  return 'neutral';
}
