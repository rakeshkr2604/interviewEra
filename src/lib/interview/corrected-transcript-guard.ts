/**
 * Deterministic guardrail + word-level alignment for auto_structure
 * corrected_transcript. Shared ops feed both the ratio check and the
 * review-panel highlight / tap-to-accept UI.
 */

export const DEFAULT_MAX_DISALLOWED_RATIO = 0.15

export type CorrectedTranscriptGuardResult = {
  accepted: boolean
  /** Use this in the UI / persisted structured_answer.corrected_transcript */
  transcript: string
  diffRatio: number
  disallowedChangedWords: number
  totalWords: number
  allowedSubstitutions: number
  /** True when connect→connected style grammar polish was detected. */
  rejectedForGrammarPolish: boolean
  reason: 'accepted' | 'empty_corrected' | 'grammar_polish' | 'diff_ratio'
}

export function stripTrailingPunct(token: string): string {
  return token.replace(/^[^A-Za-z0-9#+.]+|[^A-Za-z0-9#+.]+$/g, '')
}

/** Split on whitespace; keep tokens as spoken. */
export function tokenizeWords(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)
}

export type TokenSpan = {
  text: string
  /** Inclusive start index into the source string. */
  start: number
  /** Exclusive end index into the source string. */
  end: number
}

/** Whitespace-separated tokens with source character offsets. */
export function tokenizeWithOffsets(text: string): TokenSpan[] {
  const tokens: TokenSpan[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    tokens.push({ text: m[0], start: m.index, end: m.index + m[0].length })
  }
  return tokens
}

/**
 * Heuristic: corrected token looks like a tech term / proper noun the STT
 * might have garbled (capitalized name, dotted npm-style id, ALLCAPS acronym).
 */
export function isAllowedTechOrProperNoun(token: string): boolean {
  const w = stripTrailingPunct(token)
  if (!w) return false
  if (/\./.test(w)) return true // Next.js, Node.js
  if (/^[A-Z]{2,}[0-9]*$/.test(w)) return true // API, SQL, JWT
  if (/^[A-Z][a-zA-Z0-9+#]*$/.test(w) && w.length >= 2) return true // Supabase, React
  if (/^[A-Z][a-z]+[A-Z]/.test(w)) return true // camelCase product names
  return false
}

function tokensEqualLoose(a: string, b: string): boolean {
  return stripTrailingPunct(a).toLowerCase() === stripTrailingPunct(b).toLowerCase()
}

/** connect/connected, store/stored, route/routes — grammar polish, not STT. */
export function sharesInflectionStem(aRaw: string, bRaw: string): boolean {
  const a = stripTrailingPunct(aRaw).toLowerCase()
  const b = stripTrailingPunct(bRaw).toLowerCase()
  if (a === b) return false // identical after normalize — not an inflection change
  const shorter = a.length <= b.length ? a : b
  const longer = a.length <= b.length ? b : a
  if (shorter.length < 4) return false
  if (longer.startsWith(shorter)) {
    const suffix = longer.slice(shorter.length)
    // store→stored yields suffix "d" because "store"+"d"; treat as past tense
    if (suffix === 'd' && shorter.endsWith('e')) return true
    return /^(ed|ing|s|es|tion|er|ly)$/.test(suffix)
  }
  // store → stored via drop-e + ed (when startsWith(full shorter) failed)
  if (shorter.endsWith('e') && longer.startsWith(shorter.slice(0, -1))) {
    const suffix = longer.slice(shorter.length - 1)
    return /^(ed|ing)$/.test(suffix)
  }
  return false
}

/**
 * Aligned word-diff ops with raw-text character offsets for UI highlights.
 * `rawStart`/`rawEnd` are indices into the raw string (exclusive end).
 * `suggestion` is the corrected span joined with single spaces (replace/insert).
 */
export type AlignedDiffOp =
  | {
      type: 'equal'
      rawText: string
      rawStart: number
      rawEnd: number
      a: string[]
      b: string[]
    }
  | {
      type: 'replace'
      rawText: string
      rawStart: number
      rawEnd: number
      suggestion: string
      a: string[]
      b: string[]
    }
  | {
      type: 'delete'
      rawText: string
      rawStart: number
      rawEnd: number
      a: string[]
    }
  | {
      type: 'insert'
      suggestion: string
      b: string[]
    }

/** @deprecated Prefer AlignedDiffOp via alignTranscriptDiff — kept for narrow tests. */
export type WordDiffOp =
  | { type: 'equal' }
  | { type: 'replace'; a: string[]; b: string[] }
  | { type: 'delete'; a: string[] }
  | { type: 'insert'; b: string[] }

/**
 * Full string alignment: LCS word-diff → ops with raw character offsets.
 */
export function alignTranscriptDiff(raw: string, corrected: string): AlignedDiffOp[] {
  const rawTokens = tokenizeWithOffsets(raw)
  const corrTokens = tokenizeWithOffsets(corrected)
  const n = rawTokens.length
  const m = corrTokens.length

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (tokensEqualLoose(rawTokens[i].text, corrTokens[j].text)) {
        dp[i][j] = dp[i + 1][j + 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
  }

  type Mini =
    | { kind: 'eq'; ri: number; cj: number }
    | { kind: 'del'; ri: number }
    | { kind: 'ins'; cj: number }
  const trace: Mini[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (tokensEqualLoose(rawTokens[i].text, corrTokens[j].text)) {
      trace.push({ kind: 'eq', ri: i, cj: j })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      trace.push({ kind: 'del', ri: i })
      i++
    } else {
      trace.push({ kind: 'ins', cj: j })
      j++
    }
  }
  while (i < n) {
    trace.push({ kind: 'del', ri: i })
    i++
  }
  while (j < m) {
    trace.push({ kind: 'ins', cj: j })
    j++
  }

  const ops: AlignedDiffOp[] = []
  let k = 0
  while (k < trace.length) {
    const t = trace[k]
    if (t.kind === 'eq') {
      const rt = rawTokens[t.ri]
      ops.push({
        type: 'equal',
        rawText: rt.text,
        rawStart: rt.start,
        rawEnd: rt.end,
        a: [rt.text],
        b: [corrTokens[t.cj].text],
      })
      k++
      continue
    }

    const delIdx: number[] = []
    const insIdx: number[] = []
    while (k < trace.length && trace[k].kind !== 'eq') {
      const cur = trace[k]
      if (cur.kind === 'del') delIdx.push(cur.ri)
      else if (cur.kind === 'ins') insIdx.push(cur.cj)
      k++
    }

    const a = delIdx.map((idx) => rawTokens[idx].text)
    const b = insIdx.map((idx) => corrTokens[idx].text)
    const suggestion = b.join(' ')

    if (delIdx.length && insIdx.length) {
      const first = rawTokens[delIdx[0]]
      const last = rawTokens[delIdx[delIdx.length - 1]]
      ops.push({
        type: 'replace',
        rawText: raw.slice(first.start, last.end),
        rawStart: first.start,
        rawEnd: last.end,
        suggestion,
        a,
        b,
      })
    } else if (delIdx.length) {
      const first = rawTokens[delIdx[0]]
      const last = rawTokens[delIdx[delIdx.length - 1]]
      ops.push({
        type: 'delete',
        rawText: raw.slice(first.start, last.end),
        rawStart: first.start,
        rawEnd: last.end,
        a,
      })
    } else if (insIdx.length) {
      ops.push({ type: 'insert', suggestion, b })
    }
  }

  return ops
}

/**
 * LCS-backed word alignment → replace/delete/insert ops (token arrays only).
 * Thin wrapper over alignTranscriptDiff for callers that only need a/b spans.
 */
export function wordDiffOps(rawWords: string[], correctedWords: string[]): WordDiffOp[] {
  // Reconstruct temporary strings (space-joined) so we can reuse one algo.
  // Callers that need offsets should use alignTranscriptDiff on the real strings.
  const raw = rawWords.join(' ')
  const corrected = correctedWords.join(' ')
  return alignTranscriptDiff(raw, corrected).map((op) => {
    if (op.type === 'equal') return { type: 'equal' as const }
    if (op.type === 'replace') return { type: 'replace' as const, a: op.a, b: op.b }
    if (op.type === 'delete') return { type: 'delete' as const, a: op.a }
    return { type: 'insert' as const, b: op.b }
  })
}

/**
 * Allowed STT→tech substitution:
 * - corrected side 1–2 tech/proper-noun tokens
 * - raw side 1–4 tokens (phonetic garble span)
 * - not a same-lemma inflection (connect→connected)
 */
export function isAllowedSubstitution(rawSpan: string[], correctedSpan: string[]): boolean {
  if (correctedSpan.length < 1 || correctedSpan.length > 2) return false
  if (rawSpan.length < 1 || rawSpan.length > 4) return false
  if (!correctedSpan.every(isAllowedTechOrProperNoun)) return false

  if (rawSpan.length === 1 && correctedSpan.length === 1) {
    if (sharesInflectionStem(rawSpan[0], correctedSpan[0])) return false
    return true
  }

  for (const r of rawSpan) {
    for (const c of correctedSpan) {
      if (sharesInflectionStem(r, c)) return false
    }
  }
  return true
}

function scoreOp(op: AlignedDiffOp | WordDiffOp): {
  disallowed: number
  allowedSubs: number
  grammarPolish: boolean
} {
  if (op.type === 'equal') {
    return { disallowed: 0, allowedSubs: 0, grammarPolish: false }
  }

  if (op.type === 'replace') {
    if (op.a.length === 1 && op.b.length === 1 && sharesInflectionStem(op.a[0], op.b[0])) {
      return { disallowed: 1, allowedSubs: 0, grammarPolish: true }
    }
    let grammar = false
    for (const r of op.a) {
      for (const c of op.b) {
        if (sharesInflectionStem(r, c)) grammar = true
      }
    }
    if (isAllowedSubstitution(op.a, op.b) && !grammar) {
      return { disallowed: 0, allowedSubs: 1, grammarPolish: false }
    }
    return {
      disallowed: Math.max(op.a.length, op.b.length),
      allowedSubs: 0,
      grammarPolish: grammar,
    }
  }

  if (op.type === 'delete') {
    return { disallowed: op.a.length, allowedSubs: 0, grammarPolish: false }
  }
  return { disallowed: op.b.length, allowedSubs: 0, grammarPolish: false }
}

/**
 * Apply a single replace op into raw text (accept suggestion for that span).
 */
export function applyReplaceSuggestion(
  raw: string,
  op: Extract<AlignedDiffOp, { type: 'replace' }>,
  /** Candidate-typed replacement when the LLM suggestion spelling is wrong. */
  customReplacement?: string,
): string {
  const replacement = customReplacement ?? op.suggestion
  return raw.slice(0, op.rawStart) + replacement + raw.slice(op.rawEnd)
}

/**
 * Guardrail: fall back to raw when corrected drifts beyond STT cleanup.
 * Ratio check consumes the same alignTranscriptDiff ops as the UI.
 */
export function guardCorrectedTranscript(
  rawTranscript: string,
  correctedTranscript: string,
  opts?: { maxDisallowedRatio?: number },
): CorrectedTranscriptGuardResult {
  const maxRatio = opts?.maxDisallowedRatio ?? DEFAULT_MAX_DISALLOWED_RATIO
  const rawWords = tokenizeWords(rawTranscript)
  const correctedWords = tokenizeWords(correctedTranscript)
  const totalWords = Math.max(rawWords.length, correctedWords.length, 1)

  if (!correctedTranscript.trim()) {
    return {
      accepted: false,
      transcript: rawTranscript,
      diffRatio: 1,
      disallowedChangedWords: totalWords,
      totalWords,
      allowedSubstitutions: 0,
      rejectedForGrammarPolish: false,
      reason: 'empty_corrected',
    }
  }

  if (rawWords.length === 0) {
    return {
      accepted: true,
      transcript: correctedTranscript,
      diffRatio: 0,
      disallowedChangedWords: 0,
      totalWords: 1,
      allowedSubstitutions: 0,
      rejectedForGrammarPolish: false,
      reason: 'accepted',
    }
  }

  const ops = alignTranscriptDiff(rawTranscript, correctedTranscript)
  let disallowed = 0
  let allowedSubs = 0
  let grammarPolish = false
  for (const op of ops) {
    const s = scoreOp(op)
    disallowed += s.disallowed
    allowedSubs += s.allowedSubs
    if (s.grammarPolish) grammarPolish = true
  }

  const diffRatio = disallowed / totalWords

  if (grammarPolish) {
    return {
      accepted: false,
      transcript: rawTranscript,
      diffRatio,
      disallowedChangedWords: disallowed,
      totalWords,
      allowedSubstitutions: allowedSubs,
      rejectedForGrammarPolish: true,
      reason: 'grammar_polish',
    }
  }

  if (diffRatio > maxRatio) {
    return {
      accepted: false,
      transcript: rawTranscript,
      diffRatio,
      disallowedChangedWords: disallowed,
      totalWords,
      allowedSubstitutions: allowedSubs,
      rejectedForGrammarPolish: false,
      reason: 'diff_ratio',
    }
  }

  return {
    accepted: true,
    transcript: correctedTranscript,
    diffRatio,
    disallowedChangedWords: disallowed,
    totalWords,
    allowedSubstitutions: allowedSubs,
    rejectedForGrammarPolish: false,
    reason: 'accepted',
  }
}
