export type CopyTextResult = 'copied' | 'failed'

/** Copy plain text with the async clipboard API. Returns failed when it is unavailable or rejected. */
export async function copyText(text: string): Promise<CopyTextResult> {
  if (!text.trim()) return 'failed'
  try {
    const clipboard = globalThis.navigator?.clipboard
    if (!clipboard || typeof clipboard.writeText !== 'function') return 'failed'
    await clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
