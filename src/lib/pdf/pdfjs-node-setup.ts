import { createRequire } from 'node:module';
import { join } from 'node:path';

import { isPdfParserDiagnosticsEnabled } from '@/lib/debug/upload-diagnostics';

let setupDone = false;

/** Webpack dev/server bundles wrap `require`; bypass so `createRequire` returns the real callable. */
function getProjectScopedRequireFn(): ReturnType<typeof createRequire> | null {
  const cwdPkg = join(process.cwd(), 'package.json');
  const g = globalThis as typeof globalThis & {
    __non_webpack_require__?: (specifier: string) => unknown;
  };

  try {
    if (typeof g.__non_webpack_require__ === 'function') {
      const moduleMod = g.__non_webpack_require__('node:module') as typeof import('node:module');
      const projectRequireFn = moduleMod.createRequire(cwdPkg);
      if (typeof projectRequireFn === 'function') {
        return projectRequireFn;
      }
    }
  } catch {
    /* fall through to undecorated createRequire */
  }

  try {
    const fn = createRequire(cwdPkg);
    if (typeof fn === 'function') {
      return fn;
    }
    if (!isPdfParserDiagnosticsEnabled()) return null;
    console.info('[pdfjs-node] createRequire did not yield a callable require — check webpack/native module wrapping.');
  } catch (err) {
    if (!isPdfParserDiagnosticsEnabled()) return null;
    console.info(
      '[pdfjs-node] createRequire failed',
      err instanceof Error ? err.message : err,
    );
  }
  return null;
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
    const projectRequire = getProjectScopedRequireFn();
    if (!projectRequire) return;

    const canvas = projectRequire('@napi-rs/canvas') as {
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
    if (!isPdfParserDiagnosticsEnabled()) return;
    console.info(
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
