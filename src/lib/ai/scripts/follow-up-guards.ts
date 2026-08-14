/**
 * Deterministic follow-up guards. No extra LLM call, no embeddings.
 * Uses existing significantQuestionTokens (lexical, not fuzzy).
 */

import {
  normalizeSpeechWhitespace,
  significantQuestionTokens,
} from './speech-display-question'

export function sameQuestionText(a: string, b: string): boolean {
  const x = normalizeSpeechWhitespace(a).toLowerCase()
  const y = normalizeSpeechWhitespace(b).toLowerCase()
  return Boolean(x) && x === y
}

/** Lowercase, collapsed whitespace, punctuation stripped. Lexical only. */
export function comparableQuestionText(text: string): string {
  return normalizeSpeechWhitespace(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const MIN_QUESTION_SUFFIX_CHARS = 50

/**
 * True when two question strings are the same ask: exact whitespace match,
 * punctuation-stripped match, or one is the other plus a leading bridge.
 * Not topic similarity — no embeddings.
 */
export function questionsAreEquivalent(a: string, b: string): boolean {
  if (sameQuestionText(a, b)) return true
  const x = comparableQuestionText(a)
  const y = comparableQuestionText(b)
  if (!x || !y) return false
  if (x === y) return true
  const shorter = x.length <= y.length ? x : y
  const longer = x.length <= y.length ? y : x
  if (shorter.length < MIN_QUESTION_SUFFIX_CHARS) return false
  return longer.endsWith(` ${shorter}`) || longer.endsWith(shorter)
}

/**
 * SCRIPT_M follow-up duplicate of a prior asked string (parent or previous FU).
 * Lexical equivalence only — not topic hijack, not next-core dedupe.
 */
export function scriptMFollowUpIsDuplicateOf(opts: {
  scriptType?: string | null
  followUpQuestion: string
  priorQuestion?: string | null
}): boolean {
  if (opts.scriptType !== 'SCRIPT_M') return false
  const prior = (opts.priorQuestion ?? '').trim()
  const fu = opts.followUpQuestion.trim()
  if (!prior || !fu) return false
  return questionsAreEquivalent(fu, prior)
}

/** High-precision behavioral probes that must not follow a technical parent. */
const BEHAVIORAL_EXCLUSIVE =
  /\b(your decision|entirely your|tell me about a time|how did you feel|who (else )?on the team|individual (role|contribution)|conflict with|disagreed with)\b/i

/** High-precision technical probes that must not follow a behavioral parent. */
const TECHNICAL_EXCLUSIVE =
  /\b(time complexity|big-?o|stack overflow|heap memory|data structure|algorithm|throughput|latency|mutex|pointer arithmetic|cache invalidation)\b/i

/**
 * True when a SCRIPT_T follow-up dropped the parent topic and picked up
 * tokens that only exist in the (off-topic) candidate answer.
 *
 * Parent overlap → allow (same-topic probe, any wording).
 * No parent overlap and <2 answer-only tokens → allow (generic probe).
 * No parent overlap and ≥2 answer-only tokens → hijack (e.g. sorting parent,
 * GraphQL answer, GraphQL follow-up).
 */
function rawWords(text: string): string[] {
  return normalizeSpeechWhitespace(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function tokenSetWithJoinedCompounds(text: string): Set<string> {
  const tokens = significantQuestionTokens(text)
  const set = new Set(tokens)
  // "hash map" / "p 99" must match "hashmap" / "p99" on either side.
  // Concatenate adjacent raw words so 3-char tokens like "map" are not dropped.
  const words = rawWords(text)
  for (let i = 0; i < words.length - 1; i++) {
    const joined = `${words[i]}${words[i + 1]}`
    if (joined.length >= 4) set.add(joined)
  }
  return set
}

/** True when speech contains a question mark — ack-with-hidden-FU detector. */
export function speechContainsQuestionMark(speech: string): boolean {
  return speech.includes('?')
}

/**
 * High-precision anaphoric follow-up probes. Discourse markers only — not
 * topic keywords. A new core that shares the parent competency must not match.
 */
const ANAPHORIC_FOLLOW_UP_PROBE =
  /\b(your answer|your response|elaborat\w*|more details?|you mentioned|you said|walk me through that|tell me more about that)\b/i

export function isAnaphoricFollowUpProbe(text: string): boolean {
  return Boolean(text.trim()) && ANAPHORIC_FOLLOW_UP_PROBE.test(text)
}

export function followUpAbandonsParentTopic(opts: {
  parentQuestion: string
  candidateAnswer: string
  followUpQuestion: string
}): boolean {
  const parent = new Set(significantQuestionTokens(opts.parentQuestion))
  const answer = tokenSetWithJoinedCompounds(opts.candidateAnswer)
  const followUp = [...tokenSetWithJoinedCompounds(opts.followUpQuestion)]
  if (followUp.length === 0 || parent.size === 0) return false

  const parentHits = followUp.filter((t) => parent.has(t))
  if (parentHits.length > 0) return false

  const answerOnly = followUp.filter((t) => answer.has(t) && !parent.has(t))
  if (answerOnly.length >= 2) return true
  // Headed Chrome: "N+1" collapses to <4-char tokens, leaving a single
  // answer-only token ("graphql") plus anaphoric "more detail".
  return answerOnly.length >= 1 && isAnaphoricFollowUpProbe(opts.followUpQuestion)
}

/**
 * True when follow-up content (or declared question_type) disagrees with the
 * parent SCRIPT_M type. Does not invent a general classifier — exclusive
 * phrases + the model's own question_type field only.
 */
export function followUpConflictsWithParentType(opts: {
  parentQuestionType: 'technical' | 'behavioral' | null
  modelQuestionType?: 'technical' | 'behavioral' | null
  followUpQuestion: string
}): boolean {
  const parent = opts.parentQuestionType
  if (parent !== 'technical' && parent !== 'behavioral') return false

  const text = opts.followUpQuestion
  if (parent === 'technical' && BEHAVIORAL_EXCLUSIVE.test(text)) return true
  if (parent === 'behavioral' && TECHNICAL_EXCLUSIVE.test(text) && !BEHAVIORAL_EXCLUSIVE.test(text)) {
    return true
  }
  const declared = opts.modelQuestionType
  if (declared === 'technical' || declared === 'behavioral') {
    return declared !== parent
  }
  return false
}
