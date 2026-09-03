/** Browser-local Coach session log (duration / camera for the candidate). */

export type CoachSessionRecord = {
  id: string
  roomId: string
  startedAt: string
  endedAt: string | null
  durationSeconds: number
  cameraOn: boolean
  status: 'active' | 'completed'
}

const STORAGE_KEY = 'ie.coach.session-history.v1'
const MAX_RECORDS = 50

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadSessionHistory(): CoachSessionRecord[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as CoachSessionRecord[]
  } catch {
    return []
  }
}

function saveSessionHistory(records: CoachSessionRecord[]): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)))
  } catch {
    // Quota / private mode — ignore.
  }
}

export function startSessionRecord(roomId: string, cameraOn: boolean): CoachSessionRecord {
  const record: CoachSessionRecord = {
    id: `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    roomId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationSeconds: 0,
    cameraOn,
    status: 'active',
  }
  const next = [record, ...loadSessionHistory().filter((r) => r.status !== 'active')]
  saveSessionHistory(next)
  return record
}

export function completeSessionRecord(
  sessionId: string,
  durationSeconds: number,
  cameraOn: boolean
): CoachSessionRecord | null {
  const records = loadSessionHistory()
  const idx = records.findIndex((r) => r.id === sessionId)
  if (idx < 0) return null
  const updated: CoachSessionRecord = {
    ...records[idx],
    endedAt: new Date().toISOString(),
    durationSeconds: Math.max(0, durationSeconds),
    cameraOn,
    status: 'completed',
  }
  const next = [...records]
  next[idx] = updated
  saveSessionHistory(next)
  return updated
}

export function clearSessionHistory(): void {
  if (!canUseStorage()) return
  window.localStorage.removeItem(STORAGE_KEY)
}

export function formatSessionClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
