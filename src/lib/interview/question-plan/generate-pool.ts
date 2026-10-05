/**
 * One LLM call for a candidate pool larger than the interview's core count.
 * Selection and dedupe happen after this returns. A failed call does not throw
 * into interview start — the caller fills the plan from candidate context.
 */

import { completeInterviewChat } from '@/lib/ai/interview-completion';
import { getTokenBudget } from '@/lib/ai/token-budget';
import { withOperationDeadline } from '@/lib/ai/timeout-policy';
import { parseJsonObject } from '@/lib/ai/response-contract';
import {
  buildScriptResumeSummary,
  clampJobDescriptionForQuestions,
} from '@/lib/interview/question-gen-input';
import { normalizeInterviewMode } from '@/lib/interview/interview-mode';
import type { ParsedResume, QuestionCategory } from '@/types/app.types';
import { findCoreDuplicate } from './duplicate';
import { frequentRecentQuestions } from './novelty';
import { QUESTION_PLAN_POOL_MULTIPLIER, type CoreQuestionType, type PoolQuestion } from './types';
import type { QuestionPlanContext } from './types';

export function questionPlanPoolSize(required: number): number {
  return Math.max(required + 1, required * QUESTION_PLAN_POOL_MULTIPLIER);
}

function asCategory(raw: unknown): QuestionCategory | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  if (value === 'technical' || value === 'tech') return 'technical';
  if (value === 'behavioral' || value === 'behavioural' || value === 'hr') return 'behavioral';
  if (value === 'situational' || value === 'scenario') return 'situational';
  return null;
}

function asType(raw: unknown, category: QuestionCategory): CoreQuestionType {
  if (typeof raw === 'string') {
    const value = raw.trim().toLowerCase();
    if (value === 'technical') return 'technical';
    if (value === 'behavioral' || value === 'behavioural') return 'behavioral';
  }
  return category === 'technical' ? 'technical' : 'behavioral';
}

function asGrounding(raw: unknown): PoolQuestion['groundingKind'] {
  if (typeof raw !== 'string') return 'general';
  const value = raw.trim().toLowerCase();
  if (value === 'project' || value === 'resume' || value === 'jd' || value === 'role') return value;
  return 'general';
}

export function parseQuestionPool(content: string): PoolQuestion[] {
  const parsed = parseJsonObject(content);
  if (!parsed.ok) return [];
  const root = parsed.value;
  if (!root || typeof root !== 'object') return [];
  const list = (root as { questions?: unknown }).questions;
  if (!Array.isArray(list)) return [];
  const out: PoolQuestion[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const questionText =
      typeof row.question_text === 'string'
        ? row.question_text.trim()
        : typeof row.question === 'string'
          ? row.question.trim()
          : '';
    if (!questionText) continue;
    const category = asCategory(row.category) ?? 'technical';
    const reason =
      typeof row.personalization_reason === 'string' ? row.personalization_reason.trim().slice(0, 120) : '';
    out.push({
      questionText,
      category,
      questionType: asType(row.question_type, category),
      groundingKind: asGrounding(row.grounding),
      personalizationReason: reason || asGrounding(row.grounding),
      source: 'llm_plan',
    });
  }
  return out;
}

/** Drop questions a previous attempt already rejected, including paraphrases. */
export function excludeRejectedQuestions(
  questions: readonly PoolQuestion[],
  rejected: readonly string[],
): PoolQuestion[] {
  if (rejected.length === 0) return [...questions];
  return questions.filter((question) => !findCoreDuplicate(question.questionText, rejected).duplicate);
}

export async function generateCandidatePool(opts: {
  required: number;
  role: string;
  difficulty: 'easy' | 'medium' | 'hard';
  interviewMode: string;
  experienceYears: number;
  goal: string;
  scriptType: string;
  parsedResume: ParsedResume | null;
  context: QuestionPlanContext;
  recentQuestions: readonly string[];
  rejected?: readonly string[];
  signal?: AbortSignal;
}): Promise<PoolQuestion[]> {
  const poolSize = questionPlanPoolSize(opts.required);
  const mode = normalizeInterviewMode(opts.interviewMode);
  const summary = opts.parsedResume
    ? buildScriptResumeSummary(opts.parsedResume, opts.role)
    : `Role:${opts.role}. Skills:${opts.context.skills.join(', ') || 'n/a'}. Projects:${opts.context.projects.join('; ') || 'n/a'}`;
  const jd = clampJobDescriptionForQuestions(opts.context.jobDescription);
  const avoid = frequentRecentQuestions(opts.recentQuestions, 8);
  const modeRule =
    mode === 'technical'
      ? 'Every question must be technical.'
      : mode === 'hr'
        ? 'Every question must be behavioral or situational. No technical questions.'
        : 'Alternate technical and behavioral questions, starting with technical.';

  const prompt = [
    `Create ${poolSize} distinct CORE interview questions for one ${opts.role} candidate.`,
    `Difficulty:${opts.difficulty}. Goal:${opts.goal}. Experience years:${opts.experienceYears}. Script:${opts.scriptType}.`,
    `Profile:${summary}`,
    jd ? `JD:${jd}` : 'JD:none',
    modeRule,
    'Ground questions in this candidate\'s projects, skills, or the JD whenever those exist.',
    'Do not emit generic textbook questions such as stack versus heap, how a database index works, or CAP theorem unless the profile is specifically about that topic.',
    'No two questions may assess the same concept.',
    avoid.length > 0
      ? `These generic questions were repeated recently. Prefer a candidate-specific alternative when one exists:\n${avoid.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '',
    'JSON only:{"questions":[{"question_text":"","category":"technical|behavioral|situational","question_type":"technical|behavioral","grounding":"project|resume|jd|role|general","personalization_reason":"short"}]}',
  ]
    .filter(Boolean)
    .join('\n');

  const content = await withOperationDeadline('script_question_plan', async (signal) => {
    const linked = opts.signal ? AbortSignal.any?.([opts.signal, signal]) ?? signal : signal;
    const result = await completeInterviewChat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      maxTokens: getTokenBudget('script_question_plan'),
      operation: 'script_question_plan',
      jsonMode: true,
      signal: linked,
    });
    return result.content;
  });

  return excludeRejectedQuestions(parseQuestionPool(content), opts.rejected ?? []);
}
