/**
 * Client-side gate: skip /api/tts once ElevenLabs is known unavailable.
 * Prevents retry storms (401 quota, 429 rate limits) during avatar interviews.
 */

const STORAGE_KEY = 'ie-el-tts-blocked'

export interface ElevenLabsTtsBlockState {
  reason: string
  blocked_at: number
  until: number | null
}

let memoryBlocked = false
let memoryUntil: number | null = null

function readStoredBlock(): ElevenLabsTtsBlockState | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ElevenLabsTtsBlockState
  } catch {
    return null
  }
}

function writeStoredBlock(state: ElevenLabsTtsBlockState): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota / private mode */
  }
}

/** True when ElevenLabs proxy should not be called (use browser TTS instead). */
export function isElevenLabsTtsBlocked(now = Date.now()): boolean {
  if (memoryBlocked) {
    if (memoryUntil != null && now >= memoryUntil) {
      clearElevenLabsTtsBlock()
      return false
    }
    return true
  }

  const stored = readStoredBlock()
  if (!stored) return false

  if (stored.until != null && now >= stored.until) {
    clearElevenLabsTtsBlock()
    return false
  }

  memoryBlocked = true
  memoryUntil = stored.until
  return true
}

/**
 * Block ElevenLabs for this tab session (or cooldown for transient 429).
 * @param cooldownMs omit for session-long block (until tab close)
 */
export function markElevenLabsTtsBlocked(reason: string, cooldownMs?: number): void {
  const until = cooldownMs != null ? Date.now() + cooldownMs : null
  memoryBlocked = true
  memoryUntil = until
  writeStoredBlock({
    reason,
    blocked_at: Date.now(),
    until,
  })
}

export function clearElevenLabsTtsBlock(): void {
  memoryBlocked = false
  memoryUntil = null
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* */
  }
}

/** Map proxy/upstream status to block duration. */
export function markElevenLabsBlockedForHttpStatus(status: number, reason: string): void {
  if (status === 429) {
    markElevenLabsTtsBlocked(reason, 120_000)
    return
  }
  if (status === 401 || status === 402 || status === 403) {
    markElevenLabsTtsBlocked(reason)
    return
  }
  if (status >= 500) {
    markElevenLabsTtsBlocked(reason, 60_000)
  }
}
