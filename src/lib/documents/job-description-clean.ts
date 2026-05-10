/**
 * Strip email / placement-cell fluff from pasted or extracted JD text so the UI and
 * interview payload focus on role substance (scope, responsibilities, requirements).
 */

const MAX_SCAN = 14_000;

/** Strong signals the line/sentence is about the role, not email etiquette. */
const SUBSTANTIVE =
  /\b(responsibilit|requirement|qualification|eligibility|recruit|hiring|placement\s+drive|open\s+position|role\b|position\b|candidate\b|must[\s-]have|nice\s+to\s+have|years?\s+of\s+experience|skill|technical|ctc|compensation|salary|work\s+location|shift|bachelor'?s|master'?s|b\.?tech|m\.?tech|mba\b|key\s+deliver|kpi|about\s+the\s+role|job\s+summary|position\s+overview|we\s+are\s+looking|looking\s+to\s+hire)\b/i;

const FLUFF_ONLY =
  /^\s*(hi\b|hello\b|dear\b|good\s+(morning|afternoon|evening)\b|greetings?\b|hope\s+you(?:'re|\s+are)?\b|thanks?\b|thank\s+you\b|regards?\b|best\b|sincerely\b)\b/i;

const LINE_BOILERPLATE =
  /^\s*(as\s+discussed|please\s+find|kindly\s+(share|find|refer)|pfa\b|attached\s+(is|jd|job|please)|for\s+the\s+upcoming\s+placement)\b/i;

const TRAILING_NOISE =
  /\s+(kindly\s+share[\s\S]*|please\s+feel\s+free[\s\S]*|let\s+us\s+know[\s\S]*|looking\s+forward[\s\S]*)$/i;

function normalizeNewlines(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

/** Split "…Role Hello Hope" run-ons so sentence/line heuristics work. */
function splitRunOnGreeting(text: string): string {
  return text.replace(/([a-z0-9)])(\s+)(Hello|Hi\b|Dear|Hope you|Greetings)\b/gi, '$1\n$3');
}

/** Remove common email openers from the start of the blob (multi-pass). */
function peelOpeningPhrases(text: string, maxPasses = 10): string {
  let t = text.trim();
  const peelers = [
    /^(Hello|Hi there|Hi,?|Dear\b[^,\n]{0,40})[^.!?\n]{0,100}[.!?]?\s*/i,
    /^Hope you(?:'re|\s+are)?\s+(?:doing\s+)?well[^.!?\n]{0,40}[.!?]?\s*/i,
    /^(As discussed|As per our discussion)[^.!?\n]{0,120}[.!?]?\s*/i,
    /^(Please find|Kindly find|Please refer to|PFA\b)[^.!?\n]{0,160}[.!?]?\s*/i,
    /^(Greetings?|Good morning|Good afternoon|Good evening)[^.!?\n]{0,60}[.!?]?\s*/i,
  ];
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const before = t;
    for (const re of peelers) {
      t = t.replace(re, '').trim();
    }
    if (t === before) break;
  }
  return t;
}

function stripLeadingLines(text: string): string {
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === '') {
      i += 1;
      continue;
    }
    if (line.length < 96 && FLUFF_ONLY.test(line)) {
      i += 1;
      continue;
    }
    if (LINE_BOILERPLATE.test(line) && line.length < 140 && !SUBSTANTIVE.test(line)) {
      i += 1;
      continue;
    }
    if (line.length < 120 && !SUBSTANTIVE.test(line) && /\b(kindly|please|attached|discussed|share with)\b/i.test(line)) {
      i += 1;
      continue;
    }
    break;
  }
  return lines.slice(i).join('\n').trim();
}

/** When line 1 is a title, peel greetings from the remainder. */
function peelBodyAfterTitleLine(text: string): string {
  const nl = text.indexOf('\n');
  if (nl === -1) return text;
  const first = text.slice(0, nl).trim();
  const rest = text.slice(nl + 1).trim();
  if (!rest) return first;
  return `${first}\n${peelOpeningPhrases(rest)}`.trim();
}

/** Prefer content from the first clear "substantive hiring" anchor (keeps most email JDs). */
function sliceFromHiringAnchor(text: string): string {
  const anchor =
    /\b(we(?:'re|\s+are)\s+looking\s+to\s+hire|we(?:'re|\s+are)\s+looking\s+for|looking\s+to\s+hire|hiring\s+for|the\s+opportunity\s+is|key\s+responsibilit|roles?\s+and\s+responsibilit|about\s+the\s+role|job\s+summary|(?:^|\n)\s*(?:key\s+)?requirements?\s*:)/gim;
  const m = anchor.exec(text);
  if (!m || m.index == null || m.index > text.length * 0.7) return text;

  let start = m.index;
  const prefix = text.slice(0, start);
  const titleLine = prefix.match(/(?:job\s+description\s+for[^\n]{0,200}|placement\s+drive[^\n]{0,120})/i);
  if (titleLine && titleLine[0].length <= 220) {
    const tStart = prefix.lastIndexOf(titleLine[0]);
    if (tStart >= 0) start = tStart;
  }
  return text.slice(start).trim();
}

/** If explicit section headers exist, keep those blocks (and title line if present). */
function extractSectionedBlocks(text: string): string | null {
  const header =
    /(?:^|\n)\s*(?:#*\s*)?(key\s+)?(?:responsibilit(?:y|ies)|requirements?|qualifications?|about\s+(?:the\s+)?role|must[\s-]have|nice\s+to\s+have|eligibility|what\s+you(?:'ll|\s+will)\s+do|job\s+summary|position\s+overview)(?:\s*[:\-–])?\s*/gim;
  const hits: { index: number; labelEnd: number }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(header.source, header.flags);
  while ((m = re.exec(text)) !== null) {
    hits.push({ index: m.index, labelEnd: m.index + m[0].length });
  }
  if (hits.length === 0) return null;

  const firstHeadingIdx = hits[0].index;
  let titlePart = '';
  const before = text.slice(0, firstHeadingIdx).trim();
  const titleMatch = before.match(/(?:job\s+description\s+for[^\n]+|[^\n]{0,160}\b(?:role|position)\b[^\n]{0,80})$/i);
  if (titleMatch && titleMatch[0].length <= 200) titlePart = `${titleMatch[0].trim()}\n\n`;

  const parts: string[] = [];
  for (let i = 0; i < hits.length; i += 1) {
    const to = i + 1 < hits.length ? hits[i + 1].index : text.length;
    const block = text.slice(hits[i].index, to).trim();
    if (block) parts.push(block);
  }
  const merged = (titlePart + parts.join('\n\n')).trim();
  return merged.length >= 40 ? merged : null;
}

function stripTrailingNoise(text: string): string {
  return text.replace(TRAILING_NOISE, '').trim();
}

function collapseWhitespace(text: string): string {
  return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
}

/**
 * Remove leading/trailing placement-email noise and prefer role-focused segments.
 */
export function extractJobDescriptionSubstance(raw: string): string {
  let t = normalizeNewlines(raw).slice(0, MAX_SCAN);
  if (!t) return '';

  t = splitRunOnGreeting(t);
  t = peelOpeningPhrases(t);
  t = stripLeadingLines(t);
  t = peelBodyAfterTitleLine(t);
  t = stripLeadingLines(t);
  t = sliceFromHiringAnchor(t);
  t = stripTrailingNoise(t);

  const sectioned = extractSectionedBlocks(t);
  if (sectioned) t = sectioned;

  t = collapseWhitespace(stripLeadingLines(t));
  t = stripTrailingNoise(t);

  return t.trim();
}

/** Use refined text when it is still long enough to be a JD; otherwise keep original. */
export function refineJobDescriptionForUi(raw: string, minLen = 40): string {
  const trimmed = normalizeNewlines(raw).slice(0, MAX_SCAN);
  const refined = extractJobDescriptionSubstance(trimmed);
  if (refined.length >= minLen) return refined;
  return trimmed;
}
