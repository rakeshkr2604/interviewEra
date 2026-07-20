/**
 * Client fetch for /api/interview/script/auto-structure with one automatic retry.
 * Used by the script review flow (capture prefetch + Approve re-fire).
 */

export type AutoStructureCoaching = {
  feedback: string
  restructured_example: string[]
  technical_terms: Array<{ term: string; definition: string; pronunciation?: string }>
  missing_elements: string[]
}

export type AutoStructureResult = {
  corrected_transcript: string
  coaching_reference: AutoStructureCoaching
}

export type AutoStructureRequestBody = {
  interviewId: string
  turnIndex: number
  rawTranscript: string
  displayQuestion: string
  targetRole: string
  scriptType: string
  questionType?: string
}

const DEFAULT_TIMEOUT_MS = 22_000

async function fetchOnce(
  body: AutoStructureRequestBody,
  timeoutMs: number,
): Promise<AutoStructureResult> {
  const res = await fetch('/api/interview/script/auto-structure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) {
    throw new Error(`auto-structure ${res.status}`)
  }
  const data = (await res.json()) as { structuredAnswer: AutoStructureResult }
  return data.structuredAnswer
}

/**
 * One automatic retry on failure. Does not catch — callers handle final failure UI.
 */
export async function fetchAutoStructureWithRetry(
  body: AutoStructureRequestBody,
  opts?: { timeoutMs?: number; maxAttempts?: number },
): Promise<AutoStructureResult> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxAttempts = opts?.maxAttempts ?? 2
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fetchOnce(body, timeoutMs)
    } catch (err) {
      lastError = err
      if (attempt + 1 >= maxAttempts) break
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
