const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'mailto:']);

/** Validate external community URLs — blocks javascript: and other unsafe schemes. */
export function sanitizeCommunityUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
    return trimmed;
  } catch {
    return null;
  }
}

export function isRenderablePlatformUrl(url: string, comingSoon: boolean): boolean {
  if (comingSoon) return true;
  return sanitizeCommunityUrl(url) !== null;
}
