/**
 * One-off fixture generator (@react-pdf/renderer → valid minimal PDF bytes).
 * Run: npx tsx scripts/generate-pdf-fixtures.tsx
 * Commit outputs under tests/fixtures/pdf/.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import React from 'react';

import { Document, Page, renderToBuffer, Text } from '@react-pdf/renderer';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outDir = join(scriptDir, '../tests/fixtures/pdf');
mkdirSync(outDir, { recursive: true });

void (async () => {
  const latinPdf = await renderToBuffer(
    <Document>
      <Page size="LETTER">
        <Text style={{ padding: 24 }}>
          InterviewEra PDF regression fixture AAAABBBBCCCC. Second line for density verification.
        </Text>
      </Page>
    </Document>,
  );

  const unicodePdf = await renderToBuffer(
    <Document>
      <Page size="LETTER">
        <Text style={{ padding: 24 }}>नमस्ते Hello Résumé 中文 fixture line AAAABBBB.</Text>
      </Page>
    </Document>,
  );

  writeFileSync(join(outDir, 'fixture-latin.pdf'), latinPdf);
  writeFileSync(join(outDir, 'fixture-unicode.pdf'), unicodePdf);

  console.log(`Wrote ${join(outDir, 'fixture-latin.pdf')} (${latinPdf.byteLength}b)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
