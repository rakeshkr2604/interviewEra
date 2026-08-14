/**
 * Speech ↔ display_question helpers.
 *
 * display_question = canonical UI/scoring question
 * speech = optional short bridge + EXACT display_question (server-normalized)
 *
 * Deterministic only — no fuzzy embeddings, no extra LLM call.
 */

/** Collapse runs of whitespace; trim ends. */
export function normalizeSpeechWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** Common function/stop words that should not drive intent overlap. */
const STOPWORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'been',
  'before',
  'being',
  'between',
  'could',
  'describe',
  'during',
  'each',
  'example',
  'from',
  'give',
  'have',
  'into',
  'just',
  'like',
  'made',
  'make',
  'more',
  'most',
  'only',
  'other',
  'please',
  'share',
  'should',
  'some',
  'such',
  'tell',
  'than',
  'that',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'time',
  'very',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'with',
  'would',
  'your',
  'yourself',
])

/** Significant tokens (≥4 chars, non-stopword) for overlap checks. */
export function significantQuestionTokens(text: string): string[] {
  return normalizeSpeechWhitespace(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
}

/**
 * True when speech looks like an interviewer question / prompt
 * (not a pure acknowledgment).
 */
export function speechLooksLikeQuestion(speech: string): boolean {
  const s = normalizeSpeechWhitespace(speech)
  if (!s) return false
  if (/\?/.test(s)) return true
  return /\b(tell me|walk me|describe|explain|share a|give me|can you|could you|would you|what was|what were|what did|how did|how do|how would|why did|why do)\b/i.test(
    s,
  )
}

/**
 * Legacy exact-suffix helper (bridge + identical display_question).
 * Kept for tests / callers that still need the strict check.
 */
export function speechCarriesExactDisplayQuestion(
  speech: string,
  displayQuestion: string,
): boolean {
  const s = normalizeSpeechWhitespace(speech)
  const q = normalizeSpeechWhitespace(displayQuestion)
  if (!q) return false
  if (s === q) return true
  if (!s.endsWith(q)) return false

  const prefix = s.slice(0, s.length - q.length)
  if (!prefix) return true
  return /[.!?…]"?\s*$/.test(prefix) || /\s$/.test(prefix)
}

/**
 * Optional bridge text before an exact display_question suffix.
 * Returns null when the exact contract is violated.
 */
export function spokenBridgeBeforeDisplayQuestion(
  speech: string,
  displayQuestion: string,
): string | null {
  if (!speechCarriesExactDisplayQuestion(speech, displayQuestion)) return null
  const s = normalizeSpeechWhitespace(speech)
  const q = normalizeSpeechWhitespace(displayQuestion)
  if (s === q) return ''
  return s.slice(0, s.length - q.length).trim()
}

/**
 * SCRIPT_H production invariant: speech must ask the same question *intent*
 * as display_question. Exact equality / exact suffix still pass; natural
 * paraphrases and short conversational bridges also pass. Unrelated topics
 * and non-questions fail.
 */
export function speechAlignsWithDisplayQuestion(
  speech: string,
  displayQuestion: string,
): boolean {
  const s = normalizeSpeechWhitespace(speech)
  const q = normalizeSpeechWhitespace(displayQuestion)
  if (!s || !q) return false

  // Exact / exact-suffix (optional bridge) always OK.
  if (speechCarriesExactDisplayQuestion(s, q)) return true

  if (!speechLooksLikeQuestion(s)) return false

  const qTokens = significantQuestionTokens(q)
  const sTokenSet = new Set(significantQuestionTokens(s))

  if (qTokens.length === 0) {
    const qCore = q
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const sCore = s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return sCore.includes(qCore)
  }

  const hits = qTokens.filter((t) => sTokenSet.has(t)).length
  const ratio = hits / qTokens.length
  // Majority of canonical key tokens must appear in speech.
  const minHits = Math.min(2, qTokens.length)
  return hits >= minHits && ratio >= 0.55
}

function splitSpokenSentences(text: string): string[] {
  const s = normalizeSpeechWhitespace(text).replace(/\s+[—–]\s+/g, '. ')
  if (!s) return []
  const parts = s.match(/[^.!?…]+(?:[.!?…]+|$)/g)
  if (!parts) return [s]
  return parts.map((p) => p.trim()).filter(Boolean)
}

function sentenceLooksLikeSpokenQuestion(sentence: string): boolean {
  if (speechLooksLikeQuestion(sentence)) return true
  return /\b(walk through|what is|what's|how does|how can|how would you)\b/i.test(
    sentence,
  )
}

/**
 * Leading acknowledgment/transition before the first question-like sentence.
 * Empty when speech is only a (possibly paraphrased) question.
 */
export function extractSpokenBridge(speech: string, displayQuestion: string): string {
  const s = normalizeSpeechWhitespace(speech)
  const q = normalizeSpeechWhitespace(displayQuestion)
  if (!s) return ''
  if (q && speechCarriesExactDisplayQuestion(s, q)) {
    return spokenBridgeBeforeDisplayQuestion(s, q) ?? ''
  }

  const sentences = splitSpokenSentences(s)
  const firstQ = sentences.findIndex((sent) => sentenceLooksLikeSpokenQuestion(sent))
  if (firstQ === -1) {
    return sentenceLooksLikeSpokenQuestion(s) ? '' : s
  }
  return sentences.slice(0, firstQ).join(' ').trim()
}

function joinBridgeAndQuestion(bridge: string, question: string): string {
  const b = normalizeSpeechWhitespace(bridge)
  const q = normalizeSpeechWhitespace(question)
  if (!b) return q
  if (speechCarriesExactDisplayQuestion(b, q)) return b
  if (/[.!?…—–:\-]$/.test(b)) return `${b} ${q}`
  return `${b}. ${q}`
}

/**
 * Shared H/T/M contract: TTS question portion === display_question.
 * Keeps a short leading bridge; drops independently paraphrased questions.
 */
export function canonicalizeQuestionSpeech(
  speech: string,
  displayQuestion: string,
): string {
  const q = normalizeSpeechWhitespace(displayQuestion)
  if (!q) return normalizeSpeechWhitespace(speech)
  const s = normalizeSpeechWhitespace(speech)
  if (!s) return q
  if (speechCarriesExactDisplayQuestion(s, q)) return s
  return joinBridgeAndQuestion(extractSpokenBridge(s, q), q)
}

export function canonicalizeTurnSpeech<
  T extends { speech: string; display_question: string | null; is_question: boolean },
>(turn: T): T {
  if (!turn.is_question) return turn
  const q =
    typeof turn.display_question === 'string'
      ? normalizeSpeechWhitespace(turn.display_question)
      : ''
  if (!q) return turn
  const speech = canonicalizeQuestionSpeech(turn.speech, q)
  if (speech === turn.speech) return turn
  return { ...turn, speech, display_question: q }
}
