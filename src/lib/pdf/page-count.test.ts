import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertPdfPageLimit, getPdfPageCount } from '@/lib/pdf/page-count';
import { assertPdfMagic, extractText } from '@/lib/pdf/parser';
import { PDFCorruptError, PDFScannedNoTextError } from '@/lib/pdf/parser-errors';

describe('getPdfPageCount buffer safety', () => {
  it('does not detach caller bytes (pdf.js transfer regression)', async () => {
    const path = join(process.cwd(), 'tests/fixtures/pdf/fixture-latin.pdf');
    const buf = readFileSync(path);
    const bytes = new Uint8Array(buf);
    const before = bytes.byteLength;
    expect(before).toBeGreaterThan(5);

    const pages = await getPdfPageCount(bytes);
    expect(pages).toBeGreaterThanOrEqual(1);
    // Pre-fix: pdf.js transferred the ArrayBuffer → byteLength became 0
    expect(bytes.byteLength).toBe(before);
    expect(() => assertPdfMagic(bytes)).not.toThrow();
  });

  it('page-limit then extractText works on the same buffer (upload pipeline order)', async () => {
    const path = join(process.cwd(), 'tests/fixtures/pdf/fixture-latin.pdf');
    const buf = readFileSync(path);
    const bytes = new Uint8Array(buf);
    const before = bytes.byteLength;

    await assertPdfPageLimit(bytes, 10);
    expect(bytes.byteLength).toBe(before);

    const text = await extractText(bytes, { source: 'page-count.test' });
    expect(text.trim().length).toBeGreaterThan(20);
    expect(text).toContain('AAAABBBB');
  });

  it('Rakesh_Kumar_Resume.pdf (Overleaf/LaTeX) survives page-limit → extract', async () => {
    const path = join(process.cwd(), 'tests/fixtures/pdf/Rakesh_Kumar_Resume.pdf');
    const buf = readFileSync(path);
    const bytes = new Uint8Array(buf);
    const before = bytes.byteLength;

    const pages = await assertPdfPageLimit(bytes, 10);
    expect(pages).toBeGreaterThanOrEqual(1);
    expect(bytes.byteLength).toBe(before);

    const text = await extractText(bytes, { source: 'page-count.rakesh' });
    expect(text.trim().length).toBeGreaterThan(200);
    expect(text.toLowerCase()).toMatch(/rakesh|engineer|react|experience|education|skill/i);
    // Ligature/encoding smoke — must not destroy common words
    expect(text.toLowerCase()).not.toMatch(/\boce\b/);
  });

  it('page-limit then extract on latex-like Type1 fixture preserves readable text', async () => {
    const path = join(process.cwd(), 'tests/fixtures/pdf/fixture-latex-type1.pdf');
    const buf = readFileSync(path);
    const bytes = new Uint8Array(buf);

    await assertPdfPageLimit(bytes, 10);
    const text = await extractText(bytes, { source: 'page-count.latex' });
    expect(text.toLowerCase()).toContain('software engineer');
    expect(text.toLowerCase()).toContain('react');
    expect(text.toLowerCase()).toContain('nodejs');
    expect(text.toLowerCase()).toContain('office');
    expect(text.toLowerCase()).not.toMatch(/\boce\b/);
  });
});

describe('extractText still rejects unreadable inputs', () => {
  it('rejects empty/corrupt short buffer as CORRUPT', async () => {
    await expect(extractText(new Uint8Array([1, 2, 3]))).rejects.toBeInstanceOf(PDFCorruptError);
  });

  it('rejects empty-content PDF as scanned/no-text (or corrupt)', async () => {
    // Minimal PDF with empty content stream (same shape as live verify fixture)
    const pdf = `%PDF-1.4
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>endobj
4 0 obj<< /Length 0 >>stream
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer<< /Size 5 /Root 1 0 R >>
startxref
263
%%EOF
`;
    const bytes = new Uint8Array(Buffer.from(pdf, 'utf8'));
    await expect(extractText(bytes)).rejects.toSatisfy(
      (err: unknown) => err instanceof PDFScannedNoTextError || err instanceof PDFCorruptError,
    );
  });
});
