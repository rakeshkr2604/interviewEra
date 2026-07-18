/**
 * Ranked action items derived programmatically from findings — no free-form LLM suggestions.
 */

import type { AtsActionItem, Finding } from '@/lib/ats/types';

const IMPACT_BY_FINDING: Record<
  string,
  { priority: AtsActionItem['priority']; text: string; expectedImpact: string }
> = {
  image_based_or_empty: {
    priority: 'high',
    text: 'Re-export your resume as a text-based PDF (File → Save as PDF from Word/Google Docs), or upload a .txt version.',
    expectedImpact: 'Recovers Parseability — without a text layer, most platforms extract almost nothing.',
  },
  low_text_density: {
    priority: 'high',
    text: 'Replace designed/image-heavy PDFs with a simple single-column text export.',
    expectedImpact: 'Improves Parseability and Field Extraction Accuracy.',
  },
  weak_text_layer: {
    priority: 'high',
    text: 'Avoid scanned or image-flattened PDFs; export from an editor that embeds a real text layer.',
    expectedImpact: 'Recovers Parseability on platforms that do not run OCR.',
  },
  multi_column: {
    priority: 'high',
    text: 'Switch to a single-column layout (no side skills rail or dual columns).',
    expectedImpact: 'Recovers Parseability — multi-column layouts scramble reading order in many parsers.',
  },
  contact_in_footer: {
    priority: 'medium',
    text: 'Move contact details out of the footer into the body.',
    expectedImpact: 'Improves contact Field Extraction Accuracy.',
  },
  table_like_fragmentation: {
    priority: 'medium',
    text: 'Remove tables and text boxes; use plain headings and bullet lists.',
    expectedImpact: 'Improves Parseability of skills and experience lines.',
  },
  inconsistent_dates: {
    priority: 'medium',
    text: 'Standardize all dates to one format (e.g. Mon YYYY – Mon YYYY or Mon YYYY – Present).',
    expectedImpact: 'Improves Structure Quality (ordering) and date parsing.',
  },
  nonstandard_headings: {
    priority: 'medium',
    text: 'Rename creative section titles to standard labels: Experience, Education, Skills.',
    expectedImpact: 'Soft Parseability gain — parsers key off common heading strings.',
  },
  mixed_headings: {
    priority: 'low',
    text: 'Add standard Experience / Education / Skills headings alongside any creative titles.',
    expectedImpact: 'Small Parseability improvement for section detection.',
  },
  missing_experience: {
    priority: 'high',
    text: 'Add a clearly labeled Experience (or Work Experience) section with role, company, and dates.',
    expectedImpact: 'Recovers Structure Quality and Field Extraction for experience.',
  },
  missing_education: {
    priority: 'medium',
    text: 'Add an Education section with institution, degree, and year.',
    expectedImpact: 'Improves Structure Quality and education Field Extraction.',
  },
  missing_skills: {
    priority: 'medium',
    text: 'Add a Skills section with plain-text skill names (not icons or skill bars).',
    expectedImpact: 'Improves Structure Quality and keyword findability after parse.',
  },
  not_reverse_chrono: {
    priority: 'medium',
    text: 'Reorder experience so the newest role is first.',
    expectedImpact: 'Improves Structure Quality for chronological interpretation.',
  },
  length_short: {
    priority: 'medium',
    text: 'Expand thin sections with concrete role bullets (tools, scope, outcomes).',
    expectedImpact: 'Improves Structure Quality length signal and extraction richness.',
  },
};

const PRIORITY_RANK: Record<AtsActionItem['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function missingFieldActions(missingFields: string[]): AtsActionItem[] {
  const map: Record<string, AtsActionItem> = {
    name: {
      priority: 'high',
      text: 'Put your full name as plain text near the top of the resume body.',
      expectedImpact: 'Recovers Field Extraction Accuracy for name.',
    },
    email: {
      priority: 'high',
      text: 'Include a plain-text email address in the body (not only in a header graphic).',
      expectedImpact: 'Recovers Field Extraction Accuracy for email.',
    },
    phone: {
      priority: 'high',
      text: 'Include a plain-text phone number in the body.',
      expectedImpact: 'Recovers Field Extraction Accuracy for phone.',
    },
    location: {
      priority: 'low',
      text: 'Add a city/region as plain text near your contact block.',
      expectedImpact: 'Improves Field Extraction Accuracy for location.',
    },
    linkedin: {
      priority: 'low',
      text: 'Add your LinkedIn URL as plain text (not only as a clickable icon).',
      expectedImpact: 'Improves Field Extraction Accuracy for LinkedIn.',
    },
  };

  return missingFields.map((f) => map[f]).filter((a): a is AtsActionItem => Boolean(a));
}

/**
 * Build ranked, explainable action items from analyzer findings + missing fields.
 */
export function buildActionItems(options: {
  parseabilityFindings: Finding[];
  structureFindings: Finding[];
  missingFields: string[];
  extractionDegraded?: boolean;
}): AtsActionItem[] {
  const items: AtsActionItem[] = [];
  const seen = new Set<string>();

  const push = (item: AtsActionItem) => {
    const key = item.text;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  if (options.extractionDegraded) {
    push({
      priority: 'medium',
      text: 'Re-upload a cleaner text-based PDF and run the check again — structured extraction failed validation on this file.',
      expectedImpact: 'Restores Field Extraction Accuracy once the text layer is reliable.',
    });
  }

  for (const f of [...options.parseabilityFindings, ...options.structureFindings]) {
    if (f.severity === 'info' && !IMPACT_BY_FINDING[f.id]) continue;
    const mapped = IMPACT_BY_FINDING[f.id];
    if (mapped) push(mapped);
  }

  for (const a of missingFieldActions(options.missingFields)) {
    push(a);
  }

  items.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  return items.slice(0, 10);
}
