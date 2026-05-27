/**
 * Shared PDF text extraction service (pdfjs-dist legacy + fallback pdf-parse).
 *
 * Uses `pdfjs-dist/legacy` first; `@napi-rs/canvas` fills DOM globals on Node
 * before pdfjs imports (pdfjs-node-setup.ts). Production serverless bundles can
 * still miss cmap/font trees or canvas binaries — fallback uses `pdf-parse`
 * with a distinct engine chain.
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { PDFParseUserCode } from '@/lib/pdf/parser-errors';
import {
  PDFCorruptError,
  PDFEncryptedError,
  PDFParserRuntimeError,
  PDFParserUnavailableError,
  PDFScannedNoTextError,
  PDFUnsupportedError,
} from '@/lib/pdf/parser-errors';
import { isPdfParserDiagnosticsEnabled } from '@/lib/debug/upload-diagnostics';
import { ensurePdfJsNodeGlobalsSync, hasPdfJsNodeGlobalsReady } from '@/lib/pdf/pdfjs-node-setup';
import { extractTextWithOcr } from '@/lib/pdf/ocr-fallback';

export type { PDFParseUserCode };

/** @deprecated Prefer PDFParseUserCode — narrow codes for typed message maps on some routes. */
export type PDFErrorCode = Extract<
  PDFParseUserCode,
  'ENCRYPTED' | 'SCANNED_NO_TEXT' | 'CORRUPT' | 'UNSUPPORTED'
>;

export type PdfExtractDiagContext = {
  mimeType?: string;
  fileNameHint?: string;
  vercelId?: string;
  source?: string;
  userId?: string;
};

async function tryOcrFallback(
  bytes: Uint8Array,
  diag?: PdfExtractDiagContext,
): Promise<string | null> {
  const result = await extractTextWithOcr(bytes, { userId: diag?.userId, source: diag?.source });
  if (!result?.text || result.text.length < MIN_USEFUL_CHARS) return null;
  logPdfParseDiag('ocr_fallback_ok', null, {
    chars: result.text.length,
    pages: result.pagesProcessed,
    durationMs: result.durationMs,
    partial: result.partial,
  }, 'info');
  return result.text;
}

export {
  PDFCorruptError,
  PDFEncryptedError,
  PDFParserRuntimeError,
  PDFParserUnavailableError,
  PDFScannedNoTextError,
  PDFUnsupportedError,
};

/** Below this, treat PDF as image-only / unreadable (security floor stays low). */
const MIN_USEFUL_CHARS = 12;

/** Root of the installed `pdfjs-dist` package (server: project `node_modules`). */
function pdfJsPackageRootCandidates(): string[] {
  return [join(process.cwd(), 'node_modules', 'pdfjs-dist')];
}

interface PdfJsTextItem {
  str?: string;
}

/**
 * Operational: correlate Vercel Runtime Logs → filter `[pdf-parse][diag]` and
 * `[pdf-parse][attempt]` alongside `deploymentId`/`vercel_sha`/`vercel_region`
 * from the deployment record and Request `x-vercel-id`.
 */
export function pdfParseOperationalHint(): string {
  return '[pdf-parse][operational] In Vercel → Logs: filter `[pdf-parse][diag]` or `[pdf-parse][attempt]`; match Request ID from network tab `x-vercel-id`; compare Deployment Git SHA.';
}

function toAssetPaths(pkgRoot: string): { standardFontDataUrl: string; cMapUrl: string } {
  return {
    standardFontDataUrl: join(pkgRoot, 'standard_fonts') + '/',
    cMapUrl: join(pkgRoot, 'cmaps') + '/',
  };
}

let cachedAssetPaths: { standardFontDataUrl: string; cMapUrl: string } | null | undefined;

function logPdfJsResolveDiag(paths: { standardFontDataUrl: string; cMapUrl: string }, reason: string): void {
  if (process.env.VERCEL !== '1') return;
  const sf = paths.standardFontDataUrl.replace(/\/$/, '');
  const cm = paths.cMapUrl.replace(/\/$/, '');
  const pkgRoot = dirname(sf);
  const legacy = join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs');
  const resolvedViaEntry = existsSync(legacy) ? legacy : '(legacy entry missing)';
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
    'nodejs_canvas_ready=',
    hasPdfJsNodeGlobalsReady(),
  );
}

function getAssetPaths(): { standardFontDataUrl: string; cMapUrl: string } | null {
  if (cachedAssetPaths !== undefined) return cachedAssetPaths;
  try {
    const roots = pdfJsPackageRootCandidates();

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

export function assertPdfMagic(input: Uint8Array | ArrayBuffer): void {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.byteLength < 5) {
    throw new PDFCorruptError('File is too short to be a PDF');
  }
  const scanLimit = Math.min(bytes.byteLength - 5, 1024);
  for (let i = 0; i <= scanLimit; i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    ) {
      return;
    }
  }
  throw new PDFUnsupportedError('File is not a PDF (missing %PDF- header)');
}

function pdfJsExceptionFields(err: unknown): Record<string, string> {
  const ctor = (err as { constructor?: { name?: string } } | null)?.constructor?.name ?? '';
  const name = err instanceof Error ? err.name : (err as { name?: string } | null)?.name ?? '';
  const message = err instanceof Error ? err.message : String(err);
  const stackHead =
    err instanceof Error && err.stack ? err.stack.split('\n').slice(0, 4).join(' ← ') : '';
  return {
    err_ctor: ctor || '(unknown)',
    err_name: name || '(unknown)',
    err_message: message.slice(0, 600),
    err_stack_head: stackHead.slice(0, 900),
  };
}

type LogLevel = 'error' | 'warn' | 'info';

function logWithLevel(level: LogLevel, ...args: unknown[]): void {
  if (level === 'warn') {
    console.warn(...args);
    return;
  }
  if (level === 'info') {
    console.info(...args);
    return;
  }
  console.error(...args);
}

function logPdfParseDiag(
  event: string,
  errOrEmpty: unknown,
  extra: Record<string, string | number | boolean | undefined> = {},
  level: LogLevel = 'error',
): void {
  const payload = {
    event,
    ...extra,
    ...(errOrEmpty === undefined || errOrEmpty === null ? {} : pdfJsExceptionFields(errOrEmpty)),
    vercel: process.env.VERCEL === '1',
    vercel_env: process.env.VERCEL_ENV ?? '',
    node: process.version,
  };
  logWithLevel(level, '[pdf-parse][diag]', JSON.stringify(payload));
}

function logPdfExtractAttempt(extra: Record<string, string | number | boolean | undefined>): void {
  console.info('[pdf-parse][attempt]', JSON.stringify(extra));
}

function isInfrastructureThrownError(err: unknown): boolean {
  const ctor = (err as { constructor?: { name?: string } } | null)?.constructor?.name ?? '';
  const name = (err as { name?: string } | null)?.name ?? '';
  const message = err instanceof Error ? err.message : String(err);

  const isDomMatrix =
    (name === 'ReferenceError' || ctor === 'ReferenceError') &&
    /DOMMatrix|Path2D|ImageData/i.test(message);

  const isModuleProblem =
    (name === 'Error' && /^Cannot find module/m.test(message)) ||
    ctor === 'ERR_MODULE_NOT_FOUND' ||
    (typeof (err as { code?: string } | null)?.code === 'string' &&
      ['MODULE_NOT_FOUND', 'ERR_DLOPEN_FAILED'].includes(
        String((err as { code?: string }).code),
      ));

  const isDlopen =
    typeof message === 'string' &&
    /dlopen|The specified procedure could not be found|wrong ELF class|invalid ELF header/i.test(
      message,
    );

  return isDomMatrix || isModuleProblem || isDlopen;
}

function classifyAndThrowPdfJs(err: unknown): never {
  const ctor = (err as { constructor?: { name?: string } } | null)?.constructor?.name ?? '';
  const name = (err as { name?: string } | null)?.name ?? '';
  const message = err instanceof Error ? err.message : String(err);

  if (
    ctor === 'PasswordException' ||
    name === 'PasswordException' ||
    /password|encrypted/i.test(message)
  ) {
    logPdfParseDiag('classify_pdfjs', err, { maps_to: 'ENCRYPTED' });
    throw new PDFEncryptedError();
  }

  if (isInfrastructureThrownError(err)) {
    logPdfParseDiag('classify_pdfjs', err, { maps_to: 'PARSER_RUNTIME' });
    throw new PDFParserRuntimeError();
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
    logPdfParseDiag('classify_pdfjs', err, { maps_to: 'CORRUPT_candidate' });
    throw new PDFCorruptError();
  }

  logPdfParseDiag('classify_pdfjs', err, { maps_to: 'PARSER_RUNTIME_or_unknown' });
  throw new PDFParserRuntimeError(typeof message === 'string' ? message : 'PDF could not be read');
}

function isLikelyCorruptPdfJsError(err: unknown): boolean {
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

async function extractWithPdfParse(bytes: Uint8Array): Promise<string> {
  const imported = (await import('pdf-parse')) as {
    default?: (buffer: Buffer) => Promise<{ text?: string }>;
  };
  const pdfParse = imported.default;
  if (typeof pdfParse !== 'function') {
    throw new PDFParserRuntimeError('pdf-parse default export unavailable');
  }
  const buf = Buffer.from(bytes);
  const result = await pdfParse(buf);
  const text =
    typeof result === 'object' && result !== null && typeof result.text === 'string' ? result.text : '';
  return text.trim();
}

type PdfJsDocument = {
  numPages: number;
  destroy: () => Promise<void>;
  getPage: (i: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }>;
};

async function runPdfJsTextExtract(
  bytes: Uint8Array,
  opts: Record<string, unknown>,
): Promise<{ text: string; doc: PdfJsDocument }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadedDoc = (await pdfjs.getDocument(opts).promise) as PdfJsDocument;
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
}

async function drainPdfJsDocument(doc: PdfJsDocument | null): Promise<void> {
  if (!doc) return;
  try {
    await doc.destroy();
  } catch {
    /* ignore destroy errors */
  }
}

/** Primary path: Mozilla PDF.js. Only call when `@napi-rs/canvas` globals are ready. */
async function extractWithPdfJsPrimary(bytes: Uint8Array): Promise<string> {
  const assets = getPdfJsAssetUrlsForServer();

  try {
    const primary = await runPdfJsTextExtract(bytes, {
      data: bytes,
      useSystemFonts: false,
      disableFontFace: true,
      isEvalSupported: false,
      verbosity: 0,
      ...assets,
      cMapPacked: true,
    });

    if (primary.text.length >= MIN_USEFUL_CHARS) {
      await drainPdfJsDocument(primary.doc);
      return primary.text;
    }

    await drainPdfJsDocument(primary.doc);
    const ocrPrimary = await tryOcrFallback(bytes);
    if (ocrPrimary) return ocrPrimary;
    throw new PDFScannedNoTextError();
  } catch (err) {
    if (err instanceof PDFScannedNoTextError) throw err;
    if (err instanceof PDFEncryptedError) throw err;
    if (err instanceof PDFCorruptError) throw err;
    if (err instanceof PDFUnsupportedError) throw err;
    if (err instanceof PDFParserUnavailableError) throw err;

    logPdfParseDiag('pdfjs_primary_catch', err, {
      stage: 'pdfjs_primary',
      bytes: bytes.byteLength,
      had_assets: true,
    });
    console.error('[pdf-parse] pdfjs primary failed:', err);

    if (process.env.VERCEL === '1') {
      try {
        logPdfJsResolveDiag(
          toAssetPaths(join(process.cwd(), 'node_modules', 'pdfjs-dist')),
          'parse_error_context',
        );
      } catch {
        console.error('[pdf-parse][vercel] parse_error_context diagnostic failed');
      }
    }

    if (!isLikelyCorruptPdfJsError(err)) {
      classifyAndThrowPdfJs(err);
    }

    logPdfParseDiag('pdfjs_retry_without_assets_start', err, { bytes: bytes.byteLength });
    try {
      const retry = await runPdfJsTextExtract(bytes, {
        data: bytes,
        useSystemFonts: false,
        disableFontFace: true,
        isEvalSupported: false,
        verbosity: 0,
      });

      if (retry.text.length >= MIN_USEFUL_CHARS) {
        await drainPdfJsDocument(retry.doc);
        return retry.text;
      }

      logPdfParseDiag(
        'pdfjs_retry_no_assets_short_text',
        new Error(`retry got ${retry.text.length} chars`),
        { bytes: bytes.byteLength, text_len: retry.text.length },
      );
      await drainPdfJsDocument(retry.doc);
    } catch (retryErr) {
      logPdfParseDiag('pdfjs_retry_without_assets_failed', retryErr, { bytes: bytes.byteLength });
    }

    classifyAndThrowPdfJs(err);
  }
}

/**
 * Extract text from PDF bytes. Optional `diag` fields are logged (no file bytes).
 */
export async function extractText(
  input: Uint8Array | ArrayBuffer,
  diag?: PdfExtractDiagContext,
): Promise<string> {
  assertPdfMagic(input);
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  logPdfExtractAttempt({
    phase: 'start',
    byteLength: bytes.byteLength,
    mime: diag?.mimeType ?? '',
    file_hint: (diag?.fileNameHint ?? '').slice(0, 120),
    vercel_id: diag?.vercelId ?? '',
    source: diag?.source ?? '',
    vercel_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? '',
    region: process.env.VERCEL_REGION ?? '',
  });

  ensurePdfJsNodeGlobalsSync();
  const canvasReady = hasPdfJsNodeGlobalsReady();

  // When canvas native module failed on this Lambda, skip pdfjs import entirely;
  // pdf-parse does not need PDF.js DOMMatrix at load time.
  if (!canvasReady) {
    if (isPdfParserDiagnosticsEnabled()) {
      logPdfParseDiag('canvas_globals_missing', new Error('DOMMatrix/Path2D/ImageData not set'), {
        phase: 'pdf_parse_fallback_only',
        byteLength: bytes.byteLength,
      }, 'info');
    }
    try {
      const t = await extractWithPdfParse(bytes);
      if (t.length >= MIN_USEFUL_CHARS) return t;
      const ocrNoCanvas = await tryOcrFallback(bytes, diag);
      if (ocrNoCanvas) return ocrNoCanvas;
      throw new PDFScannedNoTextError();
    } catch (err) {
      if (err instanceof PDFScannedNoTextError) throw err;
      logPdfParseDiag('pdf_parse_after_no_canvas_failed', err, { byteLength: bytes.byteLength });
      throw new PDFParserRuntimeError();
    }
  }

  let pdfJsErr: unknown;
  try {
    return await extractWithPdfJsPrimary(bytes);
  } catch (e) {
    pdfJsErr = e;
    if (e instanceof PDFEncryptedError || e instanceof PDFUnsupportedError) throw e;
    // Including PARSER_UNAVAILABLE + canvas/runtime — secondary engine may succeed.
  }

  logPdfParseDiag('pdf_parse_fallback_start', pdfJsErr, {
    byteLength: bytes.byteLength,
    reason: 'after_pdfjs_or_corrupt_class',
  });

  try {
    const fallback = await extractWithPdfParse(bytes);
    if (fallback.length >= MIN_USEFUL_CHARS) {
      logPdfParseDiag('pdf_parse_fallback_ok', null, {
        byteLength: bytes.byteLength,
        text_len: fallback.length,
      });
      return fallback;
    }
    if (pdfJsErr instanceof PDFScannedNoTextError) {
      const ocrAfterParse = await tryOcrFallback(bytes, diag);
      if (ocrAfterParse) return ocrAfterParse;
      throw pdfJsErr;
    }
    throw new PDFScannedNoTextError();
  } catch (fbErr) {
    if (fbErr instanceof PDFScannedNoTextError) {
      const ocrLast = await tryOcrFallback(bytes, diag);
      if (ocrLast) return ocrLast;
      throw fbErr;
    }
    logPdfParseDiag('pdf_parse_fallback_failed', fbErr, { byteLength: bytes.byteLength });

    if (pdfJsErr instanceof PDFCorruptError) throw pdfJsErr;
    if (pdfJsErr instanceof PDFParserRuntimeError) throw pdfJsErr;
    if (pdfJsErr instanceof PDFParserUnavailableError) throw pdfJsErr;
    if (pdfJsErr instanceof PDFScannedNoTextError) throw pdfJsErr;
    classifyAndThrowPdfJs(pdfJsErr instanceof Error ? pdfJsErr : fbErr);
  }
}

export function normalizeFileName(name: string): string {
  return name
    .replace(/(\.pdf)(?:\.pdf)+$/i, '$1')
    .replace(/(\.txt)(?:\.txt)+$/i, '$1');
}
