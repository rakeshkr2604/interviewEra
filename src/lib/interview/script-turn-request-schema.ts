import { z } from 'zod';
import {
  SCRIPT_ANSWER_MAX_CHARS,
  SCRIPT_DISPLAY_QUESTION_MAX_CHARS,
  SCRIPT_TARGET_ROLE_MAX_CHARS,
} from '@/lib/interview/script-input-limits';

export const turnRequestSchema = z.object({
  interviewId: z.string().uuid(),
  lastAnswer: z.string().max(
    SCRIPT_ANSWER_MAX_CHARS,
    `Answer must be at most ${SCRIPT_ANSWER_MAX_CHARS} characters.`,
  ),
  currentPhase: z.enum(['warmup', 'self_intro', 'core', 'candidate_questions', 'closing']),
  /**
   * Client-sent counter kept for request-contract compatibility.
   * IGNORED — server derives question_number from script_turns (authority).
   */
  questionNumber: z.number(),
  // 'structured' kept for legacy clients; new UI submits 'corrected' (STT cleanup only).
  submittedAs: z.enum(['raw', 'corrected', 'structured', 'auto_submit']).optional(),
  prevTurnIndex: z.number().optional(),
  /**
   * Original STT (or typed) transcript for the previous turn.
   * Written once into script_turns.raw_transcript and never overwritten when
   * the candidate later submits a corrected version as answer_text.
   */
  sttRawTranscript: z
    .string()
    .max(
      SCRIPT_ANSWER_MAX_CHARS,
      `Transcript must be at most ${SCRIPT_ANSWER_MAX_CHARS} characters.`,
    )
    .optional(),
});

export const answerScoreRequestSchema = z.object({
  interviewId: z.string().uuid(),
  turnIndex: z.number(),
  transcript: z.string().max(
    SCRIPT_ANSWER_MAX_CHARS,
    `Transcript must be at most ${SCRIPT_ANSWER_MAX_CHARS} characters.`,
  ),
  displayQuestion: z
    .string()
    .min(1)
    .max(
      SCRIPT_DISPLAY_QUESTION_MAX_CHARS,
      `Question must be at most ${SCRIPT_DISPLAY_QUESTION_MAX_CHARS} characters.`,
    ),
  targetRole: z.string().max(
    SCRIPT_TARGET_ROLE_MAX_CHARS,
    `Role must be at most ${SCRIPT_TARGET_ROLE_MAX_CHARS} characters.`,
  ),
  questionType: z.enum(['technical', 'behavioral']).optional(),
  /** Min Deepgram final-segment confidence (0–1) for this answer, when captured. */
  sttMinConfidence: z.number().min(0).max(1).optional(),
});

export const autoStructureSchema = z.object({
  interviewId: z.string().uuid(),
  turnIndex: z.number(),
  rawTranscript: z.string().max(
    SCRIPT_ANSWER_MAX_CHARS,
    `Transcript must be at most ${SCRIPT_ANSWER_MAX_CHARS} characters.`,
  ),
  displayQuestion: z.string().max(
    SCRIPT_DISPLAY_QUESTION_MAX_CHARS,
    `Question must be at most ${SCRIPT_DISPLAY_QUESTION_MAX_CHARS} characters.`,
  ),
  targetRole: z.string().max(
    SCRIPT_TARGET_ROLE_MAX_CHARS,
    `Role must be at most ${SCRIPT_TARGET_ROLE_MAX_CHARS} characters.`,
  ),
  scriptType: z.enum(['SCRIPT_H', 'SCRIPT_T', 'SCRIPT_M']),
  questionType: z.enum(['technical', 'behavioral']).optional(),
});
