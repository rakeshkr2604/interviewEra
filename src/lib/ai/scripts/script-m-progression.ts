/**
 * SCRIPT_M core-question progression.
 *
 * Contract (SCRIPT_M.md): new cores ALWAYS alternate
 * technical → behavioral → technical → behavioral.
 * Follow-ups do not consume question_number and do not flip that sequence.
 *
 * There is no stored question bank (`question_pool` is "Not available").
 * After the follow-up cap, the next core must still be a new question of the
 * alternate type — never the parent / FU1 / FU2 restated as a core question.
 */

import type { ScriptTurnOutput } from './turn-validator'
import { followUpConflictsWithParentType, questionsAreEquivalent } from './follow-up-guards'

export type ScriptMQuestionType = 'technical' | 'behavioral'

/** SCRIPT_M.md: null → start technical; else flip. */
export function nextScriptMCoreQuestionType(
  last: ScriptMQuestionType | null | undefined,
): ScriptMQuestionType {
  return last === 'technical' ? 'behavioral' : 'technical'
}

export function repeatsAlreadyAskedQuestion(text: string, asked: string[]): boolean {
  return asked.some((q) => questionsAreEquivalent(text, q))
}

/**
 * True when this (wrongly flagged) follow-up can stand in as the next SCRIPT_M
 * core: not an already-asked string, and type/content compatible with the
 * required next core type. Does not overwrite a mismatched question_type.
 */
export function scriptMFollowUpCanBecomeNextCore(opts: {
  questionText: string
  modelQuestionType?: ScriptMQuestionType | null
  nextType: ScriptMQuestionType
  alreadyAsked: string[]
}): boolean {
  if (!opts.questionText.trim()) return false
  if (repeatsAlreadyAskedQuestion(opts.questionText, opts.alreadyAsked)) return false
  if (
    followUpConflictsWithParentType({
      parentQuestionType: opts.nextType,
      modelQuestionType: opts.modelQuestionType ?? null,
      followUpQuestion: opts.questionText,
    })
  ) {
    return false
  }
  const declared = opts.modelQuestionType
  if (declared === 'technical' || declared === 'behavioral') {
    return declared === opts.nextType
  }
  return false
}

/** Planned templates from SCRIPT_M.md — used only when the model re-emits a capped FU. */
const SCRIPT_M_CORE_TEMPLATES: Record<
  ScriptMQuestionType,
  { display_question: string; bridge: string; question_difficulty: 'easy' | 'medium' | 'hard' }[]
> = {
  behavioral: [
    {
      display_question:
        "Tell me about a time you had to deliver something under a tight deadline when you didn't have all the information you needed. What did you do and what was the outcome?",
      bridge: "Let's switch direction a bit. I want to understand the team side of your work.",
      question_difficulty: 'medium',
    },
    {
      display_question:
        'Tell me about a time you disagreed with a classmate, project teammate, or internship mentor. What was the situation, what did you specifically do, and what was the outcome?',
      bridge: "Let's switch direction a bit. I want to understand the team side of your work.",
      question_difficulty: 'medium',
    },
  ],
  technical: [
    {
      display_question:
        'How does a database index actually work internally? And when does adding an index hurt performance rather than help it?',
      bridge: 'Good. Back to the technical side now.',
      question_difficulty: 'medium',
    },
    {
      display_question:
        'Explain the CAP theorem. How would it influence your design choices — which two properties would you prioritize and why?',
      bridge: 'Good. Back to the technical side now.',
      question_difficulty: 'hard',
    },
  ],
}

export function cannedScriptMNextCoreTurn(
  nextType: ScriptMQuestionType,
  alreadyAsked: string[],
  emotion: ScriptTurnOutput['interviewer_emotion'] = 'neutral',
): ScriptTurnOutput {
  const templates = SCRIPT_M_CORE_TEMPLATES[nextType]
  const picked =
    templates.find((t) => !repeatsAlreadyAskedQuestion(t.display_question, alreadyAsked)) ??
    templates[templates.length - 1]!
  const display_question = picked.display_question
  return {
    speech: `${picked.bridge} ${display_question}`,
    display_question,
    tip: null,
    timer_seconds: nextType === 'technical' ? 180 : 150,
    reading_buffer_seconds: 4,
    auto_submit: false,
    allow_skip: true,
    show_auto_structure: true,
    phase: 'core',
    is_question: true,
    is_follow_up: false,
    question_type: nextType,
    question_difficulty: picked.question_difficulty,
    interviewer_emotion: emotion,
  }
}
