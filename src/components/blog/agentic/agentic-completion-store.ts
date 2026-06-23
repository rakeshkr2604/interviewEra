const STORAGE_KEY = 'ie-agentic-hub-completed-chapters'

const listeners = new Set<() => void>()
let cache: ReadonlySet<string> | null = null

function readStored(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(parsed)
  } catch {
    return new Set()
  }
}

function writeStored(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    /* ignore quota */
  }
}

export function getCompletionSnapshot(): ReadonlySet<string> {
  if (cache === null) {
    cache = readStored()
  }
  return cache
}

export function getServerCompletionSnapshot(): ReadonlySet<string> {
  return new Set()
}

export function subscribeCompletion(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function markChapterComplete(id: string) {
  const current = new Set(readStored())
  if (current.has(id)) return
  current.add(id)
  writeStored(current)
  cache = current
  listeners.forEach((listener) => listener())
}
