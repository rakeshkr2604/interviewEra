/**
 * Deterministic candidate-answer quality signals for v2.1 turn generation.
 * No extra LLM call. Conservative: ambiguous cases stay substantive.
 */

import {
  comparableQuestionText,
  questionsAreEquivalent,
  sameQuestionText,
} from '@/lib/ai/scripts/follow-up-guards'
import {
  normalizeSpeechWhitespace,
  significantQuestionTokens,
} from '@/lib/ai/scripts/speech-display-question'
import { isSpecialTurnAnswer } from '@/lib/ai/scripts/follow-up-context'

export type AnswerQualityKind =
  | 'substantive'
  | 'explicit_uncertainty'
  | 'question_echo'
  | 'echo_then_answer'
  | 'clarification_request'
  | 'skip_request'
  | 'incomplete'
  | 'empty'
  | 'irrelevant'

export type AnswerQualityResult = {
  kind: AnswerQualityKind
  /** True when the response should not be treated as evidence of understanding. */
  nonSubstantive: boolean
  /** True when interviewer should re-ask / recover instead of a content follow-up. */
  needsRecovery: boolean
  /** Human-readable reason for logs/tests (not shown to candidate). */
  reason: string
}

/** Max consecutive question-echo recoveries on the same ask before moving on. */
export const MAX_QUESTION_ECHO_RECOVERIES = 2

const EXPLICIT_UNCERTAINTY =
  /\b(i\s*(do\s*not|don'?t|dunno)\s+know|no\s+idea|not\s+sure|i'?m\s+unsure|i\s+have\s+no\s+idea|i\s+am\s+not\s+familiar|cannot\s+recall|can'?t\s+recall|i\s+forgot)\b/i

const CLARIFICATION_REQUEST =
  /\b((can|could)\s+you\s+(repeat|rephrase|clarify|explain)|what\s+do\s+you\s+mean|which\s+(one|part)|sorry,?\s+(can|could)\s+you|please\s+repeat|i\s+didn'?t\s+(catch|hear|get))\b/i

const SKIP_REQUEST =
  /\b((can|could|may)\s+i\s+skip|let'?s\s+skip|please\s+skip|skip\s+(this|the)\s+question|move\s+on\s+to\s+(the\s+)?next)\b/i

const LEADING_ECHO_BRIDGES =
  /^(so\s+)?(the\s+question\s+is|you('re|\s+are)\s+asking|you\s+asked|basically|basically,)\s*/i

/** Praise prefixes the model must not lead with (also stripped post-hoc). */
export const BANNED_PRAISE_PREFIXES = [
  'great answer!',
  'great answer.',
  'excellent!',
  'excellent.',
  'wonderful!',
  'wonderful.',
  'perfect!',
  'perfect.',
  "that's a fantastic start!",
  'that is a fantastic start!',
  'i love that approach!',
  'i love that approach.',
  'fantastic!',
  'fantastic.',
  'awesome!',
  'awesome.',
  'amazing!',
  'amazing.',
] as const

export function normalizeAnswerForCompare(text: string): string {
  return comparableQuestionText(text)
}

function wordCount(text: string): number {
  return normalizeSpeechWhitespace(text)
    .split(/\s+/)
    .filter(Boolean).length
}

function stripLeadingEchoBridge(answer: string): string {
  return normalizeSpeechWhitespace(answer).replace(LEADING_ECHO_BRIDGES, '').trim()
}

/**
 * True when answer is essentially the same ask as the question
 * (exact, punctuation-normalized, or question + filler only).
 */
export function isNearExactQuestionEcho(answer: string, question: string): boolean {
  const a = stripLeadingEchoBridge(answer)
  const q = normalizeSpeechWhitespace(question)
  if (!a || !q) return false
  if (sameQuestionText(a, q) || questionsAreEquivalent(a, q)) return true

  const na = normalizeAnswerForCompare(a)
  const nq = normalizeAnswerForCompare(q)
  if (!na || !nq) return false
  if (na === nq) return true

  // Answer is the question plus a trailing filler ("...", "right?", "hmm")
  if (na.startsWith(nq) && na.length <= nq.length + 24) {
    const tail = na.slice(nq.length).trim()
    if (!tail || /^(right|yeah|yes|hmm+|uh+|um+|please)?$/.test(tail)) return true
  }

  // High lexical containment of question tokens with almost no extra content
  const qTokens = significantQuestionTokens(q)
  const aTokens = significantQuestionTokens(a)
  if (qTokens.length >= 4 && aTokens.length > 0) {
    const qSet = new Set(qTokens)
    const overlap = aTokens.filter((t) => qSet.has(t)).length
    const extra = aTokens.filter((t) => !qSet.has(t)).length
    if (overlap / qTokens.length >= 0.85 && extra <= 1 && wordCount(a) <= wordCount(q) + 4) {
      return true
    }
  }

  return false
}

/**
 * Echo then a real attempt: starts with the question (or "the question is…")
 * then continues with enough new content.
 */
export function isEchoThenAnswer(answer: string, question: string): boolean {
  const a = normalizeSpeechWhitespace(answer)
  const q = normalizeSpeechWhitespace(question)
  if (!a || !q || a.length < q.length + 20) return false

  const stripped = stripLeadingEchoBridge(a)
  const nq = normalizeAnswerForCompare(q)
  const na = normalizeAnswerForCompare(stripped)
  if (!nq || !na.startsWith(nq)) return false

  const remainder = stripped
    .slice(Math.min(stripped.length, q.length))
    .replace(/^[\s,.\-–—:]+/, '')
    .trim()
  if (wordCount(remainder) < 6) return false
  if (isNearExactQuestionEcho(remainder, q)) return false
  return true
}

function looksIncomplete(answer: string): boolean {
  const t = normalizeSpeechWhitespace(answer)
  if (!t) return true
  const words = wordCount(t)
  if (words <= 2 && !EXPLICIT_UNCERTAINTY.test(t) && !SKIP_REQUEST.test(t)) {
    // "yes" / "ok" alone after a content question is incomplete, not empty
    return true
  }
  // Trailing cut-off markers common in STT
  if (/\b(and|but|so|because|like)\s*$/i.test(t) && words <= 8) return true
  return false
}

const ANECDOTE_OFFTOPIC =
  /\b(i\s+built|my\s+(college\s+)?(project|website|app)|last\s+semester|in\s+my\s+internship|we\s+went\s+to\s+the\s+movies)\b/i

/**
 * High-precision entertainment / lifestyle asides. Catches short replies that
 * share no question tokens but were previously defaulting to substantive
 * because they were under the long-narrative word threshold.
 */
const ENTERTAINMENT_OFFTOPIC =
  /\b(my\s+favorite\s+(movie|film|song|show|series|book|sport|team|food|hobby)|favorite\s+(movie|film|song|show|series)|went\s+to\s+the\s+(movies|cinema)|space\s+exploration|watch(ed|ing)?\s+(netflix|movies?|a\s+film)|football\s+game|cricket\s+match|i\s+(love|hate|enjoy)\s+(pizza|travell?ing|cooking))\b/i

/** Lightweight domain cues — not a full taxonomy; used only for mismatch checks. */
const DOMAIN_CUES: ReadonlyArray<{ id: string; re: RegExp }> = [
  {
    id: 'typescript',
    re: /\b(typescript|\.tsx?\b|tsc\b|gradual\s+typing|structural\s+typing|declaration\s+merging|strict\s+null|type[-\s]?safe|generics?\b)\b/i,
  },
  {
    id: 'python',
    re: /\b(python|django|flask|fastapi|asyncio|pandas|numpy|celery)\b/i,
  },
  {
    id: 'dataflow',
    re: /\b(data\s*flow|pipeline|etl|stream(?:ing)?|throughput|keyset|pagination|batch(?:es|ing)?|worker\s+pool|message\s+queue)\b/i,
  },
  {
    id: 'rest_http',
    re: /\b(rest\s*api|idempotent|http\s+status|graphql|openapi|protobuf)\b/i,
  },
  {
    id: 'auth',
    re: /\b(authn|authz|authentication|authorization|oauth|jwt|rbac|sso)\b/i,
  },
  {
    id: 'databases',
    re: /\b(database|postgres|mysql|mongodb|index(?:es|ing)?|b-?tree|query\s+plan)\b/i,
  },
]

function domainsPresent(text: string): Set<string> {
  const found = new Set<string>()
  for (const cue of DOMAIN_CUES) {
    if (cue.re.test(text)) found.add(cue.id)
  }
  return found
}

function hasEngineeringSignal(answer: string): boolean {
  return (
    domainsPresent(answer).size > 0 ||
    /\b(api|latency|schema|cache|caching|queue|thread|async|endpoint|transaction(?:al)?|microservice|kubernetes|docker|compiler|mutex|semaphore|pointer|throughput|pagination|idempotent|typescript|javascript|python|react|node\.?js|database|auth|token|null\s+checks?)\b/i.test(
      answer,
    )
  )
}

/**
 * High-precision off-topic only. Zero question-token overlap alone is not
 * enough — short correct answers often share little lexical overlap.
 *
 * Order of signals (any match with zero significant-token overlap):
 * 1. Entertainment / lifestyle aside (any length ≥ 6 words)
 * 2. Anecdote / project digression markers
 * 3. Clear domain mismatch (e.g. REST-only answer to a Python data-flow ask)
 * 4. Long non-engineering narrative with no shared key tokens
 *
 * Long engineering answers that merely use unfamiliar synonyms stay substantive
 * unless a domain mismatch is detected.
 */
function looksIrrelevant(answer: string, question: string): boolean {
  const words = wordCount(answer)
  if (words < 6 || words > 80) return false
  const qTokens = significantQuestionTokens(question)
  const aTokens = significantQuestionTokens(answer)
  if (qTokens.length < 3 || aTokens.length === 0) return false
  const qSet = new Set(qTokens)
  const overlap = aTokens.filter((t) => qSet.has(t)).length
  if (overlap > 0) return false

  if (ENTERTAINMENT_OFFTOPIC.test(answer)) return true
  if (ANECDOTE_OFFTOPIC.test(answer)) return true

  const qDomains = domainsPresent(question)
  const aDomains = domainsPresent(answer)
  if (qDomains.size > 0 && aDomains.size > 0) {
    let sharedDomain = false
    for (const id of aDomains) {
      if (qDomains.has(id)) {
        sharedDomain = true
        break
      }
    }
    if (!sharedDomain) return true
  }

  // Long narrative with no shared key tokens and no engineering signal
  if (words >= 18 && !hasEngineeringSignal(answer)) return true
  return false
}

/**
 * Classify a candidate response relative to the question they were just asked.
 * Prefer the turn's display_question as `question`.
 */
export function classifyCandidateAnswer(opts: {
  answer: string
  question: string
}): AnswerQualityResult {
  const answer = normalizeSpeechWhitespace(opts.answer ?? '')
  const question = normalizeSpeechWhitespace(opts.question ?? '')

  if (!answer || isSpecialTurnAnswer(answer)) {
    return {
      kind: 'empty',
      nonSubstantive: true,
      needsRecovery: false,
      reason: 'empty_or_special',
    }
  }

  if (!question) {
    return {
      kind: 'substantive',
      nonSubstantive: false,
      needsRecovery: false,
      reason: 'no_question_context',
    }
  }

  if (SKIP_REQUEST.test(answer)) {
    return {
      kind: 'skip_request',
      nonSubstantive: true,
      needsRecovery: false,
      reason: 'explicit_skip_request',
    }
  }

  if (CLARIFICATION_REQUEST.test(answer)) {
    return {
      kind: 'clarification_request',
      nonSubstantive: true,
      needsRecovery: true,
      reason: 'asks_for_clarification',
    }
  }

  if (isEchoThenAnswer(answer, question)) {
    return {
      kind: 'echo_then_answer',
      nonSubstantive: false,
      needsRecovery: false,
      reason: 'echo_prefix_then_attempt',
    }
  }

  if (isNearExactQuestionEcho(answer, question)) {
    return {
      kind: 'question_echo',
      nonSubstantive: true,
      needsRecovery: true,
      reason: 'near_exact_question_repeat',
    }
  }

  if (EXPLICIT_UNCERTAINTY.test(answer)) {
    // Pure uncertainty vs uncertainty + attempt (e.g. "I don't know, but
    // authentication verifies identity"). A short factual clause counts.
    const withoutUncertainty = answer
      .replace(EXPLICIT_UNCERTAINTY, ' ')
      .replace(/^(,|but|however|although)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim()
    const hasAttempt = wordCount(withoutUncertainty) >= 3
    return {
      kind: 'explicit_uncertainty',
      nonSubstantive: !hasAttempt,
      needsRecovery: false,
      reason: hasAttempt ? 'uncertainty_with_attempt' : 'explicit_uncertainty',
    }
  }

  if (looksIncomplete(answer)) {
    return {
      kind: 'incomplete',
      nonSubstantive: true,
      needsRecovery: false,
      reason: 'too_short_or_cutoff',
    }
  }

  if (looksIrrelevant(answer, question)) {
    return {
      kind: 'irrelevant',
      nonSubstantive: true,
      needsRecovery: true,
      reason: 'off_topic_or_domain_mismatch',
    }
  }

  return {
    kind: 'substantive',
    nonSubstantive: false,
    needsRecovery: false,
    reason: 'default_substantive',
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Strip banned praise from interviewer speech — both leading prefixes and
 * sentence-initial occurrences after punctuation (e.g. mid-turn "Great answer!").
 * Keeps the rest intact (including the trailing display_question). Idempotent.
 */
export function stripUnjustifiedPraisePrefix(speech: string): string {
  let out = normalizeSpeechWhitespace(speech)
  if (!out) return out

  let changed = true
  while (changed) {
    changed = false
    const lower = out.toLowerCase()
    for (const phrase of BANNED_PRAISE_PREFIXES) {
      if (lower.startsWith(phrase)) {
        out = normalizeSpeechWhitespace(out.slice(phrase.length))
        changed = true
        break
      }
    }
  }

  for (const phrase of BANNED_PRAISE_PREFIXES) {
    const mid = new RegExp(`([.!?…]\\s+)${escapeRegExp(phrase)}`, 'gi')
    out = out.replace(mid, '$1')
  }
  return normalizeSpeechWhitespace(out)
}

/** Honest report copy when the transcript is a question echo (rubric scores unchanged). */
export const QUESTION_ECHO_REPORT_SUMMARY =
  'Candidate repeated the question rather than answering it.'

/**
 * Prefer an honest echo summary over model one-liners that may over-credit
 * a repeated question as understanding.
 */
export function reportSummaryForAnswer(opts: {
  transcript: string
  question: string
  modelOneLineSummary: string | null
}): { kind: AnswerQualityKind; oneLineSummary: string | null; scoreSuspectHint: boolean } {
  const quality = classifyCandidateAnswer({
    answer: opts.transcript,
    question: opts.question,
  })
  if (quality.kind === 'question_echo') {
    return {
      kind: quality.kind,
      oneLineSummary: QUESTION_ECHO_REPORT_SUMMARY,
      scoreSuspectHint: true,
    }
  }
  return {
    kind: quality.kind,
    oneLineSummary: opts.modelOneLineSummary,
    scoreSuspectHint: false,
  }
}

export type AnsweredTurnForEcho = {
  turn_index: number
  is_question: boolean
  phase: string
  llm_output: unknown
  answer_text?: string | null
}

function questionFromLlm(llm_output: unknown): string {
  if (!llm_output || typeof llm_output !== 'object') return ''
  const dq = (llm_output as { display_question?: unknown }).display_question
  return typeof dq === 'string' ? dq.trim() : ''
}

/**
 * Count consecutive question-echo answers on the same ask, including the
 * current answer. Used to bound recovery loops.
 */
export function countConsecutiveQuestionEchoes(opts: {
  turns: AnsweredTurnForEcho[]
  currentQuestion: string
  currentAnswer: string
}): number {
  const current = classifyCandidateAnswer({
    answer: opts.currentAnswer,
    question: opts.currentQuestion,
  })
  if (current.kind !== 'question_echo') return 0

  let count = 1
  const sorted = [...opts.turns].sort((a, b) => b.turn_index - a.turn_index)
  for (const turn of sorted) {
    if (turn.phase !== 'core' || !turn.is_question) continue
    const q = questionFromLlm(turn.llm_output)
    if (!q || !questionsAreEquivalent(q, opts.currentQuestion)) continue
    const ans = (turn.answer_text ?? '').trim()
    if (!ans) continue
    const prior = classifyCandidateAnswer({ answer: ans, question: q })
    if (prior.kind !== 'question_echo') break
    count += 1
  }
  return count
}

/** Directive block appended to the turn user prompt (no extra LLM call). */
export function buildAnswerQualityDirective(opts: {
  quality: AnswerQualityResult
  consecutiveEchoes: number
  parentQuestion: string
}): string | null {
  const { quality, consecutiveEchoes, parentQuestion } = opts
  if (!parentQuestion.trim()) return null

  if (quality.kind === 'question_echo') {
    if (consecutiveEchoes >= MAX_QUESTION_ECHO_RECOVERIES) {
      return (
        `\n\nCANDIDATE REPEATED THE QUESTION AGAIN (answer_quality=question_echo, consecutive=${consecutiveEchoes}). ` +
        `Do NOT praise. Do NOT follow up on content. Set is_follow_up: false and ask a NEW core question that is not in ALREADY ASKED ` +
        `(or phase candidate_questions if the core budget is done). One short neutral bridge only — e.g. "Understood — let's try a different question." ` +
        `display_question MUST be the new ask, not a restatement of parent_question.`
      )
    }
    return (
      `\n\nCANDIDATE REPEATED THE QUESTION INSTEAD OF ANSWERING (answer_quality=question_echo). ` +
      `Do NOT treat this as a substantive answer. Do NOT praise. Do NOT invent a new core topic. ` +
      `Set is_follow_up: true, is_question: true, phase "core". ` +
      `speech must briefly note they repeated the question and invite a real attempt or explicit uncertainty, ` +
      `then end with the EXACT display_question. display_question MUST equal parent_question exactly:\n` +
      `parent_question: ${parentQuestion}`
    )
  }

  if (quality.kind === 'clarification_request') {
    return (
      `\n\nCANDIDATE ASKED FOR CLARIFICATION (answer_quality=clarification_request). ` +
      `Do NOT praise. Briefly rephrase the same ask without revealing a model answer. ` +
      `Set is_follow_up: true and keep display_question equal to parent_question (or a tighter rephrase of the same ask).`
    )
  }

  if (quality.kind === 'explicit_uncertainty' && quality.nonSubstantive) {
    return (
      `\n\nCANDIDATE EXPRESSED UNCERTAINTY (answer_quality=explicit_uncertainty). ` +
      `Do NOT praise or pretend they answered correctly. Use one brief neutral bridge. ` +
      `If a same-topic approach probe is useful, set is_follow_up: true with ONE concise probe; otherwise move to the next core (is_follow_up: false). ` +
      `Never reveal the expected model answer.`
    )
  }

  if (quality.kind === 'irrelevant') {
    return (
      `\n\nCANDIDATE ANSWER APPEARS OFF-TOPIC (answer_quality=irrelevant). ` +
      `Do NOT praise. Redirect to parent_question with is_follow_up: true and display_question equal to parent_question.`
    )
  }

  return null
}
