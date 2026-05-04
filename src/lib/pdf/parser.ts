/**
 * Shared PDF text extraction service.
 *
 * Both the resume upload route and the ATS checker server action route
 * through this module. Uses `pdfjs-dist` directly (pure JS, no native
 * binaries) so behavior is identical on Windows local + Linux Vercel
 * Lambdas. We previously layered `pdf-parse` v2 on top, but its
 * `@napi-rs/canvas` dependency was the source of production-only
 * `CORRUPT` failures.
 *
 * Throws one of the typed errors below — callers map those to
 * user-facing codes; never surface the raw exception.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

export type PDFErrorCode = 'ENCRYPTED' | 'SCANNED_NO_TEXT' | 'CORRUPT' | 'UNSUPPORTED';

export class PDFEncryptedError extends Error {
  readonly code: PDFErrorCode = 'ENCRYPTED';
  constructor(message = 'PDF is password-protected') {
    super(message);
    this.name = 'PDFEncryptedError';
  }
}

export class PDFScannedNoTextError extends Error {
  readonly code: PDFErrorCode = 'SCANNED_NO_TEXT';
  constructor(message = 'PDF contains no extractable text') {
    super(message);
    this.name = 'PDFScannedNoTextError';
  }
}

export class PDFCorruptError extends Error {
  readonly code: PDFErrorCode = 'CORRUPT';
  constructor(message = 'PDF appears corrupt') {
    super(message);
    this.name = 'PDFCorruptError';
  }
}

export class PDFUnsupportedError extends Error {
  readonly code: PDFErrorCode = 'UNSUPPORTED';
  constructor(message = 'Unsupported file type') {
    super(message);
    this.name = 'PDFUnsupportedError';
  }
}

const MIN_USEFUL_CHARS = 20;

interface PdfJsTextItem {
  str?: string;
}

/**
 * Resolve the on-disk path to pdfjs-dist's bundled font + cmap assets.
 * Without this, pdfjs computes a path relative to its own module file
 * which doesn't survive Vercel's NFT bundling for many real-world PDFs
 * that need standard font definitions or CJK cMaps.
 */
function resolvePdfJsAssetPaths(): { standardFontDataUrl: string; cMapUrl: string } {
  // require.resolve gives us the actual file path inside node_modules,
  // which Next's output-file-tracing follows.
  const req: NodeRequire = eval('require');
  const entry = req.resolve('pdfjs-dist/legacy/build/pdf.mjs');
  const buildDir = dirname(entry); // .../pdfjs-dist/legacy/build
  const pkgRoot = dirname(dirname(buildDir)); // .../pdfjs-dist
  // Trailing slash matters — pdfjs concatenates the asset filename onto it.
  return {
    standardFontDataUrl: join(pkgRoot, 'standard_fonts') + '/',
    cMapUrl: join(pkgRoot, 'cmaps') + '/',
  };
}

let cachedAssetPaths: { standardFontDataUrl: string; cMapUrl: string } | null = null;
function getAssetPaths(): { standardFontDataUrl: string; cMapUrl: string } | null {
  if (cachedAssetPaths) return cachedAssetPaths;
  try {
    cachedAssetPaths = resolvePdfJsAssetPaths();
  } catch (err) {
    console.error(
      '[pdf-parse] could not resolve pdfjs-dist asset paths',
      err instanceof Error ? err.message : err,
    );
    cachedAssetPaths = null;
  }
  return cachedAssetPaths;
}

// Touch fileURLToPath so the import isn't tree-shaken; we may need it as
// a fallback if eval-require ever stops working.
void fileURLToPath;

function classifyAndThrow(err: unknown): never {
  const ctor = (err as { constructor?: { name?: string } } | null)?.constructor?.name ?? '';
  const name = (err as { name?: string } | null)?.name ?? '';
  const message = err instanceof Error ? err.message : String(err);

  if (
    ctor === 'PasswordException' ||
    name === 'PasswordException' ||
    /password|encrypted/i.test(message)
  ) {
    throw new PDFEncryptedError();
  }
  if (
    ctor === 'InvalidPDFException' ||
    name === 'InvalidPDFException' ||
    ctor === 'MissingPDFException' ||
    name === 'MissingPDFException' ||
    ctor === 'FormatError' ||
    name === 'FormatError' ||
    /invalid pdf|missing pdf|format error|stream must|corrupt/i.test(message)
  ) {
    throw new PDFCorruptError();
  }
  throw new PDFCorruptError(`PDF could not be parsed (${message})`);
}

/**
 * Extract text from PDF bytes via pdfjs-dist. Configured for Node
 * serverless (no system fonts, no font face registration, no eval).
 */
export async function extractText(input: Uint8Array | ArrayBuffer): Promise<string> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const assets = getAssetPaths();

  let doc: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']> | null = null;
  try {
    doc = await pdfjs.getDocument({
      data: bytes,
      useSystemFonts: false,
      disableFontFace: true,
      isEvalSupported: false,
      verbosity: 0,
      ...(assets ?? {}),
      cMapPacked: true,
    }).promise;

    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items as PdfJsTextItem[])
        .map((it) => (typeof it.str === 'string' ? it.str : ''))
        .join(' ');
      text += pageText + '\n';
    }
    text = text.trim();

    if (text.length >= MIN_USEFUL_CHARS) return text;
    throw new PDFScannedNoTextError();
  } catch (err) {
    if (err instanceof PDFScannedNoTextError) throw err;
    if (err instanceof PDFEncryptedError) throw err;
    if (err instanceof PDFCorruptError) throw err;
    // Surface enough detail in Vercel logs to actually debug.
    const e = err as { name?: string; message?: string; stack?: string };
    console.error(
      '[pdf-parse] pdfjs-dist failed',
      'name=', e?.name,
      'message=', e?.message,
      'stack=', e?.stack,
    );
    classifyAndThrow(err);
    throw err; // unreachable — classifyAndThrow is `never`, but TS can't infer through try/finally
  } finally {
    if (doc) {
      try {
        await doc.destroy();
      } catch {
        /* ignore destroy errors */
      }
    }
  }
}
