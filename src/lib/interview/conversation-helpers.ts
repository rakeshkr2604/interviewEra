import type { AnswerAnalysis } from '@/lib/interview/types';

export function shouldGenerateFollowUp(analysis: AnswerAnalysis): boolean {
  // Follow up if answer is weak in multiple dimensions
  const weaknessScore =
    (analysis.technical_depth < 5 ? 1 : 0) +
    (analysis.specificity < 4 ? 1 : 0) +
    (analysis.missing_details.length > 2 ? 1 : 0);

  return weaknessScore >= 2 || analysis.recommended_followup_type !== 'acknowledge_move_on';
}

export function calculateRapportLevel(
  confidenceTrend: number[],
  positiveAcknowledgments: number
): number {
  if (confidenceTrend.length === 0) return 5;

  const recentConfidence = confidenceTrend.slice(-3);
  const avgConfidence =
    recentConfidence.reduce((a, b) => a + b, 0) / recentConfidence.length;

  // Higher confidence + acknowledgments = better rapport
  return Math.min(10, Math.round(avgConfidence * 0.7 + positiveAcknowledgments * 0.5));
}

export function adjustDifficultyLevel(
  currentLevel: number,
  recentAnalyses: AnswerAnalysis[]
): number {
  if (recentAnalyses.length < 2) return currentLevel;

  const avgDepth =
    recentAnalyses.reduce((sum, a) => sum + a.technical_depth, 0) / recentAnalyses.length;

  // If answers consistently strong, increase difficulty
  if (avgDepth >= 7 && currentLevel < 10) return currentLevel + 1;
  // If struggling, decrease difficulty
  if (avgDepth <= 4 && currentLevel > 1) return currentLevel - 1;

  return currentLevel;
}
