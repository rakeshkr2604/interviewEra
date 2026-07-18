/**
 * One-off: diagnose extractText failure on a specific PDF.
 *   npx tsx scripts/debug-pdf-extract.ts [path]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { extractText } from '../src/lib/pdf/parser';
import { assertPdfPageLimit } from '../src/lib/pdf/page-count';
import { runLayeredTextExtraction } from '../src/lib/resume/extraction-pipeline';
import { isObviouslyGarbage, scoreExtractedText } from '../src/lib/resume/extraction-quality';
import { assertLooksLikeResume } from '../src/lib/documents/document-classification';

const path =
  process.argv[2] ??
  join(process.cwd(), 'tests/fixtures/pdf/overleaf-resume-27-may.pdf');

async function main() {
  const buf = readFileSync(path);
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  console.log('file', path, 'bytes', bytes.byteLength, 'buf.length', buf.length);

  // Magic
  const magic = String.fromCharCode(...bytes.slice(0, 8));
  console.log('magic', JSON.stringify(magic));
  console.log('first5', Array.from(bytes.slice(0, 5)));

  const { assertPdfMagic } = await import('../src/lib/pdf/parser');
  try {
    assertPdfMagic(bytes);
    console.log('assertPdfMagic OK');
  } catch (e) {
    console.log('assertPdfMagic FAIL', e instanceof Error ? e.message : e);
  }

  try {
    const pages = await assertPdfPageLimit(bytes, 10);
    console.log('pageCount', pages);
  } catch (e) {
    console.log('pageLimit FAIL', e instanceof Error ? `${e.name}: ${e.message}` : e);
  }

  try {
    console.log('calling extractText with byteLength', bytes.byteLength);
    const text = await extractText(bytes, {
      source: 'debug-pdf-extract',
      fileNameHint: path.split(/[/\\]/).pop(),
    });
    console.log('extractText OK chars=', text.length);
    console.log('---RAW TEXT START---');
    console.log(text.slice(0, 3000));
    console.log('---RAW TEXT END---');

    const layered = runLayeredTextExtraction(text);
    console.log('layered', {
      stage: layered.stage,
      chars: layered.text.length,
      band: layered.qualityBand,
      score: layered.qualityScore,
    });
    console.log('garbage?', isObviouslyGarbage(layered.text));
    console.log('score', scoreExtractedText(layered.text));
    console.log('looksLikeResume', assertLooksLikeResume(layered.text));

    mkdirSync(join(process.cwd(), '.verify-out'), { recursive: true });
    writeFileSync(join(process.cwd(), '.verify-out', 'debug-extract.txt'), layered.text);
  } catch (e) {
    console.log(
      'extractText FAIL',
      e instanceof Error ? `${e.name} code=${(e as { code?: string }).code}: ${e.message}` : e,
    );
    if (e instanceof Error && e.stack) console.log(e.stack.split('\n').slice(0, 12).join('\n'));
  }
}

main();
