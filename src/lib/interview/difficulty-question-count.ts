import type { InterviewDifficulty } from '@/types/app.types';

/** Integer count sent to `/api/interview/start` (clamped server-side to [4, 10]). */
export function difficultyQuestionCount(difficulty: InterviewDifficulty): number {
  switch (difficulty) {
    case 'easy':
      return 4;
    case 'hard':
      return 8;
    case 'medium':
    default:
      return 6;
  }
}

/** Display range shown in Interview format copy (aligned with difficulty intent). */
export function difficultyQuestionRangeLabel(difficulty: InterviewDifficulty): string {
  switch (difficulty) {
    case 'easy':
      return '4–5';
    case 'hard':
      return '8–10';
    case 'medium':
    default:
      return '6–7';
  }
}
