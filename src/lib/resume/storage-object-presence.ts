export type StorageObjectPresence = 'verified' | 'missing' | 'inaccessible';

/**
 * Classify object presence from a Storage folder listing result.
 * Used by the Phase 2 backfill after listing `resumes/{...}/`.
 */
export function presenceFromFolderListing(
  fileName: string,
  listing: { ok: false } | { ok: true; names: readonly string[] },
): StorageObjectPresence {
  if (!fileName || fileName.includes('/') || fileName.includes('..')) {
    return 'inaccessible';
  }
  if (!listing.ok) return 'inaccessible';
  return listing.names.includes(fileName) ? 'verified' : 'missing';
}
