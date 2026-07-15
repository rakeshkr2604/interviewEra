import { ScriptType } from './script-loader'

export class TurnValidationError extends Error {
  constructor(
    public field: string,
    public received: unknown,
    message: string
  ) {
    super(message)
    this.name = 'TurnValidationError'
  }
}

const VALID_PHASES = ['warmup', 'self_intro', 'core', 'candidate_questions', 'closing'] as const
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const
const VALID_EMOTIONS = ['neutral', 'warm', 'curious', 'challenging'] as const
const VALID_QUESTION_TYPES = ['technical', 'behavioral'] as const

export type ScriptTurnOutput = {
  speech: string
  display_question: string | null
  tip: string | null
  timer_seconds: number
  reading_buffer_seconds: number
  auto_submit: boolean
  allow_skip: boolean
  show_auto_structure: boolean
  phase: (typeof VALID_PHASES)[number]
  is_question: boolean
  question_difficulty: (typeof VALID_DIFFICULTIES)[number] | null
  interviewer_emotion: (typeof VALID_EMOTIONS)[number]
  question_type?: (typeof VALID_QUESTION_TYPES)[number] | null // SCRIPT_M only
}

function fail(field: string, received: unknown, expectation: string): never {
  throw new TurnValidationError(
    field,
    received,
    `[turn-validator] Field "${field}" ${expectation} (received: ${JSON.stringify(received)})`
  )
}

function requireString(obj: Record<string, unknown>, field: string): string {
  const value = obj[field]
  if (typeof value !== 'string') fail(field, value, 'must be a string')
  return value
}

function requireStringOrNull(obj: Record<string, unknown>, field: string): string | null {
  const value = obj[field]
  if (value !== null && typeof value !== 'string') fail(field, value, 'must be a string or null')
  return value as string | null
}

function requireNumber(obj: Record<string, unknown>, field: string): number {
  const value = obj[field]
  if (typeof value !== 'number' || Number.isNaN(value)) fail(field, value, 'must be a number')
  return value
}

function requireBoolean(obj: Record<string, unknown>, field: string): boolean {
  const value = obj[field]
  if (typeof value !== 'boolean') fail(field, value, 'must be a boolean')
  return value
}

export function validateTurnOutput(raw: unknown, scriptType: ScriptType): ScriptTurnOutput {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    fail('(root)', raw, 'must be a JSON object')
  }
  const obj = raw as Record<string, unknown>

  const speech = requireString(obj, 'speech')
  const display_question = requireStringOrNull(obj, 'display_question')
  const tip = requireStringOrNull(obj, 'tip')
  const timer_seconds = requireNumber(obj, 'timer_seconds')
  const reading_buffer_seconds = requireNumber(obj, 'reading_buffer_seconds')
  const auto_submit = requireBoolean(obj, 'auto_submit')
  const allow_skip = requireBoolean(obj, 'allow_skip')
  const show_auto_structure = requireBoolean(obj, 'show_auto_structure')
  const is_question = requireBoolean(obj, 'is_question')

  const phase = obj['phase']
  if (typeof phase !== 'string' || !(VALID_PHASES as readonly string[]).includes(phase)) {
    fail('phase', phase, `must be one of ${VALID_PHASES.join(' | ')}`)
  }

  const question_difficulty = obj['question_difficulty'] ?? null
  if (
    question_difficulty !== null &&
    (typeof question_difficulty !== 'string' ||
      !(VALID_DIFFICULTIES as readonly string[]).includes(question_difficulty))
  ) {
    fail('question_difficulty', question_difficulty, `must be one of ${VALID_DIFFICULTIES.join(' | ')} or null`)
  }

  const interviewer_emotion = obj['interviewer_emotion']
  if (
    typeof interviewer_emotion !== 'string' ||
    !(VALID_EMOTIONS as readonly string[]).includes(interviewer_emotion)
  ) {
    fail('interviewer_emotion', interviewer_emotion, `must be one of ${VALID_EMOTIONS.join(' | ')}`)
  }

  if (timer_seconds < 0) {
    fail('timer_seconds', timer_seconds, 'must be >= 0')
  }
  if (reading_buffer_seconds < 0 || reading_buffer_seconds > 5) {
    fail('reading_buffer_seconds', reading_buffer_seconds, 'must be between 0 and 5')
  }
  if (!is_question && timer_seconds !== 0) {
    fail('timer_seconds', timer_seconds, 'must be 0 when is_question is false')
  }
  if (!is_question && reading_buffer_seconds !== 0) {
    fail('reading_buffer_seconds', reading_buffer_seconds, 'must be 0 when is_question is false')
  }

  // question_type: validated only for SCRIPT_M; warn if it leaks into other scripts.
  const rawQuestionType = obj['question_type']
  let question_type: ScriptTurnOutput['question_type']
  if (scriptType === 'SCRIPT_M') {
    // Treat missing/undefined as null — LLM omits question_type on closing/transition turns.
    const qt = rawQuestionType ?? null
    if (qt !== null && (typeof qt !== 'string' || !(VALID_QUESTION_TYPES as readonly string[]).includes(qt))) {
      fail('question_type', qt, `must be one of ${VALID_QUESTION_TYPES.join(' | ')} or null`)
    }
    question_type = qt as ScriptTurnOutput['question_type']
  } else if (rawQuestionType !== undefined) {
    console.warn(
      `[turn-validator] question_type present in ${scriptType} output but is a SCRIPT_M-only field (received: ${JSON.stringify(rawQuestionType)})`
    )
  }

  const wordCount = speech.trim().split(/\s+/).filter(Boolean).length
  if (wordCount > 35) {
    console.warn(`[turn-validator] speech exceeds 35 words (${wordCount} words): "${speech}"`)
  }
  if (!is_question && display_question !== null) {
    console.warn(
      `[turn-validator] display_question should be null when is_question is false (received: ${JSON.stringify(display_question)})`
    )
  }

  const result: ScriptTurnOutput = {
    speech,
    display_question,
    tip,
    timer_seconds,
    reading_buffer_seconds,
    auto_submit,
    allow_skip,
    show_auto_structure,
    phase: phase as ScriptTurnOutput['phase'],
    is_question,
    question_difficulty: question_difficulty as ScriptTurnOutput['question_difficulty'],
    interviewer_emotion: interviewer_emotion as ScriptTurnOutput['interviewer_emotion'],
  }
  if (question_type !== undefined) {
    result.question_type = question_type
  }
  return result
}
