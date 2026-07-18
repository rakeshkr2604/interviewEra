/**
 * Lightweight PDF page-count check (guardrail — no chunk-parse pipeline).
 *
 * IMPORTANT: pdf.js `getDocument({ data })` may transfer/detach the underlying
 * ArrayBuffer. Always pass a copy so callers can still run extractText on the
 * original bytes (Prompt 1 page-limit + extract on the same buffer caused
 * CORRUPT "File is too short" on every PDF).
 */

import { ensurePdfJsNodeGlobalsSync } from '@/lib/pdf/pdfjs-node-setup';
import { PDFTooManyPagesError } from '@/lib/pdf/parser-errors';

/** Resume upload hard limit — reject beyond; do not chunk-parse. */
export const RESUME_PDF_MAX_PAGES = 10;

/** Copy that owns its ArrayBuffer — safe to hand to pdf.js. */
function copyPdfBytes(bytes: Uint8Array): Uint8Array {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  ensurePdfJsNodeGlobalsSync();
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // Never pass the caller's buffer — pdf.js may detach it.
  const data = copyPdfBytes(bytes);
  const opts: Record<string, unknown> = {
    data,
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  };
  const doc = await pdfjs.getDocument(opts).promise;
  try {
    return doc.numPages;
  } finally {
    try {
      await doc.destroy();
    } catch {
      /* ignore */
    }
  }
}

export async function assertPdfPageLimit(
  bytes: Uint8Array,
  maxPages: number = RESUME_PDF_MAX_PAGES,
): Promise<number> {
  const pageCount = await getPdfPageCount(bytes);
  if (pageCount > maxPages) {
    throw new PDFTooManyPagesError(pageCount, maxPages);
  }
  return pageCount;
}
