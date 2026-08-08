/**
 * Regression test: pdfjs-dist v5.x fake-worker resolution.
 *
 * Reproduces the Vercel production error:
 *   "Setting up fake worker failed: Cannot find module
 *    '/var/task/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
 *    imported from '/var/task/node_modules/pdfjs-dist/legacy/build/pdf.mjs'"
 *
 * Root cause: `pdf.mjs` sets `GlobalWorkerOptions.workerSrc ||= "./pdf.worker.mjs"`
 * then does `import(this.workerSrc)` in `_setupFakeWorkerGlobal`. If NFT doesn't
 * trace `pdf.worker.mjs` into the serverless bundle, the import fails at runtime.
 *
 * This test ensures:
 * 1. `pdf.worker.mjs` exists as a sibling of `pdf.mjs`
 * 2. The dynamic import(./pdf.worker.mjs) resolves successfully
 * 3. `getDocument()` can open a minimal PDF without worker errors
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('pdfjs-dist v5 fake-worker resolution', () => {
  const pdfEntry = require.resolve('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfDir = dirname(pdfEntry);
  const workerPath = join(pdfDir, 'pdf.worker.mjs');

  it('pdf.worker.mjs exists as sibling of pdf.mjs', () => {
    expect(existsSync(pdfEntry)).toBe(true);
    expect(existsSync(workerPath)).toBe(true);
  });

  it('dynamic import(pdf.worker.mjs) resolves WorkerMessageHandler', async () => {
    const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
    expect(worker.WorkerMessageHandler).toBeDefined();
    expect(typeof worker.WorkerMessageHandler === 'object' || typeof worker.WorkerMessageHandler === 'function').toBe(true);
  });

  it('getDocument() succeeds without "Setting up fake worker failed"', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // Minimal valid PDF (1 page, no text content)
    const minimalPdf = `%PDF-1.4
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer<< /Size 4 /Root 1 0 R >>
startxref
168
%%EOF
`;
    const bytes = new Uint8Array(Buffer.from(minimalPdf, 'utf8'));

    const doc = await pdfjs.getDocument({
      data: bytes,
      useSystemFonts: false,
      disableFontFace: true,
      verbosity: 0,
    }).promise;

    expect(doc.numPages).toBe(1);
    await doc.destroy();
  }, 15_000);
});
