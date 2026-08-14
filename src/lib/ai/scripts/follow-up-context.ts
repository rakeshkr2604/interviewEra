/**
 * Compact parent-question + candidate-answer context for v2.1 follow-up decisions.
 *
 * The client auto-advances acknowledgment turns with lastAnswer = interviewer
 * speech. Generation must never treat that ack as the candidate's answer.
 * Recovers the real answer from the parent/last core question row.
 *
 * No extra LLM call. No full transcript. Caps keep token cost bounded.
 */

import { turnIsFollowUp, type ScriptTurnRow } from './turn-authority'

export const SPECIAL_TURN_ANSWERS = ['[NONE]', '[SKIPPED]', '[TIMEOUT]'] as const

export const MAX_PARENT_QUESTION_CHARS = 400
export const MAX_CANDIDATE_ANSWER_CHARS = 1_200

export type ScriptTurnRowWithAnswer = ScriptTurnRow & {
  answer_text?: string | null
}

export type LastAnswerSource = 'candidate_submit' | 'ack_auto_advance' | 'special'

export type FollowUpGenerationContext = {
  /** Value injected as runtime last_answer — never interviewer ack speech. */
  last_answer_for_prompt: string
  last_answer_source: LastAnswerSource
  parent_question: string
  last_candidate_answer: string
  previous_turn_was_acknowledgment: boolean
  has_valid_parent_core_question: boolean
  parent_question_type: 'technical' | 'behavioral' | null
}

function llmRecord(llm_output: unknown): Record<string, unknown> | null {
  if (typeof llm_output !== 'object' || llm_output === null || Array.isArray(llm_output)) {
    return null
  }
  return llm_output as Record<string, unknown>
}

export function isSpecialTurnAnswer(lastAnswer: string): boolean {
  return (SPECIAL_TURN_ANSWERS as readonly string[]).includes(lastAnswer)
}

export function clampFollowUpContextText(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max).trimEnd()}…`
}

export function isUsableCandidateAnswer(text: string | null | undefined): boolean {
  if (typeof text !== 'string') return false
  const t = text.trim()
  if (!t) return false
  if (isSpecialTurnAnswer(t)) return false
  return true
}

export function questionTextFromTurn(turn: ScriptTurnRow): string {
  const rec = llmRecord(turn.llm_output)
  const dq = rec?.display_question
  if (typeof dq === 'string' && dq.trim()) return dq.trim()
  const speech = rec?.speech
  if (typeof speech === 'string' && speech.trim()) return speech.trim()
  return ''
}

export function lastParentCoreQuestion(
  turns: ScriptTurnRow[],
): ScriptTurnRow | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i]
    if (t.is_question && t.phase === 'core' && !turnIsFollowUp(t.llm_output)) {
      return t
    }
  }
  return null
}

export function lastCoreQuestionTurn(
  turns: ScriptTurnRow[],
): ScriptTurnRow | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i]
    if (t.is_question && t.phase === 'core') return t
  }
  return null
}

/** Most recent follow-up asked after the current parent core. Empty if none. */
export function lastFollowUpQuestionSinceParent(turns: ScriptTurnRow[]): string {
  const parent = lastParentCoreQuestion(turns)
  if (!parent) return ''
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i]
    if (t === parent || t.turn_index === parent.turn_index) break
    if (t.is_question && t.phase === 'core' && turnIsFollowUp(t.llm_output)) {
      return questionTextFromTurn(t)
    }
  }
  return ''
}

function parentQuestionTypeFromTurn(
  turn: ScriptTurnRow | null,
  fallback: 'technical' | 'behavioral' | null,
): 'technical' | 'behavioral' | null {
  const qt = llmRecord(turn?.llm_output)?.question_type
  if (qt === 'technical' || qt === 'behavioral') return qt
  return fallback
}

/**
 * Recover the candidate answer the follow-up decision must see.
 *
 * Direct submit (previous turn is the question): lastAnswer is the answer.
 * Ack auto-advance (previous turn is_question=false in core): lastAnswer is
 * interviewer speech — use the last core question's stored answer_text instead.
 */
export function resolveFollowUpGenerationContext(opts: {
  turns: ScriptTurnRowWithAnswer[]
  lastAnswer: string
  requestPhase: string
  lastQuestionType?: 'technical' | 'behavioral' | null
}): FollowUpGenerationContext {
  const { turns, lastAnswer, requestPhase } = opts
  const prev = turns[turns.length - 1] ?? null
  const previous_turn_was_acknowledgment = Boolean(
    prev && !prev.is_question && prev.phase === 'core',
  )

  const parent = lastParentCoreQuestion(turns)
  const lastQuestion = lastCoreQuestionTurn(turns)
  const parent_question = parent
    ? clampFollowUpContextText(questionTextFromTurn(parent), MAX_PARENT_QUESTION_CHARS)
    : ''
  const parent_question_type = parentQuestionTypeFromTurn(
    parent,
    opts.lastQuestionType ?? null,
  )

  if (isSpecialTurnAnswer(lastAnswer)) {
    return {
      last_answer_for_prompt: lastAnswer,
      last_answer_source: 'special',
      parent_question,
      last_candidate_answer: lastAnswer,
      previous_turn_was_acknowledgment,
      has_valid_parent_core_question: false,
      parent_question_type,
    }
  }

  let last_candidate_answer = lastAnswer.trim()
  let last_answer_source: LastAnswerSource = 'candidate_submit'

  if (previous_turn_was_acknowledgment) {
    last_answer_source = 'ack_auto_advance'
    const stored = lastQuestion?.answer_text ?? null
    if (isUsableCandidateAnswer(stored)) {
      last_candidate_answer = stored!.trim()
    } else {
      const ackSpeech = llmRecord(prev?.llm_output)?.speech
      const lastAnswerIsAck =
        typeof ackSpeech === 'string' && lastAnswer.trim() === ackSpeech.trim()
      last_candidate_answer = lastAnswerIsAck ? '' : lastAnswer.trim()
    }
  }

  const has_valid_parent_core_question =
    requestPhase === 'core' &&
    parent != null &&
    isUsableCandidateAnswer(last_candidate_answer)

  const recovered = clampFollowUpContextText(
    last_candidate_answer,
    MAX_CANDIDATE_ANSWER_CHARS,
  )

  return {
    last_answer_for_prompt: recovered,
    last_answer_source,
    parent_question,
    last_candidate_answer: recovered,
    previous_turn_was_acknowledgment,
    has_valid_parent_core_question,
    parent_question_type,
  }
}
