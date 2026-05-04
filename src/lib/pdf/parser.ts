/**
 * Shared PDF text extraction service.
 *
 * Both the resume upload route and the ATS checker server action route
 * through this module. Uses `pdfjs-dist/legacy` for text extraction. On
 * Node (Vercel), pdfjs touches `DOMMatrix` / `Path2D` / `ImageData` at
 * module load — we preload `@napi-rs/canvas` so those globals exist
 * before importing pdfjs (see `pdfjs-node-setup.ts`).
 *
 * Throws one of the typed errors below — callers map those to
 * user-facing codes; never surface the raw exception.
 */

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { ensurePdfJsNodeGlobalsSync } from '@/lib/pdf/pdfjs-node-setup';

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

export class PDFParserUnavailableError extends Error {
  constructor(message = 'PDF parser assets are unavailable on server') {
    super(message);
    this.name = 'PDFParserUnavailableError';
  }
}

const MIN_USEFUL_CHARS = 20;

interface PdfJsTextItem {
  str?: string;
}

/**
 * Resolve the on-disk path to pdfjs-dist's bundled font + cmap assets.
 *
 * Prefer `createRequire(import.meta.url).resolve('pdfjs-dist/package.json')`:
 * it follows normal Node resolution from the compiled server chunk, which
 * stays aligned with `serverExternalPackages` + Vercel output tracing.
 * `import.meta.resolve('pdfjs-dist/legacy/build/pdf.mjs')` can land on a
 * different real path than the traced `standard_fonts/` tree in some
 * bundled / symlinked deployments, so font fetches 404 → FormatError → CORRUPT.
 */
function resolvePdfJsPackageRootFromRequire(): string | null {
  try {
    const req = createRequire(import.meta.url);
    return dirname(req.resolve('pdfjs-dist/package.json'));
  } catch {
    return null;
  }
}

function resolvePdfJsPackageRootFromEntry(): string | null {
  try {
    const pkgSpec = ['pdfjs-dist', 'legacy', 'build', 'pdf.mjs'].join('/');
    const entryUrl = import.meta.resolve(pkgSpec);
    const entryPath = fileURLToPath(entryUrl);
    const buildDir = dirname(entryPath);
    return dirname(dirname(buildDir));
  } catch {
    return null;
  }
}

function toAssetPaths(pkgRoot: string): { standardFontDataUrl: string; cMapUrl: string } {
  return {
    standardFontDataUrl: join(pkgRoot, 'standard_fonts') + '/',
    cMapUrl: join(pkgRoot, 'cmaps') + '/',
  };
}

/** `undefined` = not computed yet; `null` = failure or missing dirs (cached). */
let cachedAssetPaths: { standardFontDataUrl: string; cMapUrl: string } | null | undefined;

function logPdfJsResolveDiag(paths: { standardFontDataUrl: string; cMapUrl: string }, reason: string): void {
  if (process.env.VERCEL !== '1') return;
  const sf = paths.standardFontDataUrl.replace(/\/$/, '');
  const cm = paths.cMapUrl.replace(/\/$/, '');
  const pkgRoot = dirname(sf);
  let resolvedViaEntry = '';
  try {
    const pkgSpec = ['pdfjs-dist', 'legacy', 'build', 'pdf.mjs'].join('/');
    resolvedViaEntry = fileURLToPath(import.meta.resolve(pkgSpec));
  } catch {
    resolvedViaEntry = '(import.meta.resolve failed)';
  }
  console.error(
    '[pdf-parse][vercel]',
    reason,
    'pkg_root=',
    pkgRoot,
    'standard_fonts_exists=',
    existsSync(sf),
    'cmaps_exists=',
    existsSync(cm),
    'legacy_pdf_entry=',
    resolvedViaEntry,
  );
}

function getAssetPaths(): { standardFontDataUrl: string; cMapUrl: string } | null {
  if (cachedAssetPaths !== undefined) return cachedAssetPaths;
  try {
    const roots = [
      resolvePdfJsPackageRootFromRequire(),
      resolvePdfJsPackageRootFromEntry(),
      join(process.cwd(), 'node_modules', 'pdfjs-dist'),
    ].filter((r): r is string => Boolean(r));

    for (const root of roots) {
      const paths = toAssetPaths(root);
      const sf = paths.standardFontDataUrl.replace(/\/$/, '');
      const cm = paths.cMapUrl.replace(/\/$/, '');
      if (existsSync(sf) && existsSync(cm)) {
        cachedAssetPaths = paths;
        return paths;
      }
    }

    if (roots.length > 0) {
      logPdfJsResolveDiag(toAssetPaths(roots[0]), 'asset directories missing after all resolution attempts');
    }
    cachedAssetPaths = null;
    return null;
  } catch (err) {
    console.error(
      '[pdf-parse] could not resolve pdfjs-dist asset paths',
      err instanceof Error ? err.message : err,
    );
    cachedAssetPaths = null;
    return null;
  }
}

function getPdfJsAssetUrlsForServer(): {
  standardFontDataUrl: string;
  cMapUrl: string;
} {
  const local = getAssetPaths();
  if (local) return local;
  if (process.env.VERCEL === '1') {
    console.error('[pdf-parse][vercel] local pdfjs standard_fonts/cmaps missing');
  }
  throw new PDFParserUnavailableError();
}

/**
 * Cheap pre-flight: a real PDF starts with `%PDF-` (plus tolerant of a
 * BOM / leading whitespace, which some browsers prepend on drag-and-drop).
 * Throwing here gives a precise UNSUPPORTED message instead of letting
 * pdfjs return a generic FormatError that we have to coerce to CORRUPT.
 */
export function assertPdfMagic(input: Uint8Array | ArrayBuffer): void {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.byteLength < 5) {
    throw new PDFCorruptError('File is too short to be a PDF');
  }
  // Skip up to 1024 leading bytes to tolerate stray whitespace / BOMs.
  const scanLimit = Math.min(bytes.byteLength - 5, 1024);
  for (let i = 0; i <= scanLimit; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 && // F
      bytes[i + 4] === 0x2d // -
    ) {
      return;
    }
  }
  throw new PDFUnsupportedError('File is not a PDF (missing %PDF- header)');
}

/** Safe structured fields for Vercel / server logs (no PDF bytes). */
function pdfJsExceptionFields(err: unknown): Record<string, string> {
  const ctor = (err as { constructor?: { name?: string } } | null)?.constructor?.name ?? '';
  const name = err instanceof Error ? err.name : (err as { name?: string } | null)?.name ?? '';
  const message = err instanceof Error ? err.message : String(err);
  const stackHead =
    err instanceof Error && err.stack
      ? err.stack.split('\n').slice(0, 4).join(' ← ')
      : '';
  return {
    err_ctor: ctor || '(unknown)',
    err_name: name || '(unknown)',
    err_message: message.slice(0, 600),
    err_stack_head: stackHead.slice(0, 900),
  };
}

function logPdfParseEvent(
  event: string,
  err: unknown,
  extra: Record<string, string | number | boolean | undefined> = {},
): void {
  const payload = {
    event,
    ...extra,
    ...pdfJsExceptionFields(err),
    vercel: process.env.VERCEL === '1',
    node: process.version,
  };
  console.error('[pdf-parse][diag]', JSON.stringify(payload));
}

function classifyAndThrow(err: unknown): never {
  const ctor = (err as { constructor?: { name?: string } } | null)?.constructor?.name ?? '';
  const name = (err as { name?: string } | null)?.name ?? '';
  const message = err instanceof Error ? err.message : String(err);

  if (
    ctor === 'PasswordException' ||
    name === 'PasswordException' ||
    /password|encrypted/i.test(message)
  ) {
    logPdfParseEvent('classify_result', err, { maps_to: 'ENCRYPTED' });
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
    logPdfParseEvent('classify_result', err, { maps_to: 'CORRUPT' });
    throw new PDFCorruptError();
  }
  logPdfParseEvent('classify_result', err, { maps_to: 'CORRUPT_generic' });
  throw new PDFCorruptError(`PDF could not be parsed (${message})`);
}

function isLikelyCorruptParseError(err: unknown): boolean {
  const ctor = (err as { constructor?: { name?: string } } | null)?.constructor?.name ?? '';
  const name = (err as { name?: string } | null)?.name ?? '';
  const message = err instanceof Error ? err.message : String(err);
  return (
    ctor === 'InvalidPDFException' ||
    name === 'InvalidPDFException' ||
    ctor === 'MissingPDFException' ||
    name === 'MissingPDFException' ||
    ctor === 'FormatError' ||
    name === 'FormatError' ||
    /invalid pdf|missing pdf|format error|stream must|corrupt/i.test(message)
  );
}

/**
 * Extract text from PDF bytes via pdfjs-dist. Configured for Node
 * serverless (no system fonts, no font face registration, no eval).
 */
export async function extractText(input: Uint8Array | ArrayBuffer): Promise<string> {
  assertPdfMagic(input);
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  ensurePdfJsNodeGlobalsSync();
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const assets = getPdfJsAssetUrlsForServer();

  let doc: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']> | null = null;

  const readText = async (
    opts: Record<string, unknown>,
  ): Promise<{ text: string; doc: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']> }> => {
    const loadedDoc = await pdfjs.getDocument(opts).promise;
    let text = '';
    for (let i = 1; i <= loadedDoc.numPages; i++) {
      const page = await loadedDoc.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items as PdfJsTextItem[])
        .map((it) => (typeof it.str === 'string' ? it.str : ''))
        .join(' ');
      text += pageText + '\n';
    }
    return { text: text.trim(), doc: loadedDoc };
  };

  try {
    const primary = await readText({
      data: bytes,
      useSystemFonts: false,
      disableFontFace: true,
      isEvalSupported: false,
      verbosity: 0,
      ...assets,
      cMapPacked: true,
    });
    doc = primary.doc;
    const text = primary.text;

    if (text.length >= MIN_USEFUL_CHARS) return text;
    throw new PDFScannedNoTextError();
  } catch (err) {
    if (err instanceof PDFScannedNoTextError) throw err;
    if (err instanceof PDFEncryptedError) throw err;
    if (err instanceof PDFCorruptError) throw err;
    if (err instanceof PDFUnsupportedError) throw err;
    if (err instanceof PDFParserUnavailableError) throw err;
    // Surface enough detail in Vercel logs to actually debug — no file bytes.
    logPdfParseEvent('primary_catch', err, {
      stage: 'after_primary_readText',
      bytes: bytes.byteLength,
      had_assets: true,
    });
    const e = err as { name?: string; message?: string; stack?: string };
    console.error(
      '[pdf-parse] pdfjs-dist failed',
      'bytes=', bytes.byteLength,
      'name=', e?.name,
      'message=', e?.message,
      'stack=', e?.stack,
    );
    if (process.env.VERCEL === '1') {
      try {
        const candidate = toAssetPaths(join(process.cwd(), 'node_modules', 'pdfjs-dist'));
        logPdfJsResolveDiag(candidate, 'parse_error_context');
      } catch {
        console.error('[pdf-parse][vercel] parse_error_context diagnostic failed');
      }
    }
    // Some serverless bundles fail when explicit font/cmap URLs are supplied.
    // Retry once without those asset URLs before classifying as CORRUPT.
    if (isLikelyCorruptParseError(err)) {
      logPdfParseEvent('retry_start', err, {
        stage: 'no_asset_urls_retry',
        bytes: bytes.byteLength,
      });
      try {
        const retry = await readText({
          data: bytes,
          useSystemFonts: false,
          disableFontFace: true,
          isEvalSupported: false,
          verbosity: 0,
        });
        doc = retry.doc;
        if (retry.text.length >= MIN_USEFUL_CHARS) return retry.text;
        logPdfParseEvent(
          'retry_insufficient_text',
          new Error(`retry extracted ${retry.text.length} chars (< ${MIN_USEFUL_CHARS})`),
          {
            stage: 'retry_ok_but_short',
            text_len: retry.text.length,
            bytes: bytes.byteLength,
          },
        );
      } catch (retryErr) {
        logPdfParseEvent('retry_failed', retryErr, {
          stage: 'no_asset_urls_retry',
          bytes: bytes.byteLength,
          original_was_corrupt_class: isLikelyCorruptParseError(err),
        });
      }
    }
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

/**
 * Strip duplicate trailing extensions (`resume.pdf.pdf` → `resume.pdf`)
 * before extension-based MIME validation. Some browsers or saved-from-
 * web flows append a second `.pdf` when the file already ends in `.pdf`.
 */
export function normalizeFileName(name: string): string {
  return name
    .replace(/(\.pdf)(?:\.pdf)+$/i, '$1')
    .replace(/(\.txt)(?:\.txt)+$/i, '$1');
}
