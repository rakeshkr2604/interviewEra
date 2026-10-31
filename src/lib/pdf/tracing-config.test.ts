/**
 * Regression: heavyweight PDF tracing must stay route-scoped.
 * Fails if someone reintroduces global `'/**'` PDF includes in next.config.ts.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CONFIG_PATH = join(process.cwd(), 'next.config.ts');

describe('next.config PDF outputFileTracingIncludes', () => {
  const src = readFileSync(CONFIG_PATH, 'utf8');

  it('does not globally include PDF assets via /**', () => {
    // Historical bug: '/**': [...pdfTraceGlobs()] forced ~45MB into every Lambda.
    expect(src).not.toMatch(/['"]\/\*\*['"]\s*:\s*\[\s*\.\.\.pdfTraceGlobs/);
    expect(src).not.toMatch(/['"]\/\*\*['"]\s*:\s*\[[^\]]*pdfjs-dist/);
    expect(src).not.toMatch(/['"]\/\*\*['"]\s*:\s*\[[^\]]*pdf-parse/);
    expect(src).not.toMatch(/['"]\/\*\*['"]\s*:\s*\[[^\]]*@napi-rs\/canvas/);
  });

  it('keeps PDF tracing on the production extract routes', () => {
    expect(src).toContain('/api/resume/upload');
    expect(src).toContain('/api/job-description/extract');
    expect(src).toContain('/tools/ats-checker');
    expect(src).toContain('PDF_TRACE_ROUTES');
  });

  it('still traces required pdfjs fonts/cmaps (not only JS entrypoints)', () => {
    expect(src).toContain('pdfjs-dist/standard_fonts/**');
    expect(src).toContain('pdfjs-dist/cmaps/**');
    expect(src).toContain('pdfjs-dist/legacy/build/pdf.mjs');
    expect(src).toContain('pdfjs-dist/legacy/build/pdf.worker.mjs');
  });

  it('does not force the entire pdf-parse package tree (excludes test fixtures)', () => {
    expect(src).not.toMatch(/pdf-parse\/\*\*/);
    expect(src).toContain('pdf-parse/lib/**');
  });
});
