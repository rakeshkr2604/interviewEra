/**
 * Question Engine v2 — zod contracts for LLM output.
 *
 * Both schemas are strict (unknown keys rejected) so a drifting model response
 * fails validation and triggers the single retry instead of leaking malformed
 * cards to the UI or the Redis cache.
 */

import { z } from 'zod';

export const QG_CATEGORIES = ['technical', 'behavioral', 'situational'] as const;
export const QG_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export type QgCategory = (typeof QG_CATEGORIES)[number];
export type QgDifficulty = (typeof QG_DIFFICULTIES)[number];

export const QG_SET_SIZE = 10;

/** Hard cap on pasted job-description length (client and server enforced). */
export const QG_JD_MAX_CHARS = 4_000;

export const qgQuestionSchema = z
  .object({
    order: z.number().int().min(1).max(QG_SET_SIZE),
    question_text: z.string().trim().min(10).max(600),
    category: z.enum(QG_CATEGORIES),
    difficulty: z.enum(QG_DIFFICULTIES),
    probing: z.string().trim().min(10).max(400),
  })
  .strict();

export const qgSetSchema = z
  .object({
    questions: z.array(qgQuestionSchema).length(QG_SET_SIZE),
  })
  .strict();

export const qgAnswerSchema = z
  .object({
    framework: z.string().trim().min(2).max(80),
    answer_approach: z.array(z.string().trim().min(5).max(400)).min(3).max(6),
    common_mistakes: z.array(z.string().trim().min(5).max(400)).min(2).max(3),
    follow_ups: z.array(z.string().trim().min(5).max(400)).min(2).max(3),
  })
  .strict();

export type QgQuestion = z.infer<typeof qgQuestionSchema>;
export type QgSet = z.infer<typeof qgSetSchema>;
export type QgAnswer = z.infer<typeof qgAnswerSchema>;

/** Generation modes shipped in Phase 1. */
export type QgMode = 'role' | 'jd';

/** Set-level metadata carried alongside the questions (storage + telemetry + CTA). */
export interface QgResultMeta {
  mode: QgMode;
  /** Empty string in JD mode (role is not collected there). */
  role: string;
  level: string;
  domain: string;
}
