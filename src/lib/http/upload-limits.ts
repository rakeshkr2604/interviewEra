/**
 * Vercel serverless request bodies are capped (~4.5 MB including multipart overhead).
 * Keep limit under that so the route handler runs and returns JSON errors.
 */
export const MULTIPART_UPLOAD_MAX_BYTES = 4 * 1024 * 1024; // 4 MiB

const PDF_MIME = new Set(['application/pdf', 'application/x-pdf', 'application/acrobat', 'applications/vnd.pdf']);

/** Normalize browser/file-derived MIME for Supabase Storage `contentType`. */
export function normalizedUploadContentType(fileType: string, ext: '.pdf' | '.txt'): string {
  const base = (fileType ?? '').split(';')[0].trim().toLowerCase();
  if (ext === '.txt') return 'text/plain';
  if (PDF_MIME.has(base)) return 'application/pdf';
  return 'application/pdf';
}
