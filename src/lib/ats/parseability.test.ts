import { describe, expect, it } from 'vitest';
import {
  analyzeParseability,
  debugMultiColumnSignals,
  detectMultiColumn,
} from '@/lib/ats/parseability';
import type { PdfLayoutInspectResult } from '@/lib/ats/pdf-layout-inspect';

function layoutWithItems(
  items: PdfLayoutInspectResult['items'],
): PdfLayoutInspectResult {
  return {
    available: true,
    pageCount: 1,
    items,
    totalChars: items.reduce((n, i) => n + i.str.length, 0),
  };
}

/** Jake/LaTeX-style: body on left, dates/CGPA on the right margin. */
function dateAlignedSingleColumnLayout(): PdfLayoutInspectResult {
  const items: PdfLayoutInspectResult['items'] = [];
  for (let i = 0; i < 50; i++) {
    items.push({
      str: `Built and shipped production features for SaaS platform line ${i}`,
      x: 50,
      y: 700 - i * 10,
      pageIndex: 0,
      pageWidth: 612,
      pageHeight: 792,
    });
  }
  // Right-aligned dates / meta — must NOT count as a second column
  const dates = [
    'May 2026',
    'Dec 2025',
    'Apr 2026 – Present',
    'CGPA: 7.49/10',
    'Jan 2026 – Apr 2026',
    'Present',
  ];
  dates.forEach((str, i) => {
    items.push({
      str,
      x: 520,
      y: 680 - i * 40,
      pageIndex: 0,
      pageWidth: 612,
      pageHeight: 792,
    });
  });
  return layoutWithItems(items);
}

/** True skills-rail / dual column with substantial prose on both sides. */
function trueMultiColumnLayout(): PdfLayoutInspectResult {
  const items: PdfLayoutInspectResult['items'] = [];
  for (let i = 0; i < 40; i++) {
    items.push({
      str: `left body experience bullet describing impact and ownership ${i}`,
      x: 40,
      y: 700 - i * 12,
      pageIndex: 0,
      pageWidth: 612,
      pageHeight: 792,
    });
    items.push({
      str: `Skills rail item TypeScript React Node PostgreSQL Redis ${i}`,
      x: 420,
      y: 700 - i * 12,
      pageIndex: 0,
      pageWidth: 612,
      pageHeight: 792,
    });
  }
  return layoutWithItems(items);
}

describe('analyzeParseability', () => {
  it('flags near-empty text as image-based hard warning', () => {
    const r = analyzeParseability({
      rawText: 'hi there',
      layout: null,
      sourceKind: 'pdf',
    });
    expect(r.imageBasedHardWarning).toBe(true);
    expect(r.score).toBeLessThan(50);
    expect(r.findings.some((f) => f.id === 'image_based_or_empty')).toBe(true);
  });

  it('detects true multi-column / skills-rail layouts', () => {
    const layout = trueMultiColumnLayout();
    expect(detectMultiColumn(layout)).toBe(true);
    const signals = debugMultiColumnSignals(layout)[0];
    expect(signals.rightShare).toBeGreaterThanOrEqual(0.22);
    expect(signals.dateishRightShare).toBeLessThan(0.55);

    const r = analyzeParseability({
      rawText: 'A'.repeat(400),
      layout,
      sourceKind: 'pdf',
    });
    expect(r.findings.some((f) => f.id === 'multi_column')).toBe(true);
    expect(r.score).toBeLessThan(80);
  });

  it('detects compact dual-column pages (fewer text items)', () => {
    // Mirrors fixture-two-column.pdf density (~30 items) — must not be gated out.
    const items: PdfLayoutInspectResult['items'] = [];
    for (let i = 0; i < 15; i++) {
      items.push({
        str: `left experience narrative with enough characters ${i}`,
        x: 40,
        y: 700 - i * 20,
        pageIndex: 0,
        pageWidth: 612,
        pageHeight: 792,
      });
      items.push({
        str: `right skills prose TypeScript React Node ${i}`,
        x: 400,
        y: 700 - i * 20,
        pageIndex: 0,
        pageWidth: 612,
        pageHeight: 792,
      });
    }
    const layout = layoutWithItems(items);
    expect(layout.items.length).toBeLessThan(40);
    expect(detectMultiColumn(layout)).toBe(true);
  });

  it('does not flag date-aligned single-column resumes as multi-column', () => {
    const layout = dateAlignedSingleColumnLayout();
    expect(detectMultiColumn(layout)).toBe(false);
    const signals = debugMultiColumnSignals(layout)[0];
    expect(signals.rightShare).toBeLessThan(0.22);

    const r = analyzeParseability({
      rawText: 'Experience\nEducation\nSkills\n' + 'word '.repeat(100),
      layout,
      sourceKind: 'pdf',
    });
    expect(r.findings.some((f) => f.id === 'multi_column')).toBe(false);
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it('does not hard-penalize normal top-of-page contact blocks', () => {
    const r = analyzeParseability({
      rawText: 'A'.repeat(400) + '\nExperience\nEducation\nSkills',
      layout: layoutWithItems([
        {
          str: 'jane@example.com',
          x: 200,
          y: 740, // ~6.5% from top — normal contact band
          pageIndex: 0,
          pageWidth: 612,
          pageHeight: 792,
        },
        {
          str: '+91 9709999477',
          x: 120,
          y: 740,
          pageIndex: 0,
          pageWidth: 612,
          pageHeight: 792,
        },
        ...Array.from({ length: 20 }, (_, i) => ({
          str: `body text line ${i}`,
          x: 72,
          y: 600 - i * 12,
          pageIndex: 0,
          pageWidth: 612,
          pageHeight: 792,
        })),
      ]),
      sourceKind: 'pdf',
    });
    expect(r.findings.some((f) => f.id === 'contact_in_header')).toBe(false);
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it('warns when contact sits in the footer band', () => {
    const r = analyzeParseability({
      rawText: 'A'.repeat(400) + '\nExperience\nEducation\nSkills',
      layout: layoutWithItems([
        {
          str: 'jane@example.com',
          x: 72,
          y: 20, // bottom ~2.5%
          pageIndex: 0,
          pageWidth: 612,
          pageHeight: 792,
        },
        ...Array.from({ length: 20 }, (_, i) => ({
          str: `body text line ${i}`,
          x: 72,
          y: 600 - i * 12,
          pageIndex: 0,
          pageWidth: 612,
          pageHeight: 792,
        })),
      ]),
      sourceKind: 'pdf',
    });
    expect(r.findings.some((f) => f.id === 'contact_in_footer')).toBe(true);
    expect(r.score).toBeLessThan(95);
  });

  it('is deterministic for the same inputs', () => {
    const input = {
      rawText: 'Experience\nAcme 2020-2024\nEducation\nSkills\n' + 'word '.repeat(80),
      layout: null as PdfLayoutInspectResult | null,
      sourceKind: 'txt' as const,
    };
    const a = analyzeParseability(input);
    const b = analyzeParseability(input);
    expect(a).toEqual(b);
  });

  it('discloses txt_no_layout for plain-text uploads', () => {
    const r = analyzeParseability({
      rawText: 'Experience\nEducation\nSkills\n' + 'word '.repeat(80),
      layout: null,
      sourceKind: 'txt',
    });
    expect(r.findings.some((f) => f.id === 'txt_no_layout')).toBe(true);
    expect(r.findings.some((f) => f.id === 'docx_layout_limited')).toBe(false);
  });
});
