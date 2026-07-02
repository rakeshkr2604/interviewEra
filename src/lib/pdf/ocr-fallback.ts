/**
 * Optional OCR for scanned PDFs — fallback only, bounded time/pages.
 */

import { ensurePdfJsNodeGlobalsSync, hasPdfJsNodeGlobalsReady } from '@/lib/pdf/pdfjs-node-setup';
import { trackProductEvent } from '@/lib/analytics/product-events';
import { checkRateLimit } from '@/lib/redis/rate-limit';

export const OCR_MAX_PAGES = 3;
export const OCR_MAX_DURATION_MS = 12_000;
export const OCR_MAX_FILE_BYTES = 4 * 1024 * 1024;

export type OcrExtractResult = {
  text: string;
  pagesProcessed: number;
  durationMs: number;
  partial: boolean;
};

function ocrEnabled(): boolean {
  return process.env.RESUME_OCR_ENABLED !== '0';
}

async function loadCreateCanvas(): Promise<
  (w: number, h: number) => { getContext: (t: string) => unknown; toBuffer: (fmt: string) => Buffer }
> {
  const g = globalThis as typeof globalThis & {
    __non_webpack_require__?: (specifier: string) => { createCanvas: (w: number, h: number) => unknown };
  };
  const mod =
    typeof g.__non_webpack_require__ === 'function'
      ? (g.__non_webpack_require__('@napi-rs/canvas') as {
          createCanvas: (w: number, h: number) => {
            getContext: (t: string) => unknown;
            toBuffer: (fmt: string) => Buffer;
          };
        })
      : null;
  if (!mod?.createCanvas) {
    throw new Error('Canvas unavailable for OCR');
  }
  return mod.createCanvas;
}

async function renderPagesToPngBuffers(bytes: Uint8Array, maxPages: number): Promise<Buffer[]> {
  ensurePdfJsNodeGlobalsSync();
  if (!hasPdfJsNodeGlobalsReady()) {
    throw new Error('PDF.js canvas globals not ready');
  }

  const createCanvas = await loadCreateCanvas();
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({
    data: bytes,
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  }).promise;

  const pageCount = Math.min(doc.numPages, maxPages);
  const buffers: Buffer[] = [];
  const scale = 1.75;

  try {
    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      await page.render({ canvas: canvas as never, canvasContext: ctx as never, viewport }).promise;
      buffers.push(canvas.toBuffer('image/png'));
    }
  } finally {
    try {
      await doc.destroy();
    } catch {
      /* ignore */
    }
  }

  return buffers;
}

async function runTesseractOnImage(png: Buffer, signal: AbortSignal): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: () => {},
  });
  try {
    if (signal.aborted) throw new Error('OCR aborted');
    const { data } = await worker.recognize(png);
    return (data.text ?? '').trim();
  } finally {
    await worker.terminate();
  }
}

/**
 * OCR fallback for scanned PDFs. Returns empty string on skip/failure (caller decides).
 */
export async function extractTextWithOcr(
  bytes: Uint8Array,
  opts?: { userId?: string; source?: string },
): Promise<OcrExtractResult | null> {
  if (!ocrEnabled()) return null;
  if (bytes.byteLength > OCR_MAX_FILE_BYTES) return null;
  if (!hasPdfJsNodeGlobalsReady()) return null;

  if (opts?.userId) {
    const rl = await checkRateLimit(`ocr:${opts.userId}`, 3600, 8, { failClosed: true });
    if (!rl.allowed) {
      console.warn('[ocr-fallback] rate limited', {
        userId: opts.userId,
        redisUnavailable: rl.redisUnavailable,
      });
      return null;
    }
  }

  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OCR_MAX_DURATION_MS);

  trackProductEvent({
    event: 'ocr_attempted',
    userId: opts?.userId,
    source: opts?.source,
    bytes: bytes.byteLength,
  });

  try {
    const images = await renderPagesToPngBuffers(bytes, OCR_MAX_PAGES);
    if (images.length === 0) return null;

    const parts: string[] = [];
    for (const img of images) {
      if (controller.signal.aborted) break;
      const chunk = await runTesseractOnImage(img, controller.signal);
      if (chunk) parts.push(chunk);
    }

    const text = parts.join('\n\n').trim();
    const durationMs = Date.now() - t0;
    const partial = images.length < OCR_MAX_PAGES && text.length > 0 && text.length < 200;

    if (text.length >= 12) {
      trackProductEvent({
        event: 'ocr_succeeded',
        userId: opts?.userId,
        durationMs,
        pages: images.length,
        chars: text.length,
        partial,
      });
      console.info('[ocr-fallback] ok', {
        pages: images.length,
        chars: text.length,
        durationMs,
        partial,
      });
      return { text, pagesProcessed: images.length, durationMs, partial };
    }

    trackProductEvent({ event: 'ocr_failed', userId: opts?.userId, reason: 'low_text', durationMs });
    return null;
  } catch (err) {
    trackProductEvent({
      event: 'ocr_failed',
      userId: opts?.userId,
      reason: err instanceof Error ? err.message : 'error',
      durationMs: Date.now() - t0,
    });
    console.warn('[ocr-fallback] failed', err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
