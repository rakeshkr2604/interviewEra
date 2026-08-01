/**
 * Canonical resume file presence and download access helpers (Phase 2.5).
 *
 * Runtime access path: storage_path → GET /api/resume/:id/file → 120s signed URL.
 * Durable public file_url is deprecated and must not drive product behavior.
 */

/** True when a Storage object key is present (canonical hasFile rule). */
export function resumeHasFile(storagePath: string | null | undefined): boolean {
  return typeof storagePath === 'string' && storagePath.trim().length > 0;
}

/** Authenticated download endpoint path (does not mint a signed URL by itself). */
export function resumeFileDownloadPath(resumeId: string): string {
  return `/api/resume/${resumeId}/file`;
}
