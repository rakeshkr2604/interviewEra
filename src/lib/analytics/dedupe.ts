/**
 * Client-side once-per-session dedupe for analytics events.
 */

const memoryDedupe = new Set<string>();

export function markAnalyticsDedupeKey(
  storagePrefix: string,
  dedupeKey: string,
): boolean {
  const fullKey = `${storagePrefix}${dedupeKey}`;
  if (memoryDedupe.has(fullKey)) return false;

  try {
    if (sessionStorage.getItem(fullKey)) return false;
    sessionStorage.setItem(fullKey, '1');
  } catch {
    /* private mode — in-memory only */
  }

  memoryDedupe.add(fullKey);
  return true;
}

export function resetAnalyticsDedupeForTests(): void {
  memoryDedupe.clear();
}
