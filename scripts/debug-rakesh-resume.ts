/**
 * Reproduce CORRUPT on Rakesh_Kumar_Resume.pdf (page-limit buffer detach)
 * and verify the fixed path + extraction quality.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ensurePdfJsNodeGlobalsSync } from '../src/lib/pdf/pdfjs-node-setup';
import { assertPdfPageLimit } from '../src/lib/pdf/page-count';
import { extractText, assertPdfMagic } from '../src/lib/pdf/parser';
import { runLayeredTextExtraction } from '../src/lib/resume/extraction-pipeline';
import { scoreExtractedText, isObviouslyGarbage } from '../src/lib/resume/extraction-quality';
import { assertLooksLikeResume } from '../src/lib/documents/document-classification';
import { parseResumeGracefully } from '../src/lib/resume/graceful-parse';
import { canonicalizeSkills } from '../src/lib/resume/skill-canonicalize';

const PATH = join(process.cwd(), 'tests/fixtures/pdf/Rakesh_Kumar_Resume.pdf');

async function reproduceOldDetachBug(bytes: Uint8Array): Promise<void> {
  ensurePdfJsNodeGlobalsSync();
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const before = bytes.byteLength;
  const doc = await pdfjs.getDocument({
    data: bytes, // OLD: pass caller's buffer — pdf.js may detach
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  }).promise;
  const pages = doc.numPages;
  await doc.destroy().catch(() => undefined);
  console.log('[OLD BUG] after getDocument: pages=', pages, 'byteLength=', bytes.byteLength, '(was', before, ')');
  try {
    assertPdfMagic(bytes);
    console.log('[OLD BUG] assertPdfMagic unexpectedly OK');
  } catch (e) {
    console.log(
      '[OLD BUG] assertPdfMagic FAIL (this was the user-facing CORRUPT path):',
      e instanceof Error ? `${e.name}: ${e.message}` : e,
    );
  }
}

async function main() {
  const buf = readFileSync(PATH);
  const latin = buf.toString('latin1');
  for (const p of ['TeX', 'pdfTeX', 'XeTeX', 'Overleaf', 'LuaTeX', 'Producer', 'Creator']) {
    const i = latin.indexOf(p);
    if (i >= 0) {
      console.log('META', p, JSON.stringify(latin.slice(i, i + 80).replace(/[\x00-\x1f]/g, ' ')));
    }
  }
  console.log('file bytes', buf.length);

  // Fresh copy for old-bug repro
  const forBug = new Uint8Array(buf);
  await reproduceOldDetachBug(forBug);

  // Fixed path (copy inside getPdfPageCount)
  const forFix = new Uint8Array(buf);
  const pages = await assertPdfPageLimit(forFix, 10);
  console.log('[FIXED] pageCount=', pages, 'byteLength still', forFix.byteLength);
  const text = await extractText(forFix, { source: 'debug-rakesh', fileNameHint: 'Rakesh_Kumar_Resume.pdf' });
  console.log('[FIXED] extract chars=', text.length);
  console.log('---RAW (first 2500)---');
  console.log(text.slice(0, 2500));
  console.log('---END---');

  const layered = runLayeredTextExtraction(text);
  console.log('layered', layered.stage, layered.qualityBand, layered.qualityScore);
  console.log('garbage', isObviouslyGarbage(layered.text));
  console.log('score', scoreExtractedText(layered.text));
  console.log('looksLikeResume', assertLooksLikeResume(layered.text));

  // Ligature / encoding checks
  const lower = layered.text.toLowerCase();
  const checks = {
    hasOffice: lower.includes('office'),
    hasOceWord: /\boce\b/.test(lower),
    hasReact: /react/.test(lower),
    hasExperience: /experience|internship|work/.test(lower),
    hasEducation: /education|b\.?tech|bachelor|university|college|iit/.test(lower),
  };
  console.log('qualityChecks', checks);

  mkdirSync(join(process.cwd(), '.verify-out'), { recursive: true });
  writeFileSync(join(process.cwd(), '.verify-out', 'rakesh-extract.txt'), layered.text);

  // Structured parse (needs network/OpenRouter — may degrade to heuristic)
  try {
    const parsed = await parseResumeGracefully(layered.text);
    const skills = canonicalizeSkills(parsed.data.skills);
    console.log('parsed', {
      stage: parsed.stage,
      quality: parsed.quality,
      role: parsed.data.target_role,
      experience: parsed.data.experience_estimate,
      skills: skills.map((s) => s.canonical),
    });
    writeFileSync(
      join(process.cwd(), '.verify-out', 'rakesh-parsed.json'),
      JSON.stringify({ parsed: parsed.data, skills, stage: parsed.stage, quality: parsed.quality }, null, 2),
    );
  } catch (e) {
    console.log('parseResumeGracefully failed', e instanceof Error ? e.message : e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
