import { createRequire } from 'node:module';
import { join } from 'node:path';

let setupDone = false;

/** Avoid `import.meta.url` here — Webpack emits Critical dependency warnings when bundling server actions that import the PDF stack. */
function nodeRequireFromProject(): ReturnType<typeof createRequire> {
  return createRequire(join(process.cwd(), 'package.json'));
}

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
    const req = nodeRequireFromProject();
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
    console.warn(
      '[pdfjs-node] failed to load @napi-rs/canvas; pdfjs may throw (e.g. DOMMatrix is not defined)',
      err instanceof Error ? err.message : err,
    );
  }
}

/** True once canvas globals pdfjs-dist legacy expects exist on globalThis (Vercel Node). */
export function hasPdfJsNodeGlobalsReady(): boolean {
  return (
    typeof globalThis.DOMMatrix !== 'undefined' &&
    typeof globalThis.Path2D !== 'undefined' &&
    typeof globalThis.ImageData !== 'undefined'
  );
}
