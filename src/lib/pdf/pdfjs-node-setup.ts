import { createRequire } from 'node:module';

import { isPdfParserDiagnosticsEnabled } from '@/lib/debug/upload-diagnostics';

let setupDone = false;

interface CanvasGlobals {
  DOMMatrix?: unknown;
  Path2D?: unknown;
  ImageData?: unknown;
}

/**
 * Resolve `@napi-rs/canvas` without webpack flagging the import.
 *
 * `@napi-rs/canvas` is declared in `serverExternalPackages` (next.config.ts),
 * so it must be required at runtime, not bundled. We never store/return the
 * `require` function as a value (that is exactly what triggers webpack's
 * "Critical dependency: require function is used in a way…" warning) —
 * resolution is inlined:
 *
 *  - Webpack server build: `__non_webpack_require__` is emitted verbatim as a
 *    real Node `require` and is NOT statically analyzed → no warning, and the
 *    package stays external.
 *  - Non-webpack (Turbopack / vitest / Node ESM): no `__non_webpack_require__`
 *    exists, so fall back to `createRequire(import.meta.url)` — a static,
 *    webpack-parseable argument (this branch is never reached under webpack).
 */
function loadNapiCanvas(): CanvasGlobals | null {
  const g = globalThis as typeof globalThis & {
    __non_webpack_require__?: (specifier: string) => unknown;
  };

  try {
    if (typeof g.__non_webpack_require__ === 'function') {
      return g.__non_webpack_require__('@napi-rs/canvas') as CanvasGlobals;
    }
  } catch (err) {
    if (isPdfParserDiagnosticsEnabled()) {
      console.info(
        '[pdfjs-node] __non_webpack_require__("@napi-rs/canvas") failed',
        err instanceof Error ? err.message : err,
      );
    }
    return null;
  }

  try {
    return createRequire(import.meta.url)('@napi-rs/canvas') as CanvasGlobals;
  } catch (err) {
    if (isPdfParserDiagnosticsEnabled()) {
      console.info(
        '[pdfjs-node] createRequire("@napi-rs/canvas") failed',
        err instanceof Error ? err.message : err,
      );
    }
    return null;
  }
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

  const canvas = loadNapiCanvas();
  if (!canvas) return;

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
}

/** True once canvas globals pdfjs-dist legacy expects exist on globalThis (Vercel Node). */
export function hasPdfJsNodeGlobalsReady(): boolean {
  return (
    typeof globalThis.DOMMatrix !== 'undefined' &&
    typeof globalThis.Path2D !== 'undefined' &&
    typeof globalThis.ImageData !== 'undefined'
  );
}
