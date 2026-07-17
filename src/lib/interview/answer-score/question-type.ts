/**
 * Question-type resolution for score-v1 structure routing.
 *
 * Priority order (deterministic first, LLM last):
 *   1. `script_turns.question_type` — tagged at question-generation time
 *      (SCRIPT_M emits it per turn; turn route now also derives it for H/T).
 *      → type_source 'tagged'
 *   2. Script identity — SCRIPT_H is behavioral-only, SCRIPT_T technical-only,
 *      so the script itself is an authoritative tag. → 'script_derived'
 *   3. Legacy untagged SCRIPT_M turn — single cheap classifier call, capped at
 *      CLASSIFIER_TIMEOUT_MS so it can never eat the scoring deadline.
 *      → 'inferred'
 *   4. Classifier failed/timed out — proceed immediately with 'technical'
 *      (logical_flow is the safer generic reasoning rubric; STAR scored
 *      against a non-behavioral answer produces misleading lows).
 *      → 'fallback_default'
 */

import { completeInterviewChat } from '@/lib/ai/interview-completion';
import type { ScriptType } from '@/lib/ai/scripts/script-loader';
import type { QuestionType, QuestionTypeSource } from './rubric';

export const CLASSIFIER_TIMEOUT_MS = 3_500;

export type ResolvedQuestionType = {
  questionType: QuestionType;
  typeSource: QuestionTypeSource;
};

export function questionTypeFromScript(scriptType: ScriptType): QuestionType | null {
  if (scriptType === 'SCRIPT_H') return 'behavioral';
  if (scriptType === 'SCRIPT_T') return 'technical';
  return null; // SCRIPT_M mixes both — needs the per-turn tag
}

const CLASSIFIER_SYSTEM = `Classify one interview question as "behavioral" (asks for a past experience, situation, teamwork, conflict, motivation) or "technical" (asks for a concept, definition, approach, trade-off, system/case reasoning). Output ONLY JSON: {"question_type":"behavioral"} or {"question_type":"technical"}.`;

/** Single fallback classifier call for legacy untagged turns. Throws on failure. */
async function classifyQuestion(question: string): Promise<QuestionType> {
  const completion = await completeInterviewChat({
    messages: [
      { role: 'system', content: CLASSIFIER_SYSTEM },
      { role: 'user', content: question.slice(0, 600) },
    ],
    temperature: 0,
    maxTokens: 20,
    operation: 'answer_score',
    jsonMode: true,
    signal: AbortSignal.timeout(CLASSIFIER_TIMEOUT_MS),
  });
  const match = completion.content.match(/behavioral|technical/i);
  if (!match) throw new Error('classifier returned no recognizable type');
  return match[0].toLowerCase() as QuestionType;
}

export async function resolveQuestionType(args: {
  taggedType: QuestionType | null;
  scriptType: ScriptType;
  question: string;
}): Promise<ResolvedQuestionType> {
  if (args.taggedType) {
    return { questionType: args.taggedType, typeSource: 'tagged' };
  }

  const fromScript = questionTypeFromScript(args.scriptType);
  if (fromScript) {
    return { questionType: fromScript, typeSource: 'script_derived' };
  }

  try {
    const inferred = await classifyQuestion(args.question);
    return { questionType: inferred, typeSource: 'inferred' };
  } catch (err) {
    console.warn(
      `[answer-score] question-type classifier failed — falling back to technical/logical_flow:`,
      err instanceof Error ? err.message : err,
    );
    return { questionType: 'technical', typeSource: 'fallback_default' };
  }
}
