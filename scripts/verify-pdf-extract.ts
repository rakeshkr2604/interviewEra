/**
 * Regression: ensure shared extractText succeeds on checked-in fixtures (pdfjs +
 * fallback path exercised on CI).
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractText } from '../src/lib/pdf/parser';

const root = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(root, '../tests/fixtures/pdf');

async function main(): Promise<void> {
  const cases = ['fixture-latin.pdf', 'fixture-unicode.pdf'] as const;

  for (const name of cases) {
    const path = join(fixtureDir, name);
    const buf = await readFile(path);
    const bytes = new Uint8Array(buf);
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
}

/** Must stay below production MIN_USEFUL_CHARS (20) thresholds but catch empty regression. */
const MIN_EXPECTED_CHARS = 35;

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
