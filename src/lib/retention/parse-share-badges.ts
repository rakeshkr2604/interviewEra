import { BADGE_KEYS, type BadgeKey } from './constants'

const HAVE = new Set<string>(BADGE_KEYS)

/** Parse comma-separated badge keys from a share URL (?badges=a,b). Drops unknown tokens. */
export function parseBadgeKeysFromShareParam(raw: string | undefined): BadgeKey[] {
  if (!raw || typeof raw !== 'string') return [];
  const out: BadgeKey[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    const k = part.trim();
    if (!HAVE.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(k as BadgeKey);
  }
  return out;
}
