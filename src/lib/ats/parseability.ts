/**
 * Deterministic parseability analyzer — no LLM.
 * Combines optional pdf.js layout signals with raw-text heuristics.
 *
 * Calibration notes (2026-07 Phase 1 follow-up):
 * - Right-aligned dates on a single-column Jake/LaTeX resume are NOT multi-column.
 *   Require substantial right-side mass + non-date content before flagging.
 * - Contact in the top ~8–12% of the page is the normal resume contact block, NOT a
 *   PDF header/footer object. We cannot detect true Word/PDF header objects from
 *   text positions alone, so we do not hard-penalize top-of-page contact.
 */

import type { Finding } from '@/lib/ats/types';
import type { LayoutTextItem, PdfLayoutInspectResult } from '@/lib/ats/pdf-layout-inspect';

const STANDARD_HEADINGS =
  /^(work\s+)?experience|employment(\s+history)?|professional\s+experience|education|academic\s+background|skills|technical\s+skills|core\s+competencies|projects|certifications?|summary|professional\s+summary|objective|contact|profile$/i;

const NONSTANDARD_HEADING_HINTS =
  /^(my\s+journey|career\s+story|what\s+i.?ve\s+done|about\s+me|the\s+basics|toolbox|where\s+i.?ve\s+been|academics|tech\s+stack)$/im;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const DATE_TOKEN_RE =
  /\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}\s*[-–—]\s*(?:\d{4}|present|current)|(?:present|current))\b/gi;

/** Short right-rail tokens that usually mean date-aligned single-column, not a real column. */
const DATEISH_OR_META_RE =
  /^(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}(?:\s*[-–—]\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(?:\d{4}|present|current))?|(?:present|current)|(?:cgpa|gpa)\s*:?\s*[\d.\/]+|\d{4}|[\d.,]+(?:\s*(?:%|months?|users?|pages?))?|[|•⋄·,.;:\-–—]|live)$/i;

export type AtsSourceKind = 'pdf' | 'txt' | 'docx';

export interface ParseabilityInput {
  rawText: string;
  /** null for TXT/DOCX uploads or when layout inspect unavailable. */
  layout: PdfLayoutInspectResult | null;
  sourceKind: AtsSourceKind;
}

export interface ParseabilityResult {
  score: number;
  findings: Finding[];
  /** Hard warning — image-like / near-empty extract. */
  imageBasedHardWarning: boolean;
}

/** Exported for calibration scripts / unit tests — raw multi-column signals. */
export interface MultiColumnSignals {
  triggered: boolean;
  leftChars: number;
  rightChars: number;
  midChars: number;
  rightShare: number;
  yOverlapRatio: number;
  dateishRightShare: number;
}

function clampScore(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)));
}

function isDateishOrMeta(str: string): boolean {
  const t = str.trim();
  if (!t) return true;
  if (t.length <= 2) return true;
  if (DATEISH_OR_META_RE.test(t)) return true;
  // Wrapped fragments from justified lines are usually short and not a skills rail
  if (t.length <= 12 && !/[a-z]{4,}/i.test(t.replace(/[^a-z]/gi, ''))) return true;
  return false;
}

function pageMultiColumnSignals(items: LayoutTextItem[]): MultiColumnSignals {
  const empty: MultiColumnSignals = {
    triggered: false,
    leftChars: 0,
    rightChars: 0,
    midChars: 0,
    rightShare: 0,
    yOverlapRatio: 0,
    dateishRightShare: 0,
  };
  if (items.length < 24) return empty;

  const pageWidth = items[0]?.pageWidth ?? 0;
  if (pageWidth <= 0) return empty;

  // Tighter side bands: ignore the center gutter so date-aligned right margins
  // are compared against a true left body column, not mid-line wraps.
  const leftCut = pageWidth * 0.42;
  const rightCut = pageWidth * 0.58;
  const left = items.filter((i) => i.x < leftCut);
  const right = items.filter((i) => i.x > rightCut);
  const mid = items.filter((i) => i.x >= leftCut && i.x <= rightCut);

  const leftChars = left.reduce((n, i) => n + i.str.length, 0);
  const rightChars = right.reduce((n, i) => n + i.str.length, 0);
  const midChars = mid.reduce((n, i) => n + i.str.length, 0);
  const sideTotal = leftChars + rightChars;
  const rightShare = sideTotal > 0 ? rightChars / sideTotal : 0;

  let yOverlapRatio = 0;
  if (left.length && right.length) {
    const lMin = Math.min(...left.map((i) => i.y));
    const lMax = Math.max(...left.map((i) => i.y));
    const rMin = Math.min(...right.map((i) => i.y));
    const rMax = Math.max(...right.map((i) => i.y));
    const overlap = Math.min(lMax, rMax) - Math.max(lMin, rMin);
    const span = Math.max(lMax, rMax) - Math.min(lMin, rMin);
    yOverlapRatio = span > 0 ? overlap / span : 0;
  }

  const dateishRightChars = right.reduce(
    (n, i) => n + (isDateishOrMeta(i.str) ? i.str.length : 0),
    0,
  );
  const dateishRightShare = rightChars > 0 ? dateishRightChars / rightChars : 0;

  // True multi-column (skills rail / dual body):
  // 1) both sides have meaningful mass
  // 2) right side is a substantial share (not a thin date margin)
  // 3) vertical overlap of the two streams
  // 4) right side is mostly real content, not dates/CGPA/punctuation
  const triggered =
    leftChars >= 120 &&
    rightChars >= 160 &&
    rightShare >= 0.22 &&
    yOverlapRatio > 0.4 &&
    dateishRightShare < 0.55;

  return {
    triggered,
    leftChars,
    rightChars,
    midChars,
    rightShare,
    yOverlapRatio,
    dateishRightShare,
  };
}

/**
 * Detect true dual-column / sidebar layouts. Ignores date-aligned single-column resumes.
 */
export function detectMultiColumn(layout: PdfLayoutInspectResult): boolean {
  // Per-page mass/share thresholds live in pageMultiColumnSignals; keep this
  // floor low so short but real dual-column pages (skills rails) still qualify.
  if (!layout.available || layout.items.length < 24) return false;

  const byPage = new Map<number, LayoutTextItem[]>();
  for (const it of layout.items) {
    const list = byPage.get(it.pageIndex) ?? [];
    list.push(it);
    byPage.set(it.pageIndex, list);
  }

  for (const items of byPage.values()) {
    if (pageMultiColumnSignals(items).triggered) return true;
  }
  return false;
}

/** @internal exported for unit tests */
export function debugMultiColumnSignals(layout: PdfLayoutInspectResult): MultiColumnSignals[] {
  if (!layout.available) return [];
  const byPage = new Map<number, LayoutTextItem[]>();
  for (const it of layout.items) {
    const list = byPage.get(it.pageIndex) ?? [];
    list.push(it);
    byPage.set(it.pageIndex, list);
  }
  return [...byPage.values()].map(pageMultiColumnSignals);
}

function detectFooterContact(layout: PdfLayoutInspectResult): boolean {
  if (!layout.available) return false;
  for (const it of layout.items) {
    // Bottom 5% only — footers are more often stripped; top contact is normal.
    const bandBottom = it.pageHeight * 0.05;
    const looksContact = EMAIL_RE.test(it.str) || PHONE_RE.test(it.str);
    if (looksContact && it.y <= bandBottom) return true;
  }
  return false;
}

function detectGridArtifacts(layout: PdfLayoutInspectResult): boolean {
  if (!layout.available || layout.items.length < 60) return false;
  const short = layout.items.filter((i) => i.str.trim().length <= 3);
  if (short.length < layout.items.length * 0.45) return false;
  const xBuckets = new Map<number, number>();
  for (const it of short) {
    const key = Math.round(it.x / 8) * 8;
    xBuckets.set(key, (xBuckets.get(key) ?? 0) + 1);
  }
  let columnsWithMass = 0;
  for (const count of xBuckets.values()) {
    if (count >= 8) columnsWithMass += 1;
  }
  return columnsWithMass >= 4;
}

function analyzeDateFormats(text: string): Finding | null {
  const matches = text.match(DATE_TOKEN_RE) ?? [];
  if (matches.length < 3) return null;
  const styles = new Set<string>();
  for (const m of matches) {
    if (/[a-z]{3}/i.test(m) && /\d{4}/.test(m)) styles.add('month-name');
    else if (/\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/.test(m)) styles.add('numeric-slash');
    else if (/\d{4}/.test(m)) styles.add('year-range');
  }
  if (styles.size >= 3) {
    return {
      id: 'inconsistent_dates',
      severity: 'warning',
      message:
        'Date formats look inconsistent across the resume. Prefer one style (e.g. Mon YYYY – Mon YYYY) so parsers can order your roles reliably.',
    };
  }
  return null;
}

function analyzeHeadings(text: string): Finding | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && l.length < 48);

  let standard = 0;
  let nonstandard = 0;
  for (const line of lines) {
    if (STANDARD_HEADINGS.test(line)) standard += 1;
    if (NONSTANDARD_HEADING_HINTS.test(line)) nonstandard += 1;
  }

  if (nonstandard > 0 && standard === 0) {
    return {
      id: 'nonstandard_headings',
      severity: 'warning',
      message:
        'Section headings look non-standard (e.g. creative titles instead of Experience / Education / Skills). Many parsers key off common labels — this is a soft risk, not a hard failure.',
    };
  }
  if (nonstandard > 0) {
    return {
      id: 'mixed_headings',
      severity: 'info',
      message:
        'Some section titles are creative rather than standard. Consider also using Experience, Education, and Skills labels.',
    };
  }
  return null;
}

/**
 * Score parseability 0–100 from layout + text. Deterministic for the same inputs.
 */
export function analyzeParseability(input: ParseabilityInput): ParseabilityResult {
  const findings: Finding[] = [];
  let score = 100;
  let imageBasedHardWarning = false;

  const trimmed = input.rawText.trim();
  const chars = trimmed.length;

  if (chars < 80) {
    imageBasedHardWarning = true;
    score -= 55;
    findings.push({
      id: 'image_based_or_empty',
      severity: 'error',
      message:
        input.sourceKind === 'docx'
          ? 'Very little text was recovered from this Word document. Many ATS platforms will extract little to no text from image-only or empty files. Use a text-based .docx or export a text PDF.'
          : 'This looks like an image-based PDF (or nearly empty text). Many ATS platforms will extract little to no text from it. Export a text-based PDF from Word/Google Docs, or upload a .txt file.',
    });
  } else if (chars < 200) {
    score -= 25;
    findings.push({
      id: 'low_text_density',
      severity: 'warning',
      message:
        input.sourceKind === 'docx'
          ? 'Very little extractable text was found in this Word document. Prefer a text-based .docx (not screenshots or image-only content).'
          : 'Very little extractable text was found. If this is a designed/Canva PDF, re-export as a standard text PDF.',
    });
  }

  if (input.sourceKind === 'txt') {
    findings.push({
      id: 'txt_no_layout',
      severity: 'info',
      message:
        'Plain-text upload: layout checks (columns, header/footer bands) do not apply. Text heuristics only.',
    });
  } else if (input.sourceKind === 'docx') {
    // mammoth exposes raw text (and optional HTML), not page coordinates —
    // column / header-footer / grid signals from pdf.js are unavailable.
    findings.push({
      id: 'docx_layout_limited',
      severity: 'info',
      message:
        'Layout checks are limited for Word documents: columns, header/footer bands, and table geometry are not measured here. Parseability uses text heuristics only (dates, headings, extractable length).',
    });
  } else if (!input.layout || !input.layout.available) {
    findings.push({
      id: 'layout_unavailable',
      severity: 'info',
      message:
        'Positional layout inspection was unavailable for this file. Parseability relies on text heuristics only.',
    });
  } else {
    const layout = input.layout;
    if (layout.totalChars < 80 && chars >= 80) {
      score -= 20;
      findings.push({
        id: 'weak_text_layer',
        severity: 'warning',
        message:
          'The PDF text layer looks sparse relative to the extracted content. Some platforms ignore OCR-recovered text and may see far less than you do here.',
      });
    }

    if (detectMultiColumn(layout)) {
      score -= 30;
      findings.push({
        id: 'multi_column',
        severity: 'error',
        message:
          'Multi-column layout detected (substantial parallel text on left and right). Reading order is often scrambled in legacy parsers — use a single-column layout.',
      });
    }

    // Top-of-page contact is normal for resumes. We only warn on footer-band contact.
    if (detectFooterContact(layout)) {
      score -= 10;
      findings.push({
        id: 'contact_in_footer',
        severity: 'warning',
        message:
          'Contact details appear in a footer region. Prefer placing them in the document body so parsers that skip footers still see them.',
      });
    }

    if (detectGridArtifacts(layout)) {
      score -= 15;
      findings.push({
        id: 'table_like_fragmentation',
        severity: 'warning',
        message:
          'Text looks fragmented into many short aligned tokens (common with tables or text boxes). Prefer simple paragraph/bullet layouts.',
      });
    }
  }

  const dateFinding = analyzeDateFormats(trimmed);
  if (dateFinding) {
    score -= 8;
    findings.push(dateFinding);
  }

  const headingFinding = analyzeHeadings(trimmed);
  if (headingFinding) {
    if (headingFinding.id === 'nonstandard_headings') score -= 6;
    findings.push(headingFinding);
  }

  if (findings.length === 0) {
    findings.push({
      id: 'parseability_ok',
      severity: 'info',
      message: 'No major parseability risks detected from layout and text heuristics.',
    });
  }

  return {
    score: clampScore(score),
    findings,
    imageBasedHardWarning,
  };
}
