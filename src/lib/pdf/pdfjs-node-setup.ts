import { createRequire } from 'node:module';

let setupDone = false;

/**
 * `pdfjs-dist/legacy/build/pdf.mjs` evaluates code that references `DOMMatrix`,
 * `Path2D`, and `ImageData` at import time. Vercel Node has none of these unless
 * we pull them from `@napi-rs/canvas` (pdfjs's optional Node canvas backend).
 *
 * Must run synchronously before `import('pdfjs-dist/legacy/build/pdf.mjs')`.
 */
export function ensurePdfJsNodeGlobalsSync(): void {
  if (setupDone) return;
  setupDone = true;

  if (
    typeof globalThis.DOMMatrix !== 'undefined' &&
    typeof globalThis.Path2D !== 'undefined' &&
    typeof globalThis.ImageData !== 'undefined'
  ) {
    return;
  }

  try {
    const req = createRequire(import.meta.url);
    const canvas = req('@napi-rs/canvas') as {
      DOMMatrix: unknown;
      Path2D: unknown;
      ImageData: unknown;
    };
    const g = globalThis as unknown as Record<string, unknown>;

    if (typeof g.DOMMatrix === 'undefined' && canvas.DOMMatrix) {
      g.DOMMatrix = canvas.DOMMatrix;
    }
    if (typeof g.Path2D === 'undefined' && canvas.Path2D) {
      g.Path2D = canvas.Path2D;
    }
    if (typeof g.ImageData === 'undefined' && canvas.ImageData) {
      g.ImageData = canvas.ImageData;
    }
  } catch (err) {
    console.error(
      '[pdfjs-node] failed to load @napi-rs/canvas; pdfjs may throw (e.g. DOMMatrix is not defined)',
      err instanceof Error ? err.message : err,
    );
  }
}
