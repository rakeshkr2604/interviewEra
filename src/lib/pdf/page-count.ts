/**
 * Lightweight PDF page-count check (guardrail — no chunk-parse pipeline).
 *
 * IMPORTANT:
 * 1) pdf.js `getDocument({ data })` may transfer/detach the underlying ArrayBuffer.
 *    Always pass a copy so callers can still run extractText on the original bytes.
 * 2) On Vercel, pdf.js needs `@napi-rs/canvas` globals. When those are missing,
 *    match extractText: use pdf-parse for page count instead of throwing PARSER_RUNTIME
 *    (production regression after page-limit was added to upload).
 */

import { ensurePdfJsNodeGlobalsSync, hasPdfJsNodeGlobalsReady } from '@/lib/pdf/pdfjs-node-setup';
import { PDFParserRuntimeError, PDFTooManyPagesError } from '@/lib/pdf/parser-errors';

/** Resume upload hard limit — reject beyond; do not chunk-parse. */
export const RESUME_PDF_MAX_PAGES = 10;

/** Copy that owns its ArrayBuffer — safe to hand to pdf.js. */
function copyPdfBytes(bytes: Uint8Array): Uint8Array {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

async function getPdfPageCountViaPdfParse(bytes: Uint8Array): Promise<number> {
  const imported = (await import('pdf-parse')) as {
    default?: (buffer: Buffer) => Promise<{ numpages?: number; numPages?: number }>;
  };
  const pdfParse = imported.default;
  if (typeof pdfParse !== 'function') {
    throw new PDFParserRuntimeError('pdf-parse unavailable for page count');
  }
  const result = await pdfParse(Buffer.from(bytes));
  const n =
    typeof result?.numpages === 'number'
      ? result.numpages
      : typeof result?.numPages === 'number'
        ? result.numPages
        : NaN;
  if (!Number.isFinite(n) || n < 1) {
    throw new PDFParserRuntimeError('Could not determine PDF page count');
  }
  return Math.floor(n);
}

async function getPdfPageCountViaPdfJs(bytes: Uint8Array): Promise<number> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = copyPdfBytes(bytes);
  const opts: Record<string, unknown> = {
    data,
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  };
  const loadingTask = pdfjs.getDocument(opts);
  const doc = await loadingTask.promise;
  try {
    const n = doc.numPages;
    if (typeof n !== 'number' || n < 1) {
      throw new PDFParserRuntimeError('pdf.js returned invalid page count');
    }
    return n;
  } finally {
    try {
      await loadingTask.destroy();
    } catch {
      /* ignore */
    }
  }
}

export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  ensurePdfJsNodeGlobalsSync();
  const canvasReady = hasPdfJsNodeGlobalsReady();

  // Same policy as extractText: never import/run pdf.js when canvas globals are missing.
  if (!canvasReady) {
    console.warn('[pdf-page-count] canvas globals missing — using pdf-parse for page count');
    return getPdfPageCountViaPdfParse(bytes);
  }

  try {
    return await getPdfPageCountViaPdfJs(bytes);
  } catch (err) {
    if (err instanceof PDFParserRuntimeError) {
      // fall through to pdf-parse
    } else {
      console.warn(
        '[pdf-page-count] pdf.js failed, falling back to pdf-parse',
        err instanceof Error ? err.message : err,
      );
    }
    try {
      return await getPdfPageCountViaPdfParse(bytes);
    } catch (fbErr) {
      console.error(
        '[pdf-page-count] pdf-parse fallback failed',
        fbErr instanceof Error ? fbErr.message : fbErr,
      );
      throw fbErr instanceof PDFParserRuntimeError
        ? fbErr
        : new PDFParserRuntimeError(
            fbErr instanceof Error ? fbErr.message : 'PDF page count failed',
          );
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
