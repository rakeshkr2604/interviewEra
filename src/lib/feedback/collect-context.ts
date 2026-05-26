/**
 * Feedback context collector — runs client-side only.
 *
 * Gathers two categories of signal:
 *  1. Browser / device / permissions — collected live from Web APIs.
 *  2. Interview session — read from localStorage (written by the interview
 *     session page when data loads and when the session completes).
 *
 * Both categories are ALWAYS present in the payload (null when unknown).
 * No field is ever omitted so the email template and DB schema can stay stable.
 */

// ─── Exported types ───────────────────────────────────────────────────────────

export interface FeedbackSessionContext {
  // ── Interview session ──────────────────────────────────────────────────────
  session_id: string | null
  interview_role: string | null
  interview_type: string | null          // 'technical' | 'hr_behavioral' | 'mixed'
  difficulty_level: string | null        // 'easy' | 'medium' | 'hard'
  interview_duration_seconds: number | null

  // ── Navigation ─────────────────────────────────────────────────────────────
  current_page: string

  // ── Browser & device ───────────────────────────────────────────────────────
  browser_name: string
  os: string
  device_type: 'mobile' | 'tablet' | 'desktop'
  screen_size: string                    // e.g. "1920x1080"

  // ── Network ────────────────────────────────────────────────────────────────
  network_type: string | null            // '4g' | '3g' | 'wifi' | null

  // ── Permissions & capabilities ─────────────────────────────────────────────
  mic_permission_status: string          // 'granted' | 'denied' | 'prompt' | 'unknown'
  camera_permission_status: string
  speech_recognition_supported: boolean
  speech_recognition_enabled: boolean    // supported + mic is granted
}

/** Written by the interview session page into localStorage. */
export interface StoredSessionCtx {
  session_id: string
  interview_role: string
  interview_type: string
  difficulty_level: string
  /** epoch ms — written when session data loads. */
  session_started_at: number
  /** epoch ms — written when the session completes. Absent if still in-session. */
  session_ended_at?: number
}

// ─── LocalStorage key ─────────────────────────────────────────────────────────

const SESSION_CTX_KEY = 'ie-last-session-ctx'

/** Call from the interview session page. */
export function storeSessionContext(ctx: StoredSessionCtx): void {
  try {
    localStorage.setItem(SESSION_CTX_KEY, JSON.stringify(ctx))
  } catch {
    // localStorage can be blocked (private browsing / quota exceeded)
  }
}

/** Patch only the fields supplied; preserves all other stored fields. */
export function patchSessionContext(patch: Partial<StoredSessionCtx>): void {
  try {
    const raw = localStorage.getItem(SESSION_CTX_KEY)
    const existing: Partial<StoredSessionCtx> = raw ? (JSON.parse(raw) as Partial<StoredSessionCtx>) : {}
    localStorage.setItem(SESSION_CTX_KEY, JSON.stringify({ ...existing, ...patch }))
  } catch {
    // ignore
  }
}

function readStoredSession(): StoredSessionCtx | null {
  try {
    const raw = localStorage.getItem(SESSION_CTX_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredSessionCtx
  } catch {
    return null
  }
}

// ─── UA parsers (no external libraries) ──────────────────────────────────────

function detectBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\/|Opera/.test(ua)) return 'Opera'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari'
  return 'Unknown'
}

function detectOS(ua: string): string {
  if (/Windows NT 10\.0/.test(ua)) return 'Windows 10/11'
  if (/Windows/.test(ua)) return 'Windows'
  if (/iPhone|iPad/.test(ua)) return 'iOS'
  if (/Mac OS X/.test(ua)) return 'macOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown'
}

function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent
  if (/iPad|Android(?!.*Mobile)/.test(ua)) return 'tablet'
  if (/Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/.test(ua)) return 'mobile'
  return 'desktop'
}

function detectNetworkType(): string | null {
  type NavConn = Navigator & {
    connection?: { effectiveType?: string; type?: string }
  }
  const conn = (navigator as NavConn).connection
  return conn?.effectiveType ?? conn?.type ?? null
}

// ─── Async permission helper ──────────────────────────────────────────────────

async function queryPermission(name: string): Promise<string> {
  try {
    const res = await navigator.permissions.query({ name: name as PermissionName })
    return res.state
  } catch {
    return 'unknown'
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Collect all feedback context.  Must be called from a client component
 * (runs in the browser only).  Safe to call concurrently — each invocation
 * is independent.
 */
export async function collectFeedbackContext(): Promise<FeedbackSessionContext> {
  const ua = navigator.userAgent
  const stored = readStoredSession()

  const [micPerm, camPerm] = await Promise.all([
    queryPermission('microphone'),
    queryPermission('camera'),
  ])

  const speechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // Duration: prefer session_ended_at diff; fall back to now - session_started_at
  let durationSeconds: number | null = null
  if (stored?.session_started_at) {
    const end = stored.session_ended_at ?? Date.now()
    durationSeconds = Math.round((end - stored.session_started_at) / 1000)
  }

  return {
    session_id: stored?.session_id ?? null,
    interview_role: stored?.interview_role ?? null,
    interview_type: stored?.interview_type ?? null,
    difficulty_level: stored?.difficulty_level ?? null,
    interview_duration_seconds: durationSeconds,

    current_page: window.location.href,

    browser_name: detectBrowser(ua),
    os: detectOS(ua),
    device_type: detectDeviceType(),
    screen_size: `${window.screen.width}x${window.screen.height}`,

    network_type: detectNetworkType(),

    mic_permission_status: micPerm,
    camera_permission_status: camPerm,
    speech_recognition_supported: speechSupported,
    speech_recognition_enabled: speechSupported && micPerm === 'granted',
  }
}
