import type { ScriptTurnOutput } from './turn-validator'

export type Difficulty = 'easy' | 'medium' | 'hard'

/** Hard ceiling on total script_turns rows per interview (cost / runaway guard). */
export const TURN_CAP: Record<Difficulty, number> = {
  easy: 15,
  medium: 20,
  hard: 25,
}

/**
 * Max interviewer invitations in candidate_questions (each invite + candidate
 * response ≈ one exchange). Tunable — not a product lock.
 */
export const MAX_CANDIDATE_QUESTION_EXCHANGES = 1

export type ScriptTurnRow = {
  turn_index: number
  phase: string
  is_question: boolean
  llm_output: unknown
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
 * Warmup invites (is_question=true). After 2, force leave warmup.
 * Scripts define exactly two warmup turns; without this the model can loop forever
 * once the client stopped independently advancing phase (Phase 1).
 */
export const MAX_WARMUP_QUESTIONS = 2

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
  return turns.filter((t) => t.phase === 'candidate_questions' && t.is_question).length
}

/** True when the most recent turn was a CQ interviewer answer/bridge (not an invite). */
export function lastTurnWasCandidateQuestionsAnswer(turns: ScriptTurnRow[]): boolean {
  const last = turns[turns.length - 1]
  return Boolean(last && last.phase === 'candidate_questions' && !last.is_question)
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
 * True when the candidate declined to ask questions (skip / timeout / short "no").
 * Used to exit candidate_questions immediately instead of waiting for a second exchange.
 */
export function isNoQuestionsAnswer(lastAnswer: string): boolean {
  if (lastAnswer === '[SKIPPED]' || lastAnswer === '[TIMEOUT]') return true
  const t = lastAnswer.trim().toLowerCase()
  if (t.length === 0) return true
  if (t.length > 48) return false
  return /^(no|nope|nah|nothing|none|no thanks|no thank you|no questions?|i('m| am)? (good|fine|all set|okay|ok)|that('s| is) (all|it|fine|okay|ok)|i don'?t have (any(thing| questions?)?)?( to ask)?|nothing from me)\.?$/.test(
    t,
  )
}

/** Deterministic candidate_questions transition (no extra LLM call). */
export function cannedCandidateQuestionsTurn(
  emotion: ScriptTurnOutput['interviewer_emotion'] = 'neutral',
): ScriptTurnOutput {
  return {
    speech: "That covers what I wanted to go through. Any questions for me about the role?",
    display_question: 'Do you have any questions for me?',
    tip: null,
    timer_seconds: 60,
    reading_buffer_seconds: 3,
    auto_submit: true,
    allow_skip: true,
    show_auto_structure: false,
    phase: 'candidate_questions',
    is_question: true,
    is_follow_up: false,
    question_difficulty: null,
    interviewer_emotion: emotion,
  }
}

export function cannedClosingTurn(
  emotion: ScriptTurnOutput['interviewer_emotion'] = 'neutral',
): ScriptTurnOutput {
  return {
    speech: "That's all we have time for today. Your report will be ready shortly.",
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
 * Server authority: clamp follow-ups, force core → candidate_questions when the
 * question budget is spent, force candidate_questions → closing when the
 * CQ exchange cap is hit (or the candidate declines to ask), force
 * warmup/self_intro exits, and reject phase regressions.
 */
export function applyTurnAuthorityOverrides(opts: {
  turn: ScriptTurnOutput
  coreQuestionsAsked: number
  totalQuestions: number
  followUpsThisQuestion: number
  followUpEnabled: boolean
  candidateQuestionsExchanges: number
  maxCandidateQuestionsExchanges?: number
  /** Client phase for the request that produced this turn. */
  requestPhase: string
  lastAnswer: string
  warmupQuestionsAsked?: number
  warmupTurns?: number
  selfIntroEnabled?: boolean
  selfIntroQuestionsAsked?: number
  selfIntroTurns?: number
}): ScriptTurnOutput {
  let turn: ScriptTurnOutput = { ...opts.turn, is_follow_up: opts.turn.is_follow_up ?? false }
  const maxFollowUps = opts.followUpEnabled ? 2 : 0
  const maxCq =
    opts.maxCandidateQuestionsExchanges ?? MAX_CANDIDATE_QUESTION_EXCHANGES
  const warmupAsked = opts.warmupQuestionsAsked ?? 0
  const warmupTurns = opts.warmupTurns ?? warmupAsked
  const selfIntroEnabled = opts.selfIntroEnabled ?? true
  const selfIntroQs = opts.selfIntroQuestionsAsked ?? 0
  const selfIntroTurns = opts.selfIntroTurns ?? 0

  // Leave warmup after the scripted two invites (or any two warmup rows).
  if (
    turn.phase === 'warmup' &&
    (warmupAsked >= MAX_WARMUP_QUESTIONS || warmupTurns >= MAX_WARMUP_QUESTIONS)
  ) {
    if (selfIntroEnabled) {
      return {
        speech: 'Quick background first — walk me through your experience. Two minutes.',
        display_question: 'Walk me through your background relevant to this role.',
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
        interviewer_emotion: turn.interviewer_emotion,
      }
    }
    return cannedCoreEntryTurn(turn.interviewer_emotion)
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

  if (turn.is_follow_up) {
    if (opts.followUpsThisQuestion >= maxFollowUps) {
      if (opts.coreQuestionsAsked >= opts.totalQuestions) {
        return cannedCandidateQuestionsTurn(turn.interviewer_emotion)
      }
      // Budget remains — recategorize as a new core question (acceptable tradeoff).
      turn = { ...turn, is_follow_up: false }
    }
  }

  if (turn.phase === 'core' && opts.coreQuestionsAsked >= opts.totalQuestions) {
    return cannedCandidateQuestionsTurn(turn.interviewer_emotion)
  }

  // Candidate declined to ask (skip / "no") while in candidate_questions → close now.
  if (
    opts.requestPhase === 'candidate_questions' &&
    isNoQuestionsAnswer(opts.lastAnswer) &&
    turn.phase !== 'closing'
  ) {
    return cannedClosingTurn(turn.interviewer_emotion)
  }

  // Cap CQ invites: if we've already issued the max and the model tries another
  // invite (is_question=true), force closing. Allow one answer turn after the
  // final invite (is_question=false) so the last candidate question still gets a reply.
  if (
    turn.phase === 'candidate_questions' &&
    turn.is_question &&
    opts.candidateQuestionsExchanges >= maxCq
  ) {
    return cannedClosingTurn(turn.interviewer_emotion)
  }

  // Never allow moving backward in the phase order (e.g. core → warmup).
  if (phaseRank(turn.phase) < phaseRank(opts.requestPhase)) {
    turn = { ...turn, phase: opts.requestPhase as ScriptTurnOutput['phase'] }
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
    warmupQuestionsAsked?: number
    warmupTurns?: number
    selfIntroEnabled?: boolean
    selfIntroQuestionsAsked?: number
    selfIntroTurns?: number
    lastTurnWasSelfIntroBridge?: boolean
  },
): string {
  const exchanges = opts?.candidateQuestionsExchanges ?? 0
  const maxCq = opts?.maxCandidateQuestionsExchanges ?? MAX_CANDIDATE_QUESTION_EXCHANGES
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

  // After the final invite was answered, steer to closing (no more invites).
  if (
    exchanges >= maxCq &&
    lastWasAnswer &&
    clientPhase === 'candidate_questions'
  ) {
    return 'closing'
  }
  if (
    coreQuestionsAsked >= totalQuestions &&
    (clientPhase === 'core' || clientPhase === 'self_intro')
  ) {
    return 'candidate_questions'
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
  maxCandidateQuestionsExchanges?: number
}): boolean {
  const maxCq =
    opts.maxCandidateQuestionsExchanges ?? MAX_CANDIDATE_QUESTION_EXCHANGES
  if (opts.requestPhase !== 'candidate_questions') return false
  if (isNoQuestionsAnswer(opts.lastAnswer)) return true
  // After answering under the final invite, don't let the model invite again.
  if (opts.candidateQuestionsExchanges >= maxCq && opts.lastTurnWasCqAnswer) {
    return true
  }
  return false
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
