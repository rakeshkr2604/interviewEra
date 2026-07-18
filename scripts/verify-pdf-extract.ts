/**
 * Regression: ensure shared extractText succeeds on checked-in fixtures (pdfjs +
 * fallback path exercised on CI).
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractText } from '../src/lib/pdf/parser';
import { assertPdfPageLimit } from '../src/lib/pdf/page-count';

const root = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(root, '../tests/fixtures/pdf');

async function main(): Promise<void> {
  const cases = ['fixture-latin.pdf', 'fixture-unicode.pdf'] as const;

  for (const name of cases) {
    const path = join(fixtureDir, name);
    const buf = await readFile(path);
    const bytes = new Uint8Array(buf);
    // Mirror upload route order — page limit must not detach bytes before extract.
    await assertPdfPageLimit(bytes, 10);
    const text = await extractText(bytes, { source: `verify-pdf:${name}` });
    if (text.trim().length < MIN_EXPECTED_CHARS) {
      throw new Error(
        `[verify-pdf-extract] ${name}: extracted only ${text.trim().length} chars (minimum ${MIN_EXPECTED_CHARS}).`,
      );
    }
    if (!text.includes('AAAABBBB')) {
      throw new Error(`[verify-pdf-extract] ${name}: expected marker substring missing`);
    }
  }

  const latexPath = join(fixtureDir, 'fixture-latex-type1.pdf');
  const latexBuf = await readFile(latexPath);
  const latexBytes = new Uint8Array(latexBuf);
  await assertPdfPageLimit(latexBytes, 10);
  const latexText = await extractText(latexBytes, { source: 'verify-pdf:fixture-latex-type1.pdf' });
  if (!/software engineer/i.test(latexText) || !/react/i.test(latexText) || !/office/i.test(latexText)) {
    throw new Error(
      `[verify-pdf-extract] fixture-latex-type1.pdf: expected resume markers missing (got ${latexText.length} chars)`,
    );
  }

  // Production Overleaf/pdfTeX resume that previously failed CORRUPT after page-limit.
  const rakeshPath = join(fixtureDir, 'Rakesh_Kumar_Resume.pdf');
  const rakeshBuf = await readFile(rakeshPath);
  const rakeshBytes = new Uint8Array(rakeshBuf);
  await assertPdfPageLimit(rakeshBytes, 10);
  const rakeshText = await extractText(rakeshBytes, { source: 'verify-pdf:Rakesh_Kumar_Resume.pdf' });
  if (rakeshText.trim().length < 500 || !/rakesh/i.test(rakeshText) || !/react/i.test(rakeshText)) {
    throw new Error(
      `[verify-pdf-extract] Rakesh_Kumar_Resume.pdf: expected resume content missing (got ${rakeshText.length} chars)`,
    );
  }
  console.log('[verify-pdf-extract] ok — latin, unicode, latex-type1, Rakesh_Kumar_Resume (page-limit → extract)');
}
/** Must stay below production MIN_USEFUL_CHARS (20) thresholds but catch empty regression. */
const MIN_EXPECTED_CHARS = 35;

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
