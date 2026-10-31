import type { ScriptTurnOutput } from './turn-validator'
import { canonicalizeTurnSpeech } from './speech-display-question'
import {
  followUpAbandonsParentTopic,
  followUpConflictsWithParentType,
  isAnaphoricFollowUpProbe,
  scriptMFollowUpIsDuplicateOf,
  speechContainsQuestionMark,
} from './follow-up-guards'
import { findCoreDuplicate } from '@/lib/interview/question-plan/duplicate'
import {
  cannedScriptMNextCoreTurn,
  nextScriptMCoreQuestionType,
  repeatsAlreadyAskedQuestion,
  scriptMFollowUpCanBecomeNextCore,
} from './script-m-progression'
import type { ScriptType } from './script-loader'
import {
  MAX_QUESTION_ECHO_RECOVERIES,
  stripUnjustifiedPraisePrefix,
  type AnswerQualityResult,
} from '@/lib/interview/answer-quality'

export type Difficulty = 'easy' | 'medium' | 'hard'

/** Hard ceiling on total script_turns rows per interview (cost / runaway guard). */
export const TURN_CAP: Record<Difficulty, number> = {
  easy: 15,
  medium: 20,
  hard: 25,
}

/** Exactly one initial candidate-question invitation. */
export const MAX_CANDIDATE_QUESTION_EXCHANGES = 1

/** At most two genuinely useful CQ clarifications; this is not a quota. */
export const MAX_CANDIDATE_QUESTION_FOLLOW_UPS = 2

export type ScriptTurnRow = {
  turn_index: number
  phase: string
  is_question: boolean
  llm_output: unknown
  /** Present when loaded from script_turns for follow-up context recovery. */
  answer_text?: string | null
}

function llmOutputRecord(llm_output: unknown): Record<string, unknown> | null {
  if (typeof llm_output !== 'object' || llm_output === null || Array.isArray(llm_output)) {
    return null
  }
  return llm_output as Record<string, unknown>
}

/** Legacy turns without `is_follow_up` count as non-follow-ups. */
export function turnIsFollowUp(llm_output: unknown): boolean {
  return llmOutputRecord(llm_output)?.is_follow_up === true
}

export type CandidateQuestionAction =
  | 'invite'
  | 'guidance'
  | 'answer'
  | 'follow_up'

export function candidateQuestionAction(
  llm_output: unknown,
): CandidateQuestionAction | null {
  const action = llmOutputRecord(llm_output)?.candidate_question_action
  return action === 'invite' ||
    action === 'guidance' ||
    action === 'answer' ||
    action === 'follow_up'
    ? action
    : null
}

/**
 * Real core questions: is_question + phase=core + not a follow-up.
 * Follow-ups do not consume the question budget.
 */
export function countCoreQuestions(turns: ScriptTurnRow[]): number {
  return turns.filter(
    (t) => t.is_question && t.phase === 'core' && !turnIsFollowUp(t.llm_output),
  ).length
}

/**
 * Follow-ups asked since the most recent non-follow-up core question.
 * If no parent core question exists yet, returns 0.
 */
export function countFollowUpsSinceLastCoreQuestion(turns: ScriptTurnRow[]): number {
  let lastCoreIndex = -1
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i]
    if (t.is_question && t.phase === 'core' && !turnIsFollowUp(t.llm_output)) {
      lastCoreIndex = i
      break
    }
  }
  if (lastCoreIndex < 0) return 0

  let count = 0
  for (let i = lastCoreIndex + 1; i < turns.length; i++) {
    const t = turns[i]
    if (t.is_question && t.phase === 'core' && turnIsFollowUp(t.llm_output)) {
      count += 1
    }
  }
  return count
}

/**
 * Warmup invites (is_question=true). After 1, force leave warmup.
 * Product contract: warmup is exactly ONE conversational interaction —
 * greeting → candidate reply → self_intro (or core entry). The scripted
 * "Ready?" second invite is not generated; without this cap the model loops
 * once the client stopped independently advancing phase (Phase 1).
 */
export const MAX_WARMUP_QUESTIONS = 1

/**
 * Self-intro invites (is_question=true). Scripts define exactly one ask + one
 * optional bridge (is_question=false). Without a cap the model loops here the
 * same way it did in warmup.
 */
export const MAX_SELF_INTRO_QUESTIONS = 1

/** Max turns that may remain in self_intro (1 question + 1 bridge). */
export const MAX_SELF_INTRO_TURNS = 2

/** Monotonic phase order — never allow the LLM to move backward. */
export const PHASE_ORDER = [
  'warmup',
  'self_intro',
  'core',
  'candidate_questions',
  'closing',
] as const

export type ScriptPhase = (typeof PHASE_ORDER)[number]

export function phaseRank(phase: string): number {
  const idx = (PHASE_ORDER as readonly string[]).indexOf(phase)
  return idx >= 0 ? idx : 0
}

export function countWarmupQuestions(turns: ScriptTurnRow[]): number {
  return turns.filter((t) => t.phase === 'warmup' && t.is_question).length
}

/** All warmup rows (questions + acks) — guards ack-only warmup loops. */
export function countWarmupTurns(turns: ScriptTurnRow[]): number {
  return turns.filter((t) => t.phase === 'warmup').length
}

export function countSelfIntroQuestions(turns: ScriptTurnRow[]): number {
  return turns.filter((t) => t.phase === 'self_intro' && t.is_question).length
}

export function countSelfIntroTurns(turns: ScriptTurnRow[]): number {
  return turns.filter((t) => t.phase === 'self_intro').length
}

export function lastTurnWasSelfIntroBridge(turns: ScriptTurnRow[]): boolean {
  const last = turns[turns.length - 1]
  return Boolean(last && last.phase === 'self_intro' && !last.is_question)
}

/**
 * Candidate-questions invites already issued
 * (phase=candidate_questions + is_question=true).
 */
export function countCandidateQuestionsExchanges(turns: ScriptTurnRow[]): number {
  return turns.filter((t) => {
    if (t.phase !== 'candidate_questions') return false
    const action = candidateQuestionAction(t.llm_output)
    // Legacy persisted CQ invites predate candidate_question_action.
    return action === 'invite' || (action === null && t.is_question)
  }).length
}

export function countCandidateQuestionGuidanceTurns(turns: ScriptTurnRow[]): number {
  return turns.filter(
    (t) =>
      t.phase === 'candidate_questions' &&
      candidateQuestionAction(t.llm_output) === 'guidance',
  ).length
}

export function countCandidateQuestionFollowUps(turns: ScriptTurnRow[]): number {
  return turns.filter(
    (t) =>
      t.phase === 'candidate_questions' &&
      candidateQuestionAction(t.llm_output) === 'follow_up' &&
      t.is_question,
  ).length
}

/** True when the most recent turn was a CQ interviewer answer/bridge (not an invite). */
export function lastTurnWasCandidateQuestionsAnswer(turns: ScriptTurnRow[]): boolean {
  const last = turns[turns.length - 1]
  if (!last || last.phase !== 'candidate_questions') return false
  const action = candidateQuestionAction(last.llm_output)
  return action === 'answer' || (action === null && !last.is_question)
}

export function lastCandidateQuestionAction(
  turns: ScriptTurnRow[],
): CandidateQuestionAction | null {
  const last = turns[turns.length - 1]
  if (!last || last.phase !== 'candidate_questions') return null
  return candidateQuestionAction(last.llm_output)
}

/** Last N acknowledgment speeches (is_question=false, phase=core), most-recent-first. */
export function recentAcknowledgments(turns: ScriptTurnRow[], limit = 3): string[] {
  const acks: string[] = []
  for (let i = turns.length - 1; i >= 0 && acks.length < limit; i--) {
    const t = turns[i]
    if (t.is_question || t.phase !== 'core') continue
    const speech = llmOutputRecord(t.llm_output)?.speech
    if (typeof speech === 'string' && speech.trim().length > 0) {
      acks.push(speech.trim())
    }
  }
  return acks
}

export function resolveTurnCap(difficulty: string): number {
  if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') {
    return TURN_CAP[difficulty]
  }
  return TURN_CAP.medium
}

/**
 * Runaway turn-cap exhaustion: never skip candidate_questions when cores
 * are done. Remaining cores (true runaway) still close.
 */
export function resolveTurnCapExhaustion(opts: {
  coreQuestionsAsked: number
  totalQuestions: number
  candidateQuestionsExchanges: number
}): 'candidate_questions' | 'closing' {
  if (
    opts.coreQuestionsAsked >= opts.totalQuestions &&
    opts.candidateQuestionsExchanges === 0
  ) {
    return 'candidate_questions'
  }
  return 'closing'
}

/** Trailing filler that carries no decline meaning ("... right now", "... thanks"). */
const DECLINE_TRAILING_FILLER =
  /\s+(right now|for now|at the moment|at this time|as of now|currently|now|today|thanks|thank you|please)$/

/** Leading refusal token; may stand alone or precede a decline body. */
const DECLINE_LEAD = /^(no|nope|nah|not really|nothing|none)\b[\s,]*/

/**
 * Decline bodies after the optional lead. Anchored so a real question that
 * merely starts with "no" (e.g. "no wait, what is the stack?") is not matched.
 */
const DECLINE_BODIES: readonly RegExp[] = [
  /^(thanks|thank you)$/,
  /^i (do not|dont|don't) have (any ?)?(thing|questions?|queries|query)?( to ask| for you| for me)?$/,
  /^i have no (questions?|queries)$/,
  /^(no )?questions?( (for|from) (you|me|my side))?$/,
  /^nothing( (from (me|my side|my end)|to ask|else))?$/,
  /^from (me|my side|my end)$/,
  /^(to ask|else)$/,
  /^i('m| am)? (good|fine|all set|okay|ok|done)$/,
  /^all (good|set)$/,
  /^that('s| is) (all|it|fine|okay|ok)$/,
  /^((let's|lets|we can) )?(finish|wrap up)$/,
  /^i('d| would) like to (finish|wrap up)$/,
  /^please (finish|wrap up)$/,
]

/**
 * True when the candidate declined to ask questions (skip / timeout / "no").
 *
 * Real speech puts the refusal and the reason in one utterance
 * ("No, I don't have any questions right now"), so a flat whole-string
 * alternation misses the most common phrasing. Normalize, drop the trailing
 * time qualifier, strip the optional lead, then match the remaining body.
 */
export function isNoQuestionsAnswer(lastAnswer: string): boolean {
  if (lastAnswer === '[SKIPPED]' || lastAnswer === '[TIMEOUT]') return true

  let text = lastAnswer
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length === 0) return true
  if (text.length > 80) return false

  let stripped = text.replace(DECLINE_TRAILING_FILLER, '')
  while (stripped !== text) {
    text = stripped
    stripped = text.replace(DECLINE_TRAILING_FILLER, '')
  }
  if (text.length === 0) return true

  const hadLead = DECLINE_LEAD.test(text)
  const body = hadLead ? text.replace(DECLINE_LEAD, '').trim() : text
  if (hadLead && body.length === 0) return true

  return DECLINE_BODIES.some((pattern) => pattern.test(body))
}

/** Deterministic candidate_questions transition (no extra LLM call). */
export function cannedCandidateQuestionsTurn(
  emotion: ScriptTurnOutput['interviewer_emotion'] = 'neutral',
): ScriptTurnOutput {
  const display_question = 'Do you have any questions for me?'
  return {
    speech: `That covers what I wanted to go through. ${display_question}`,
    display_question,
    tip: null,
    timer_seconds: 60,
    reading_buffer_seconds: 3,
    auto_submit: true,
    allow_skip: true,
    show_auto_structure: false,
    phase: 'candidate_questions',
    is_question: true,
    is_follow_up: false,
    candidate_question_action: 'invite',
    question_difficulty: null,
    interviewer_emotion: emotion,
  }
}

export function cannedClosingTurn(
  emotion: ScriptTurnOutput['interviewer_emotion'] = 'neutral',
): ScriptTurnOutput {
  return {
    speech:
      'Thanks for your time today. It was great speaking with you. Good luck with your interviews!',
    display_question: null,
    tip: null,
    timer_seconds: 0,
    reading_buffer_seconds: 0,
    auto_submit: false,
    allow_skip: false,
    show_auto_structure: false,
    phase: 'closing',
    is_question: false,
    is_follow_up: false,
    question_difficulty: null,
    interviewer_emotion: emotion,
  }
}

/** Graceful fallback when the CQ model tries to close without answering. */
export function cannedCandidateQuestionAnswerTurn(
  emotion: ScriptTurnOutput['interviewer_emotion'] = 'neutral',
): ScriptTurnOutput {
  return {
    speech:
      'I can only answer from the context available in this practice interview. In a real interview, the team can give you the most accurate details about that.',
    display_question: null,
    tip: null,
    timer_seconds: 0,
    reading_buffer_seconds: 0,
    auto_submit: false,
    allow_skip: false,
    show_auto_structure: false,
    phase: 'candidate_questions',
    is_question: false,
    is_follow_up: false,
    candidate_question_action: 'answer',
    question_difficulty: null,
    interviewer_emotion: emotion,
  }
}

/** Deterministic entry into core after warmup/self_intro exit (no extra LLM call). */
export function cannedCoreEntryTurn(
  emotion: ScriptTurnOutput['interviewer_emotion'] = 'neutral',
): ScriptTurnOutput {
  return {
    speech: "Alright — let's dig into the interview questions.",
    display_question: null,
    tip: null,
    timer_seconds: 0,
    reading_buffer_seconds: 0,
    auto_submit: false,
    allow_skip: false,
    show_auto_structure: false,
    phase: 'core',
    is_question: false,
    is_follow_up: false,
    question_difficulty: null,
    interviewer_emotion: emotion,
  }
}

/**
 * Cap fallback: do not promote the rejected follow-up into a new core
 * question. Client auto-advances; next /turn generates the next planned
 * question. Recovers candidate answer via follow-up-context.
 */
export function cannedMoveOnTurn(
  emotion: ScriptTurnOutput['interviewer_emotion'] = 'neutral',
): ScriptTurnOutput {
  return {
    speech: "Thanks. Let's keep going.",
    display_question: null,
    tip: null,
    timer_seconds: 0,
    reading_buffer_seconds: 0,
    auto_submit: false,
    allow_skip: false,
    show_auto_structure: false,
    phase: 'core',
    is_question: false,
    is_follow_up: false,
    question_difficulty: null,
    interviewer_emotion: emotion,
  }
}

const MOVE_ON_SPEECH = cannedMoveOnTurn().speech

/**
 * Score-authoritative fallback when the model fails to emit an owed probe.
 * This must itself be an answerable question. The old acknowledgment bridge
 * required another LLM turn and could chain into the client's consecutive
 * non-question recovery error.
 */
export function cannedRequiredFollowUpTurn(opts: {
  questionType: 'technical' | 'behavioral'
  emotion?: ScriptTurnOutput['interviewer_emotion']
}): ScriptTurnOutput {
  const display_question =
    opts.questionType === 'technical'
      ? 'Can you go deeper into how you approached that, including the key technical decision or trade-off?'
      : 'Can you go deeper into what you personally did and what outcome it led to?'
  return {
    speech: `Before we move on, ${display_question}`,
    display_question,
    tip: null,
    timer_seconds: 90,
    reading_buffer_seconds: 3,
    auto_submit: false,
    allow_skip: true,
    show_auto_structure: true,
    phase: 'core',
    is_question: true,
    is_follow_up: true,
    question_type: opts.questionType,
    question_difficulty: 'medium',
    interviewer_emotion: opts.emotion ?? 'neutral',
  }
}

/**
 * Re-ask the same parent after the candidate echoed the question.
 * is_follow_up true so it does not consume a new core slot; speech ends with
 * the exact display_question (canonicalization invariant).
 */
export function cannedQuestionEchoRecoveryTurn(
  parentQuestion: string,
  emotion: ScriptTurnOutput['interviewer_emotion'] = 'neutral',
): ScriptTurnOutput {
  const q = parentQuestion.trim() || 'Can you answer the question I asked?'
  return {
    speech: `You repeated the question rather than answering it. Could you explain what you understand about it, or say if you're unsure? ${q}`,
    display_question: q,
    tip: null,
    timer_seconds: 90,
    reading_buffer_seconds: 3,
    auto_submit: false,
    allow_skip: true,
    show_auto_structure: true,
    phase: 'core',
    is_question: true,
    is_follow_up: true,
    question_difficulty: null,
    interviewer_emotion: emotion,
  }
}

/** Neutral redirect when the answer is clearly off-topic. */
export function cannedIrrelevantRedirectTurn(
  parentQuestion: string,
  emotion: ScriptTurnOutput['interviewer_emotion'] = 'neutral',
): ScriptTurnOutput {
  const q = parentQuestion.trim() || 'Can you answer the question I asked?'
  return {
    speech: `Let's stay with the question I asked. ${q}`,
    display_question: q,
    tip: null,
    timer_seconds: 90,
    reading_buffer_seconds: 3,
    auto_submit: false,
    allow_skip: true,
    show_auto_structure: true,
    phase: 'core',
    is_question: true,
    is_follow_up: true,
    question_difficulty: null,
    interviewer_emotion: emotion,
  }
}

/**
 * Answerable next-core fallback when a second consecutive core
 * acknowledgment would otherwise persist. SCRIPT_M keeps alternation;
 * H/T use a single unused template of the script's type.
 */
export function cannedNextCoreQuestionTurn(opts: {
  scriptType?: ScriptType
  lastQuestionType?: 'technical' | 'behavioral' | null
  parentQuestionType?: 'technical' | 'behavioral' | null
  alreadyAsked: string[]
  emotion?: ScriptTurnOutput['interviewer_emotion']
}): ScriptTurnOutput {
  if (opts.scriptType === 'SCRIPT_M') {
    const nextType = nextScriptMCoreQuestionType(
      opts.lastQuestionType ?? opts.parentQuestionType,
    )
    // Returning cannedMoveOnTurn when all SCRIPT_M templates are exhausted
    // would cause the consecutive-ack guard to loop indefinitely. Enter
    // candidate_questions instead — it is always a valid escape hatch.
    return (
      cannedScriptMNextCoreTurn(nextType, opts.alreadyAsked, opts.emotion) ??
      cannedCandidateQuestionsTurn(opts.emotion)
    )
  }

  const technical = opts.scriptType === 'SCRIPT_T'
  const display_question = technical
    ? 'Walk me through how you would approach this problem end to end, including the main trade-off you would make.'
    : 'Tell me about a time you faced a setback or disagreement at work or in a project. What did you do, and what was the outcome?'
  if (findCoreDuplicate(display_question, opts.alreadyAsked).duplicate) {
    // Same reason: returning an ack here would cause an infinite ack loop via
    // the consecutive-ack guard. Use the CQ invitation as a safe exit.
    return cannedCandidateQuestionsTurn(opts.emotion)
  }
  return {
    speech: `Let's keep going. ${display_question}`,
    display_question,
    tip: null,
    timer_seconds: technical ? 180 : 150,
    reading_buffer_seconds: 4,
    auto_submit: false,
    allow_skip: true,
    show_auto_structure: true,
    phase: 'core',
    is_question: true,
    is_follow_up: false,
    question_type: technical ? 'technical' : 'behavioral',
    question_difficulty: 'medium',
    interviewer_emotion: opts.emotion ?? 'neutral',
  }
}

/** Deterministic self_intro invite used by every warmup exit. */
export function cannedSelfIntroTurn(
  emotion: ScriptTurnOutput['interviewer_emotion'] = 'neutral',
): ScriptTurnOutput {
  const display_question = 'Walk me through your background relevant to this role.'
  return {
    speech: `Quick background first — ${display_question}`,
    display_question,
    tip: null,
    timer_seconds: 120,
    reading_buffer_seconds: 4,
    auto_submit: false,
    allow_skip: false,
    show_auto_structure: true,
    phase: 'self_intro',
    is_question: true,
    is_follow_up: false,
    question_difficulty: 'easy',
    interviewer_emotion: emotion,
  }
}

const NO_ANSWER_VALUES = new Set(['[SKIPPED]', '[TIMEOUT]', '[NONE]'])

/**
 * Whether a same-topic probe is *mandatory* for this turn.
 *
 * The cap of 2 bounds how many probes may happen; the score decides whether
 * one must. `answer_probe_needed === false` already blocks a follow-up, but
 * `true` was only ever permissive — the model could still move on from a weak
 * answer, which reads as an arbitrary quota rather than an adaptive rule.
 *
 * `unknown` (missing/failed score) stays permissive and defers to the LLM.
 */
export function probeIsRequired(opts: {
  requestPhase: string
  followUpEnabled: boolean
  followUpsThisQuestion: number
  maxFollowUpsPerQuestion?: number
  hasValidParentCoreQuestion?: boolean
  answerProbeNeeded?: boolean | 'unknown'
  lastAnswer: string
  /**
   * When the candidate echoed / needs recovery, do not force a content probe
   * that treats the echo as a weak substantive answer.
   */
  answerQuality?: AnswerQualityResult | null
}): boolean {
  if (opts.requestPhase !== 'core') return false
  if (!opts.followUpEnabled) return false
  if (opts.answerProbeNeeded !== true) return false
  if (opts.hasValidParentCoreQuestion !== true) return false
  if (NO_ANSWER_VALUES.has(opts.lastAnswer.trim())) return false
  if (
    opts.answerQuality?.kind === 'question_echo' ||
    opts.answerQuality?.kind === 'clarification_request' ||
    opts.answerQuality?.kind === 'irrelevant'
  ) {
    return false
  }
  const max = opts.maxFollowUpsPerQuestion ?? 2
  return opts.followUpsThisQuestion < max
}

/**
 * Off-topic / type-mismatch fallback: stay on the parent question as a
 * same-topic follow-up (no extra LLM call, no ack auto-advance loop).
 * Do not use for Adaptive OFF or SCRIPT_M hijack/duplicate — that restates
 * the parent as a follow-up and consumes a FU slot.
 */
export function cannedParentRedirectTurn(
  parentQuestion: string,
  emotion: ScriptTurnOutput['interviewer_emotion'] = 'neutral',
): ScriptTurnOutput {
  const q = parentQuestion.trim() || 'Can you answer the question I asked?'
  return {
    speech: `Let's come back to what I asked. ${q}`,
    display_question: q,
    tip: null,
    timer_seconds: 90,
    reading_buffer_seconds: 3,
    auto_submit: false,
    allow_skip: false,
    show_auto_structure: true,
    phase: 'core',
    is_question: true,
    is_follow_up: true,
    question_difficulty: null,
    interviewer_emotion: emotion,
  }
}

/**
 * Server authority: clamp follow-ups, force core → candidate_questions when the
 * question budget is spent, force candidate_questions → closing when the
 * CQ exchange cap is hit (or the candidate declines to ask), force
 * warmup/self_intro exits, reject phase regressions, and canonicalize
 * speech to optional-bridge + exact display_question (H/T/M).
 */
export function applyTurnAuthorityOverrides(opts: {
  turn: ScriptTurnOutput
  coreQuestionsAsked: number
  totalQuestions: number
  followUpsThisQuestion: number
  followUpEnabled: boolean
  candidateQuestionsExchanges: number
  maxCandidateQuestionsExchanges?: number
  candidateQuestionFollowUps?: number
  maxCandidateQuestionFollowUps?: number
  /** Client phase for the request that produced this turn. */
  requestPhase: string
  lastAnswer: string
  /**
   * True when a prior core question exists and a real candidate answer is
   * available for a follow-up decision. Undefined keeps prior test behavior
   * (does not strip follow-ups for missing parent).
   */
  hasValidParentCoreQuestion?: boolean
  /** SCRIPT_M: copy onto a follow-up when the model omits question_type. */
  parentQuestionType?: 'technical' | 'behavioral' | null
  parentQuestion?: string
  lastCandidateAnswer?: string
  lastFollowUpQuestion?: string
  alreadyAskedQuestions?: string[]
  /** SCRIPT_M: last persisted non-follow-up core type (alternation). */
  lastQuestionType?: 'technical' | 'behavioral' | null
  scriptType?: ScriptType
  warmupQuestionsAsked?: number
  warmupTurns?: number
  selfIntroEnabled?: boolean
  selfIntroQuestionsAsked?: number
  selfIntroTurns?: number
  /**
   * Score-derived probe gate. false → reject is_follow_up (move on / CQ).
   * true | unknown | undefined → existing LLM + cap behavior.
   */
  answerProbeNeeded?: boolean | 'unknown'
  /** True when the previous persisted core turn had is_question=false. */
  previousTurnWasAcknowledgment?: boolean
  /**
   * Session skip budget *after* applying the current lastAnswer.
   * When skipsUsed >= maxSkips, force allow_skip false (LLM may lag).
   */
  skipsUsed?: number
  maxSkips?: number
  /** Deterministic answer-quality classification for the current lastAnswer. */
  answerQuality?: AnswerQualityResult | null
  /** Consecutive question-echo answers on the same ask (includes current). */
  consecutiveQuestionEchoes?: number
}): ScriptTurnOutput {
  const resolved = resolveTurnAuthorityOverrides(opts)
  const withoutPraise = {
    ...resolved,
    speech: stripUnjustifiedPraisePrefix(resolved.speech),
  }
  return canonicalizeTurnSpeech(withoutPraise)
}

function resolveTurnAuthorityOverrides(
  opts: Parameters<typeof applyTurnAuthorityOverrides>[0],
): ScriptTurnOutput {
  let turn: ScriptTurnOutput = { ...opts.turn, is_follow_up: opts.turn.is_follow_up ?? false }
  const maxFollowUps = opts.followUpEnabled ? 2 : 0
  const cqFollowUps = opts.candidateQuestionFollowUps ?? 0
  const maxCqFollowUps =
    opts.maxCandidateQuestionFollowUps ?? MAX_CANDIDATE_QUESTION_FOLLOW_UPS
  const warmupAsked = opts.warmupQuestionsAsked ?? 0
  const warmupTurns = opts.warmupTurns ?? warmupAsked
  const selfIntroEnabled = opts.selfIntroEnabled ?? true
  const selfIntroQs = opts.selfIntroQuestionsAsked ?? 0
  const selfIntroTurns = opts.selfIntroTurns ?? 0

  // Leave warmup after the single scripted invite (or any warmup row).
  if (
    turn.phase === 'warmup' &&
    (warmupAsked >= MAX_WARMUP_QUESTIONS || warmupTurns >= MAX_WARMUP_QUESTIONS)
  ) {
    if (selfIntroEnabled) {
      return cannedSelfIntroTurn(turn.interviewer_emotion)
    }
    return cannedCoreEntryTurn(turn.interviewer_emotion)
  }

  // The model sometimes answers the self_intro prompt with a core question,
  // skipping the intro the candidate switched on. The warmup/self_intro exits
  // above key off the phase the model emitted, so a straight jump to core
  // passes through unchecked.
  if (
    selfIntroEnabled &&
    selfIntroQs === 0 &&
    opts.coreQuestionsAsked === 0 &&
    warmupTurns >= MAX_WARMUP_QUESTIONS &&
    phaseRank(turn.phase) >= phaseRank('core')
  ) {
    return cannedSelfIntroTurn(turn.interviewer_emotion)
  }

  // Leave self_intro after 1 invite, or after question+bridge (2 turns).
  if (turn.phase === 'self_intro') {
    if (!selfIntroEnabled) {
      return cannedCoreEntryTurn(turn.interviewer_emotion)
    }
    if (
      (turn.is_question && selfIntroQs >= MAX_SELF_INTRO_QUESTIONS) ||
      selfIntroTurns >= MAX_SELF_INTRO_TURNS
    ) {
      return cannedCoreEntryTurn(turn.interviewer_emotion)
    }
  }

  const nonCorePhase = turn.phase !== 'core' || opts.requestPhase !== 'core'
  const lastWasMoveOn = opts.lastAnswer.trim() === MOVE_ON_SPEECH
  const requiredProbeQuestionType: 'technical' | 'behavioral' =
    opts.parentQuestionType ??
    (opts.scriptType === 'SCRIPT_T' ? 'technical' : 'behavioral')
  const requiredProbeFallback = () =>
    cannedRequiredFollowUpTurn({
      questionType: requiredProbeQuestionType,
      emotion: turn.interviewer_emotion,
    })
  const asked = [
    ...(opts.alreadyAskedQuestions ?? []),
    opts.parentQuestion ?? '',
    opts.lastFollowUpQuestion ?? '',
  ].filter((q) => q.trim())
  const followUpText = turn.display_question || turn.speech
  const candidateQuestion = (turn.display_question ?? '').trim() || followUpText
  const parentQ = (opts.parentQuestion ?? '').trim()
  const quality = opts.answerQuality
  const consecutiveEchoes = opts.consecutiveQuestionEchoes ?? 0

  // Question-echo / off-topic recovery before content-probe enforcement.
  // Bounded by MAX_QUESTION_ECHO_RECOVERIES and the existing follow-up cap.
  if (
    !nonCorePhase &&
    opts.followUpEnabled &&
    opts.hasValidParentCoreQuestion !== false &&
    parentQ &&
    quality?.kind === 'question_echo'
  ) {
    if (
      consecutiveEchoes >= MAX_QUESTION_ECHO_RECOVERIES ||
      opts.followUpsThisQuestion >= maxFollowUps
    ) {
      if (opts.coreQuestionsAsked >= opts.totalQuestions) {
        return cannedCandidateQuestionsTurn(turn.interviewer_emotion)
      }
      return cannedNextCoreQuestionTurn({
        scriptType: opts.scriptType,
        lastQuestionType: opts.lastQuestionType,
        parentQuestionType: opts.parentQuestionType,
        alreadyAsked: asked,
        emotion: turn.interviewer_emotion,
      })
    }
    return cannedQuestionEchoRecoveryTurn(parentQ, turn.interviewer_emotion)
  }

  if (
    !nonCorePhase &&
    opts.followUpEnabled &&
    opts.hasValidParentCoreQuestion !== false &&
    parentQ &&
    quality?.kind === 'irrelevant' &&
    opts.followUpsThisQuestion < maxFollowUps
  ) {
    return cannedIrrelevantRedirectTurn(parentQ, turn.interviewer_emotion)
  }

  const rejectAdaptiveOffViolation = (): ScriptTurnOutput => {
    if (lastWasMoveOn) {
      if (opts.scriptType === 'SCRIPT_M') {
        const nextType = nextScriptMCoreQuestionType(
          opts.lastQuestionType ?? opts.parentQuestionType,
        )
        return (
          cannedScriptMNextCoreTurn(nextType, asked, turn.interviewer_emotion) ??
          cannedMoveOnTurn(turn.interviewer_emotion)
        )
      }
      // H/T: same reason as the blocked-FU branches below — a second
      // consecutive cannedMoveOnTurn stacks non-question acks and trips the
      // client's consecutive-ack recovery guard.
      return cannedNextCoreQuestionTurn({
        scriptType: opts.scriptType,
        lastQuestionType: opts.lastQuestionType,
        parentQuestionType: opts.parentQuestionType,
        alreadyAsked: asked,
        emotion: turn.interviewer_emotion,
      })
    }
    return cannedMoveOnTurn(turn.interviewer_emotion)
  }

  // Adaptive OFF: do not trust is_follow_up. Core-only — warmup/self_intro unchanged.
  if (!opts.followUpEnabled && !nonCorePhase) {
    const topicHijack =
      (opts.scriptType === 'SCRIPT_T' || opts.scriptType === 'SCRIPT_M') &&
      followUpAbandonsParentTopic({
        parentQuestion: opts.parentQuestion ?? '',
        candidateAnswer: opts.lastCandidateAnswer ?? '',
        followUpQuestion: followUpText,
      })
    const offViolation =
      turn.is_follow_up ||
      (!turn.is_question && speechContainsQuestionMark(turn.speech)) ||
      (turn.is_question && isAnaphoricFollowUpProbe(followUpText)) ||
      (turn.is_question && topicHijack)
    if (offViolation) {
      return rejectAdaptiveOffViolation()
    }
  }

  if (turn.is_follow_up) {
    const specialNoFollowUp =
      opts.lastAnswer === '[SKIPPED]' ||
      opts.lastAnswer === '[TIMEOUT]' ||
      opts.lastAnswer === '[NONE]'
    const noParent = opts.hasValidParentCoreQuestion === false
    const overCap = opts.followUpsThisQuestion >= maxFollowUps
    const probeNotNeeded = opts.answerProbeNeeded === false
    const typeConflict = followUpConflictsWithParentType({
      parentQuestionType: opts.parentQuestionType ?? null,
      modelQuestionType: turn.question_type ?? null,
      followUpQuestion: followUpText,
    })
    const topicHijack =
      (opts.scriptType === 'SCRIPT_T' || opts.scriptType === 'SCRIPT_M') &&
      followUpAbandonsParentTopic({
        parentQuestion: opts.parentQuestion ?? '',
        candidateAnswer: opts.lastCandidateAnswer ?? '',
        followUpQuestion: followUpText,
      })
    // SCRIPT_M only: a follow-up that restates the parent (or prior FU) is
    // invalid. Do not convert it into a core and do not spend a FU slot.
    const parentDuplicate =
      scriptMFollowUpIsDuplicateOf({
        scriptType: opts.scriptType,
        followUpQuestion: candidateQuestion,
        priorQuestion: opts.parentQuestion,
      }) ||
      scriptMFollowUpIsDuplicateOf({
        scriptType: opts.scriptType,
        followUpQuestion: followUpText,
        priorQuestion: opts.parentQuestion,
      })
    const priorFuDuplicate =
      scriptMFollowUpIsDuplicateOf({
        scriptType: opts.scriptType,
        followUpQuestion: candidateQuestion,
        priorQuestion: opts.lastFollowUpQuestion,
      }) ||
      scriptMFollowUpIsDuplicateOf({
        scriptType: opts.scriptType,
        followUpQuestion: followUpText,
        priorQuestion: opts.lastFollowUpQuestion,
      })
    const blocked =
      !opts.followUpEnabled ||
      overCap ||
      probeNotNeeded ||
      nonCorePhase ||
      noParent ||
      specialNoFollowUp ||
      typeConflict ||
      topicHijack ||
      parentDuplicate ||
      priorFuDuplicate

    if (blocked) {
      if (
        probeIsRequired({
          requestPhase: opts.requestPhase,
          followUpEnabled: opts.followUpEnabled,
          followUpsThisQuestion: opts.followUpsThisQuestion,
          maxFollowUpsPerQuestion: maxFollowUps,
          hasValidParentCoreQuestion: opts.hasValidParentCoreQuestion,
          answerProbeNeeded: opts.answerProbeNeeded,
          lastAnswer: opts.lastAnswer,
        })
      ) {
        return requiredProbeFallback()
      }

      if (
        (overCap || probeNotNeeded) &&
        opts.coreQuestionsAsked >= opts.totalQuestions
      ) {
        return cannedCandidateQuestionsTurn(turn.interviewer_emotion)
      }

      const scriptMEscalateToNextCore = () => {
        const nextType = nextScriptMCoreQuestionType(
          opts.lastQuestionType ?? opts.parentQuestionType,
        )
        return (
          cannedScriptMNextCoreTurn(nextType, asked, turn.interviewer_emotion) ??
          cannedMoveOnTurn(turn.interviewer_emotion)
        )
      }

      // A second consecutive cannedMoveOnTurn (lastWasMoveOn already true)
      // stacks a non-question ack on top of a non-question ack — that is
      // what trips the client's consecutive-ack recovery guard and surfaces
      // "The interviewer produced an unexpected response." Every blocked-FU
      // branch below must escalate through here instead of calling
      // cannedMoveOnTurn directly whenever lastWasMoveOn is true.
      const escalateAfterMoveOn = () => {
        if (opts.scriptType === 'SCRIPT_M') {
          return scriptMEscalateToNextCore()
        }
        return cannedNextCoreQuestionTurn({
          scriptType: opts.scriptType,
          lastQuestionType: opts.lastQuestionType,
          parentQuestionType: opts.parentQuestionType,
          alreadyAsked: asked,
          emotion: turn.interviewer_emotion,
        })
      }

      // Adaptive OFF core already returned above. Non-core: drop flag, keep speech.
      if (!opts.followUpEnabled) {
        turn = { ...turn, is_follow_up: false }
      } else if (overCap) {
        // True cap (>=2): next alternate core. Never promote the rejected FU.
        if (opts.scriptType === 'SCRIPT_M') {
          const nextType = nextScriptMCoreQuestionType(
            opts.lastQuestionType ?? opts.parentQuestionType,
          )
          if (
            scriptMFollowUpCanBecomeNextCore({
              questionText: followUpText,
              modelQuestionType: turn.question_type ?? null,
              nextType,
              alreadyAsked: asked,
            })
          ) {
            turn = { ...turn, is_follow_up: false, question_type: nextType }
          } else {
            return scriptMEscalateToNextCore()
          }
        } else if (lastWasMoveOn) {
          // H/T: a *new* wrongly-flagged question may proceed; repeats must not.
          if (repeatsAlreadyAskedQuestion(followUpText, asked)) {
            return escalateAfterMoveOn()
          }
          turn = { ...turn, is_follow_up: false }
        } else {
          return cannedMoveOnTurn(turn.interviewer_emotion)
        }
      } else if (probeNotNeeded) {
        if (opts.scriptType === 'SCRIPT_M') {
          return scriptMEscalateToNextCore()
        }
        if (lastWasMoveOn) {
          if (repeatsAlreadyAskedQuestion(followUpText, asked)) {
            return escalateAfterMoveOn()
          }
          turn = { ...turn, is_follow_up: false }
        } else {
          return cannedMoveOnTurn(turn.interviewer_emotion)
        }
      } else if (parentDuplicate || priorFuDuplicate || typeConflict || topicHijack) {
        // Rejected FU does not consume a slot and must not be spoken as a
        // parent-copy. Auto-advance after move-on still accepts a *valid* FU2
        // (this branch is not taken). A second invalid after move-on must
        // escalate — another cannedMoveOn loops the client with no question.
        if (lastWasMoveOn) {
          return escalateAfterMoveOn()
        }
        return cannedMoveOnTurn(turn.interviewer_emotion)
      } else if (specialNoFollowUp || noParent) {
        if (lastWasMoveOn) {
          return escalateAfterMoveOn()
        }
        return cannedMoveOnTurn(turn.interviewer_emotion)
      } else {
        // Non-core phase: drop the flag, keep speech.
        turn = { ...turn, is_follow_up: false }
      }
    } else if (
      turn.phase === 'core' &&
      turn.question_type == null &&
      (opts.parentQuestionType === 'technical' || opts.parentQuestionType === 'behavioral')
    ) {
      turn = { ...turn, question_type: opts.parentQuestionType }
    }
  }

  // A weak scored answer makes the probe mandatory. If the model moves on,
  // replace that output with an answerable same-topic fallback immediately —
  // never insert an acknowledgment-only hop.
  if (
    !turn.is_follow_up &&
    probeIsRequired({
      requestPhase: opts.requestPhase,
      followUpEnabled: opts.followUpEnabled,
      followUpsThisQuestion: opts.followUpsThisQuestion,
      maxFollowUpsPerQuestion: maxFollowUps,
      hasValidParentCoreQuestion: opts.hasValidParentCoreQuestion,
      answerProbeNeeded: opts.answerProbeNeeded,
      lastAnswer: opts.lastAnswer,
    })
  ) {
    return requiredProbeFallback()
  }

  // A core acknowledgment may exist once (skip / timeout / intro bridge). A
  // second consecutive one has nothing for the candidate to answer and trips
  // the client's recovery error. Replace it with an answerable question.
  if (
    !turn.is_question &&
    turn.phase === 'core' &&
    (opts.previousTurnWasAcknowledgment === true || lastWasMoveOn)
  ) {
    if (
      probeIsRequired({
        requestPhase: opts.requestPhase,
        followUpEnabled: opts.followUpEnabled,
        followUpsThisQuestion: opts.followUpsThisQuestion,
        maxFollowUpsPerQuestion: maxFollowUps,
        hasValidParentCoreQuestion: opts.hasValidParentCoreQuestion,
        answerProbeNeeded: opts.answerProbeNeeded,
        lastAnswer: opts.lastAnswer,
      })
    ) {
      return requiredProbeFallback()
    }
    return cannedNextCoreQuestionTurn({
      scriptType: opts.scriptType,
      lastQuestionType: opts.lastQuestionType,
      parentQuestionType: opts.parentQuestionType,
      alreadyAsked: asked,
      emotion: turn.interviewer_emotion,
    })
  }

  // Follow-ups do not consume question_count — allow them on the last parent.
  if (
    turn.phase === 'core' &&
    opts.coreQuestionsAsked >= opts.totalQuestions &&
    !turn.is_follow_up
  ) {
    return cannedCandidateQuestionsTurn(turn.interviewer_emotion)
  }

  // The final core may legitimately decline another probe even when the
  // score gate allowed one. Any attempted jump into CQ/closing must still
  // emit the explicit server-owned invitation first.
  if (
    opts.requestPhase !== 'candidate_questions' &&
    opts.coreQuestionsAsked >= opts.totalQuestions &&
    opts.candidateQuestionsExchanges === 0 &&
    phaseRank(turn.phase) >= phaseRank('candidate_questions')
  ) {
    return cannedCandidateQuestionsTurn(turn.interviewer_emotion)
  }

  if (opts.requestPhase === 'candidate_questions' && turn.phase === 'closing') {
    // The real closing is emitted by the pre-LLM lifecycle guard after an
    // accepted CQ answer. A model call in CQ always owes the candidate an answer.
    return cannedCandidateQuestionAnswerTurn(turn.interviewer_emotion)
  }

  if (opts.requestPhase === 'candidate_questions') {
    const action = turn.candidate_question_action

    // Core adaptive-FU state must never leak into CQ.
    turn = { ...turn, is_follow_up: false, question_type: null }

    if (action === 'follow_up') {
      const validFollowUp =
        turn.is_question &&
        !isNoQuestionsAnswer(opts.lastAnswer) &&
        cqFollowUps < maxCqFollowUps

      if (!validFollowUp) {
        // Preserve any useful answer prefix while removing the rejected
        // clarification question. If none remains, close cleanly.
        const question = turn.display_question?.trim() ?? ''
        const answerPrefix = question
          ? turn.speech.replace(question, '').replace(/[\s—:-]+$/g, '').trim()
          : ''
        if (!answerPrefix) return cannedClosingTurn(turn.interviewer_emotion)
        turn = {
          ...turn,
          speech: answerPrefix,
          display_question: null,
          timer_seconds: 0,
          reading_buffer_seconds: 0,
          auto_submit: false,
          allow_skip: false,
          show_auto_structure: false,
          is_question: false,
          candidate_question_action: 'answer',
        }
      }
    } else if (action === 'answer') {
      turn = {
        ...turn,
        display_question: null,
        timer_seconds: 0,
        reading_buffer_seconds: 0,
        auto_submit: false,
        allow_skip: false,
        show_auto_structure: false,
        is_question: false,
      }
    } else if (action === 'invite' || action === 'guidance') {
      // Invite/guidance are server-generated before the LLM path. If the model
      // emits either here, it failed to answer the candidate.
      return cannedCandidateQuestionAnswerTurn(turn.interviewer_emotion)
    } else if (action == null) {
      // Backward-compatible interpretation for model output during rollout.
      turn = {
        ...turn,
        candidate_question_action: turn.is_question ? 'follow_up' : 'answer',
      }
    }
  }

  // Never allow moving backward in the phase order (e.g. core → warmup).
  if (phaseRank(turn.phase) < phaseRank(opts.requestPhase)) {
    turn = { ...turn, phase: opts.requestPhase as ScriptTurnOutput['phase'] }
  }

  // Skip budget exhausted — never leave the Skip control enabled.
  const maxSkips = opts.maxSkips
  const skipsUsed = opts.skipsUsed
  if (
    turn.allow_skip &&
    typeof maxSkips === 'number' &&
    typeof skipsUsed === 'number' &&
    skipsUsed >= maxSkips
  ) {
    turn = { ...turn, allow_skip: false }
  }

  return turn
}

/**
 * Display counter after this turn is applied: core questions including the
 * current turn when it is a new (non-follow-up) core question.
 */
export function displayQuestionNumberAfterTurn(
  coreQuestionsAskedBefore: number,
  turn: ScriptTurnOutput,
): number {
  if (turn.is_question && turn.phase === 'core' && !turn.is_follow_up) {
    return coreQuestionsAskedBefore + 1
  }
  return coreQuestionsAskedBefore
}

/**
 * Steer the prompt's current_phase before generation when budgets are spent.
 */
export function resolvePromptPhase(
  clientPhase: string,
  coreQuestionsAsked: number,
  totalQuestions: number,
  opts?: {
    candidateQuestionsExchanges?: number
    maxCandidateQuestionsExchanges?: number
    lastTurnWasCqAnswer?: boolean
    candidateQuestionGuidanceTurns?: number
    warmupQuestionsAsked?: number
    warmupTurns?: number
    selfIntroEnabled?: boolean
    selfIntroQuestionsAsked?: number
    selfIntroTurns?: number
    lastTurnWasSelfIntroBridge?: boolean
    /** Stay in core after the last planned question when a follow-up is still allowed. */
    followUpEnabled?: boolean
    followUpsThisQuestion?: number
    maxFollowUpsPerQuestion?: number
    hasValidParentCoreQuestion?: boolean
    /** false → do not stay in core for a follow-up after the last planned question. */
    answerProbeNeeded?: boolean | 'unknown'
  },
): string {
  const lastWasAnswer = opts?.lastTurnWasCqAnswer ?? false
  const warmupAsked = opts?.warmupQuestionsAsked ?? 0
  const warmupTurns = opts?.warmupTurns ?? warmupAsked
  const selfIntroEnabled = opts?.selfIntroEnabled ?? true
  const selfIntroTurns = opts?.selfIntroTurns ?? 0
  const lastWasSelfIntroBridge = opts?.lastTurnWasSelfIntroBridge ?? false

  if (
    clientPhase === 'warmup' &&
    (warmupAsked >= MAX_WARMUP_QUESTIONS || warmupTurns >= MAX_WARMUP_QUESTIONS)
  ) {
    return selfIntroEnabled ? 'self_intro' : 'core'
  }

  if (clientPhase === 'self_intro') {
    if (!selfIntroEnabled) return 'core'
    // After the optional bridge (or 2 self_intro turns total), move to core.
    // While only the invite exists, stay so the model can emit the bridge.
    if (lastWasSelfIntroBridge || selfIntroTurns >= MAX_SELF_INTRO_TURNS) {
      return 'core'
    }
  }

  // A completed interviewer answer auto-advances to closing. Guidance and CQ
  // follow-ups remain in candidate_questions for one more candidate response.
  if (
    lastWasAnswer &&
    clientPhase === 'candidate_questions'
  ) {
    return 'closing'
  }
  if (
    coreQuestionsAsked >= totalQuestions &&
    (clientPhase === 'core' || clientPhase === 'self_intro')
  ) {
    const maxFu = opts?.maxFollowUpsPerQuestion ?? (opts?.followUpEnabled ? 2 : 0)
    const stayInCoreForFollowUp =
      clientPhase === 'core' &&
      opts?.followUpEnabled === true &&
      opts?.hasValidParentCoreQuestion === true &&
      (opts?.followUpsThisQuestion ?? 0) < maxFu &&
      opts?.answerProbeNeeded !== false
    if (!stayInCoreForFollowUp) {
      return 'candidate_questions'
    }
  }
  return clientPhase
}

/**
 * Whether this request should short-circuit to closing without an LLM call.
 * - Candidate skipped / declined questions
 * - Final CQ invite was already answered (auto-advance after last answer) → close
 */
export function shouldForceClosingBeforeLlm(opts: {
  requestPhase: string
  lastAnswer: string
  candidateQuestionsExchanges: number
  lastTurnWasCqAnswer: boolean
  candidateQuestionGuidanceTurns?: number
  maxCandidateQuestionsExchanges?: number
}): boolean {
  if (opts.requestPhase !== 'candidate_questions') return false
  if (
    isNoQuestionsAnswer(opts.lastAnswer) &&
    (opts.candidateQuestionGuidanceTurns ?? 0) > 0
  ) {
    return true
  }
  return opts.lastTurnWasCqAnswer
}

/** First generic decline gets concise guidance; a second decline closes. */
export function shouldShowCandidateQuestionGuidance(opts: {
  requestPhase: string
  lastAnswer: string
  candidateQuestionsExchanges: number
  candidateQuestionGuidanceTurns: number
}): boolean {
  return (
    opts.requestPhase === 'candidate_questions' &&
    opts.candidateQuestionsExchanges > 0 &&
    opts.candidateQuestionGuidanceTurns === 0 &&
    isNoQuestionsAnswer(opts.lastAnswer)
  )
}

/**
 * Warmup budget spent and self_intro off → canned core entry, no LLM.
 * Prevents SSE sentence-0 from a discarded warmup-repeat before authority
 * replaces speech with cannedCoreEntryTurn.
 */
export function shouldForceCoreEntryBeforeLlm(opts: {
  requestPhase: string
  warmupQuestionsAsked: number
  warmupTurns: number
  selfIntroEnabled: boolean
}): boolean {
  if (opts.requestPhase === 'self_intro' && !opts.selfIntroEnabled) return true
  if (opts.requestPhase !== 'warmup') return false
  if (opts.selfIntroEnabled) return false
  return (
    opts.warmupQuestionsAsked >= MAX_WARMUP_QUESTIONS ||
    opts.warmupTurns >= MAX_WARMUP_QUESTIONS
  )
}

/**
 * Idempotency for /turn after a lost client response.
 *
 * When the client answers turn `prevTurnIndex`, the next interviewer turn is
 * always at `prevTurnIndex + 1`. If `current_turn_index` already advanced to
 * that index (or beyond), a prior /turn call already persisted it — return
 * that index so the route can short-circuit (no second LLM + no orphan insert).
 *
 * Boot `[NONE]` has no prevTurnIndex and is excluded (duplicate boot uses the
 * unique (interview_id, turn_index) path instead).
 */
export function existingNextTurnIndexAfterAnswer(opts: {
  prevTurnIndex: number | undefined
  lastAnswer: string
  currentTurnIndex: number
}): number | null {
  if (opts.prevTurnIndex == null) return null
  if (opts.lastAnswer === '[NONE]') return null
  const expectedNext = opts.prevTurnIndex + 1
  if (opts.currentTurnIndex >= expectedNext) return expectedNext
  return null
}

/**
 * Boot `[NONE]` idempotency: if a prior /turn already advanced the interview,
 * return that turn index instead of minting another warmup (duplicate greetings).
 */
export function bootResumeTurnIndex(opts: {
  lastAnswer: string
  currentTurnIndex: number
}): number | null {
  if (opts.lastAnswer !== '[NONE]') return null
  if (opts.currentTurnIndex >= 1) return opts.currentTurnIndex
  return null
}
