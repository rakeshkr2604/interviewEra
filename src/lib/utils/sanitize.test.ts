import { describe, expect, it } from 'vitest';
import { normalizeExtractedDocumentText, safeText, stripHtml } from '@/lib/utils/sanitize';

describe('sanitize', () => {
  it('stripHtml removes tags', () => {
    expect(stripHtml('<script>alert(1)</script>Hello')).toBe('Hello');
    expect(stripHtml('<img src=x onerror="alert(1)">')).toBe('');
  });

  it('safeText strips and caps length', () => {
    const long = `<b>${'x'.repeat(600)}</b>`;
    expect(safeText(long, 10).length).toBeLessThanOrEqual(10);
    expect(safeText(long, 10)).not.toContain('<');
  });

  it('normalizeExtractedDocumentText keeps angle brackets', () => {
    const s = 'Email: john<at>corp.com • C++ • a < b';
    expect(normalizeExtractedDocumentText(s, 10_000)).toBe(s);
    expect(normalizeExtractedDocumentText(`a\u0000b`, 10)).toBe('ab');
  });
});
