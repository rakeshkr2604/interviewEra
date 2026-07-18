import { createHash } from 'node:crypto';

/** SHA-256 of trimmed JD text for cache-keying JD-derived data. Empty → null. */
export function hashJobDescriptionText(jd: string | null | undefined): string | null {
  const trimmed = (jd ?? '').trim();
  if (!trimmed) return null;
  return createHash('sha256').update(trimmed).digest('hex');
}
