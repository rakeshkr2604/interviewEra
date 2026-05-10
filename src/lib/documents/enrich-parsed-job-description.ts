import type { ParsedJobDescription } from '@/types/app.types';

/** Treat as missing — strip so UI does not show "Not specified". */
export function isJdPlaceholderScalar(value: string): boolean {
  const t = value.trim().toLowerCase();
  return (
    t.length === 0 ||
    /^not\s*specified\.?$/.test(t) ||
    /^n\/?a\.?$/.test(t) ||
    t === 'unknown' ||
    t === 'none' ||
    t === '—' ||
    t === '-' ||
    t === 'tbd' ||
    t === 'tbc'
  );
}

/**
 * When the model skips the employer name, infer it from common placement/JD phrases
 * (e.g. "open position at Appian Infotech for the upcoming placement drive").
 */
export function enrichParsedJobDescriptionFromRaw(
  rawText: string,
  parsed: ParsedJobDescription,
): ParsedJobDescription {
  const window = rawText.slice(0, 10_000);
  let company = parsed.company_employer.trim();

  if (!isJdPlaceholderScalar(company)) {
    return parsed;
  }

  const patterns: RegExp[] = [
    /\bfor\s+the\s+open\s+position\s+at\s+([^,.;\n]+?)\s+for\s+the\b/i,
    /\bopen\s+position\s+at\s+([^,.;\n]+?)\s+for\s+the\b/i,
    /\bposition\s+at\s+([^,.;\n]+?)\s+for\s+the\b/i,
    /\bat\s+([A-Z][A-Za-z0-9&.'’\-\s]{1,55}?)\s+for\s+the\s+upcoming\s+placement\b/i,
    /\bplacement\s+(?:drive|cell)\s+(?:at|from)\s+([A-Z][A-Za-z0-9&.'’\-\s]{1,55}?)(?:\s+for|\s*,|\s*\.|\n)/i,
    /\bclient\s*[:-]\s*([A-Za-z0-9&.'’\-\s]{2,80}?)(?:\s*[,.]|\n|$)/i,
  ];

  for (const re of patterns) {
    const m = window.match(re);
    if (!m?.[1]) continue;
    let candidate = m[1].replace(/\s+/g, ' ').trim();
    candidate = candidate.replace(/\b(the|a|an)\s+$/i, '').trim();
    if (candidate.length >= 2 && candidate.length <= 120 && !/^our\s+/i.test(candidate)) {
      company = candidate;
      break;
    }
  }

  if (isJdPlaceholderScalar(company)) {
    return parsed;
  }

  return { ...parsed, company_employer: company };
}
