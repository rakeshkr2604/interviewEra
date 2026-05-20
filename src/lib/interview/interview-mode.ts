/**
 * Strict interview-mode architecture.
 *
 * Non-negotiable product rule: if the user picks Technical, the system MUST NEVER
 * ask HR/behavioral questions, and vice-versa. Mixed blends both.
 *
 * Enforcement is at the COARSE category level the rest of the pipeline already
 * uses (`technical | behavioral | situational` — see types/app.types.ts). This
 * keeps the credit-sensitive generation path, Redis cache, rubrics, evaluation
 * and reports untouched while still guaranteeing the trust rule.
 *
 * Stored interview values keep their existing names for backward compatibility:
 *   session_context.interviewMode ∈ 'technical' | 'hr_behavioral' | 'mixed'
 * `normalizeInterviewMode` maps those (and onboarding labels) to InterviewMode.
 */

import type { QuestionCategory } from '@/types/app.types';

export type InterviewMode = 'technical' | 'hr' | 'mixed';

export interface ModeRules {
  allowedCategories: QuestionCategory[];
  blockedCategories: QuestionCategory[];
  interviewerStyle: string;
}

export const MODE_RULES: Record<InterviewMode, ModeRules> = {
  technical: {
    allowedCategories: ['technical'],
    blockedCategories: ['behavioral', 'situational'],
    interviewerStyle: 'technical, analytical, engineering-focused',
  },
  hr: {
    // Situational behavioural prompts ("describe a time…") belong to HR mode.
    allowedCategories: ['behavioral', 'situational'],
    blockedCategories: ['technical'],
    interviewerStyle: 'warm, recruiter-like, conversational',
  },
  mixed: {
    allowedCategories: ['technical', 'behavioral', 'situational'],
    blockedCategories: [],
    interviewerStyle: 'adaptive conversational interviewer',
  },
};

/** Mixed mode target split — ~70% technical, ~30% behavioural/situational. */
export const MIXED_TECHNICAL_RATIO = 0.7;

/**
 * Map any stored / onboarding representation to the canonical InterviewMode.
 * Accepts: 'technical' | 'hr_behavioral' | 'mixed' (stored),
 *          'Technical' | 'HR' | 'Mixed' (onboarding labels),
 *          'hr' (already canonical). Unknown → 'technical' (safest default).
 */
export function normalizeInterviewMode(value: string | null | undefined): InterviewMode {
  switch ((value ?? '').toLowerCase()) {
    case 'hr':
    case 'hr_behavioral':
    case 'behavioral':
      return 'hr';
    case 'mixed':
      return 'mixed';
    case 'technical':
    default:
      return 'technical';
  }
}

/** The single source of truth for "may this category appear in this mode?". */
export function validateQuestionAgainstMode(
  category: string,
  mode: InterviewMode,
): boolean {
  const rules = MODE_RULES[mode];
  if (rules.allowedCategories.length === 0) return true; // mixed: everything allowed
  return (rules.allowedCategories as string[]).includes(category);
}

/**
 * Partition a generated set into mode-valid and mode-violating questions.
 * Callers use this to drop/regenerate violators — wrong-category questions
 * must NEVER reach the candidate.
 */
export function partitionByMode<T extends { category: string }>(
  questions: T[],
  mode: InterviewMode,
): { valid: T[]; violating: T[] } {
  const valid: T[] = [];
  const violating: T[] = [];
  for (const q of questions) {
    (validateQuestionAgainstMode(q.category, mode) ? valid : violating).push(q);
  }
  return { valid, violating };
}

/** Prompt block injected into question generation to bias the model up front. */
export function modeGenerationRules(mode: InterviewMode): string {
  if (mode === 'technical') {
    return (
      `Interview mode: STRICT TECHNICAL. Every question category MUST be "technical" ` +
      `(stack depth, system design, DSA where role-appropriate, debugging, architecture, ` +
      `database, scalability, API design, project deep-dives). ` +
      `ABSOLUTELY NO "behavioral" or "situational" questions. No "tell me about yourself", ` +
      `no teamwork/conflict/motivation/stress questions. Tone: analytical, engineering-focused.`
    );
  }
  if (mode === 'hr') {
    return (
      `Interview mode: STRICT HR / BEHAVIORAL. Every question category MUST be ` +
      `"behavioral" or "situational" (communication, strengths/weaknesses, teamwork, ` +
      `leadership, conflict resolution, pressure handling, career goals, motivation, ` +
      `self-introduction, STAR stories). ABSOLUTELY NO technical implementation, coding, ` +
      `DSA, architecture, or database questions. Tone: warm, recruiter-like, conversational.`
    );
  }
  return (
    `Interview mode: MIXED. Blend roughly 70% "technical" with 30% ` +
    `"behavioral"/"situational" for a realistic full-loop interview. ` +
    `Tone: adaptive conversational interviewer.`
  );
}

/**
 * Constraint appended to the follow-up generator's system prompt so probes
 * never drift out of the locked mode (technical interview → technical probe).
 */
export function modeFollowUpConstraint(mode: InterviewMode): string {
  if (mode === 'technical') {
    return (
      `MODE LOCK — TECHNICAL: your follow-up MUST stay technical (implementation, ` +
      `design, trade-offs, debugging, performance). NEVER ask an HR/behavioral/` +
      `"how do you handle stress"-style question. This is non-negotiable.`
    );
  }
  if (mode === 'hr') {
    return (
      `MODE LOCK — HR/BEHAVIORAL: your follow-up MUST stay behavioral/situational ` +
      `(motivation, teamwork, conflict, communication, ownership). NEVER ask a ` +
      `technical/coding/architecture question. This is non-negotiable.`
    );
  }
  return `MODE: MIXED — a technical or behavioral follow-up are both acceptable.`;
}
