import { describe, expect, it } from 'vitest';
import { safeText, stripHtml } from '@/lib/utils/sanitize';

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
});
