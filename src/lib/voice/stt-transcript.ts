import { getPlatformContext } from '@/lib/voice/lifecycle-log'

/** Normalize for duplicate comparison (case/whitespace insensitive). */
export function normalizeTranscriptToken(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function isAndroidSttPlatform(): boolean {
  const { platform } = getPlatformContext()
  return platform === 'android'
}

export type MergeFinalAction = 'ignore' | 'replace' | 'append'

export type MergeFinalResult = {
  text: string
  action: MergeFinalAction
  reason: string
}

function collapseWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

/** Word overlap at boundary between accumulated final and incoming segment. */
function suffixPrefixWordOverlap(accumulated: string, incoming: string): number {
  const aWords = collapseWhitespace(accumulated).split(' ')
  const bWords = collapseWhitespace(incoming).split(' ')
  const max = Math.min(aWords.length, bWords.length)
  for (let len = max; len > 0; len--) {
    const suffix = aWords.slice(-len).join(' ').toLowerCase()
    const prefix = bWords.slice(0, len).join(' ').toLowerCase()
    if (suffix === prefix) return len
  }
  return 0
}

/**
 * Merge one final STT segment into accumulated final text.
 * Android Chrome often emits cumulative finals (full utterance each time) —
 * replace instead of append to prevent "Hello world Hello world" duplication.
 */
export function mergeFinalTranscript(
  currentFinal: string,
  incoming: string,
  opts?: { androidCumulative?: boolean },
): MergeFinalResult {
  const inc = collapseWhitespace(incoming)
  if (!inc) return { text: currentFinal, action: 'ignore', reason: 'empty_incoming' }

  const cur = collapseWhitespace(currentFinal)
  if (!cur) return { text: inc, action: 'replace', reason: 'initial' }

  const nCur = normalizeTranscriptToken(cur)
  const nInc = normalizeTranscriptToken(inc)

  if (nInc === nCur) {
    return { text: cur, action: 'ignore', reason: 'duplicate_exact' }
  }

  // Cumulative final: incoming is a superset prefix of what we already have.
  if (nInc.startsWith(nCur) && inc.length >= cur.length) {
    return { text: inc, action: 'replace', reason: 'cumulative_prefix' }
  }

  if (nCur.includes(nInc)) {
    return { text: cur, action: 'ignore', reason: 'already_contained' }
  }

  if (opts?.androidCumulative !== false && (isAndroidSttPlatform() || opts?.androidCumulative)) {
    if (nInc.includes(nCur) && inc.length > cur.length) {
      return { text: inc, action: 'replace', reason: 'android_cumulative_superset' }
    }
  }

  const overlap = suffixPrefixWordOverlap(cur, inc)
  if (overlap > 0) {
    const tailWords = inc.split(/\s+/).slice(overlap)
    const tail = tailWords.join(' ').trim()
    if (!tail) {
      return { text: cur, action: 'ignore', reason: 'overlap_duplicate' }
    }
    const merged = collapseWhitespace(`${cur} ${tail}`)
    if (normalizeTranscriptToken(merged) === nCur) {
      return { text: cur, action: 'ignore', reason: 'overlap_no_new_words' }
    }
    return { text: merged, action: 'append', reason: 'overlap_append' }
  }

  const merged = collapseWhitespace(`${cur} ${inc}`)
  if (normalizeTranscriptToken(merged) === nCur || normalizeTranscriptToken(merged) === nInc) {
    return { text: cur.length >= inc.length ? cur : inc, action: 'ignore', reason: 'merge_duplicate' }
  }

  return { text: merged, action: 'append', reason: 'append_distinct' }
}

/**
 * True when an interim chunk adds no new information beyond accumulated final.
 * Allows cumulative interims that extend the final (e.g. "hello hello" → "hello hello world").
 */
export function shouldSuppressInterimAsDuplicate(finalText: string, interim: string): boolean {
  const nFinal = normalizeTranscriptToken(finalText)
  const nInterim = normalizeTranscriptToken(interim)
  if (!nFinal || !nInterim) return false
  if (nFinal === nInterim) return true
  if (nInterim.startsWith(nFinal) && nInterim.length > nFinal.length) return false
  if (nFinal.includes(nInterim) && nInterim.length < nFinal.length) return true
  return false
}

/** Hash for deduplicating identical consecutive STT result events. */
export function sttResultEventHash(finalPart: string, interimPart: string): string {
  return normalizeTranscriptToken(`${finalPart}\x1f${interimPart}`)
}

/** Skip promoting interim on session end if it duplicates accumulated final. */
export function shouldPromoteInterimOnEnd(finalText: string, interim: string): boolean {
  const pending = collapseWhitespace(interim)
  if (!pending) return false
  const cur = collapseWhitespace(finalText)
  if (!cur) return true
  const nCur = normalizeTranscriptToken(cur)
  const nPending = normalizeTranscriptToken(pending)
  if (nPending === nCur) return false
  if (nCur.includes(nPending)) return false
  if (nPending.startsWith(nCur) && pending.length >= cur.length) return true
  return !nCur.endsWith(nPending)
}
