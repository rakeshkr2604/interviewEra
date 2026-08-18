/**
 * Normalize + hard-cap auto_structure LLM output.
 * Caps are deterministic — never rely on the model alone for brevity.
 */

export type CoachingReference = {
  feedback: string;
  restructured_example: string[];
  technical_terms: Array<{ term: string; definition: string; pronunciation?: string }>;
  missing_elements: string[];
};

export type NormalizedAutoStructure = {
  corrected_transcript: string;
  coaching_reference: CoachingReference;
};

const FALLBACK_FEEDBACK =
  'Solid answer. Keep practicing the same clarity on the next question.';

const MAX_RESTRUCTURED = 6;
const MAX_RESTRUCTURED_WORDS = 80;
const MAX_FEEDBACK_WORDS = 40;

const FRAMEWORK_PREFIX_RE =
  /^(situation|task|action|result|problem|approach|reasoning|conclusion)\s*[:\-–—]\s*/i;

/** Drop STAR/logical-flow headings so stored lines are spoken paragraphs. */
export function stripFrameworkPrefix(text: string): string {
  return text.replace(FRAMEWORK_PREFIX_RE, '').trim();
}

export function toSampleAnswerParagraphs(lines: string[]): string[] {
  return lines
    .flatMap((s) => s.split(/\n\s*\n/))
    .map(stripFrameworkPrefix)
    .filter((s) => s.length > 0);
}
const MAX_TECH_TERMS = 3;
const MAX_DEFINITION_WORDS = 12;
const MAX_MISSING = 2;
const MAX_MISSING_WORDS = 12;

function clampWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ');
}

function capStringList(items: string[], maxItems: number, maxWords: number): string[] {
  return items
    .map((s) => clampWords(s, maxWords))
    .filter((s) => s.length > 0)
    .slice(0, maxItems);
}

/** Normalize new shape; also accept legacy { structured_points, feedback, ... }. */
export function normalizeAutoStructureOutput(
  parsed: unknown,
  rawTranscript: string,
): NormalizedAutoStructure {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      corrected_transcript: rawTranscript,
      coaching_reference: {
        feedback: FALLBACK_FEEDBACK,
        restructured_example: [],
        technical_terms: [],
        missing_elements: [],
      },
    };
  }

  const row = parsed as Record<string, unknown>;

  if (typeof row.corrected_transcript === 'string' || row.coaching_reference) {
    const coachingRaw =
      row.coaching_reference && typeof row.coaching_reference === 'object' && !Array.isArray(row.coaching_reference)
        ? (row.coaching_reference as Record<string, unknown>)
        : {};

    const restructuredRaw = Array.isArray(coachingRaw.restructured_example)
      ? coachingRaw.restructured_example.filter((s): s is string => typeof s === 'string')
      : Array.isArray(coachingRaw.structured_points)
        ? coachingRaw.structured_points.filter((s): s is string => typeof s === 'string')
        : [];

    const technical_terms = Array.isArray(coachingRaw.technical_terms)
      ? coachingRaw.technical_terms
          .filter(
            (t): t is { term: string; definition: string; pronunciation?: string } =>
              !!t &&
              typeof t === 'object' &&
              typeof (t as { term?: unknown }).term === 'string' &&
              typeof (t as { definition?: unknown }).definition === 'string',
          )
          .slice(0, MAX_TECH_TERMS)
          .map((t) => ({
            term: t.term.trim(),
            definition: clampWords(t.definition, MAX_DEFINITION_WORDS),
            ...(typeof t.pronunciation === 'string' && t.pronunciation.trim()
              ? { pronunciation: t.pronunciation.trim() }
              : {}),
          }))
      : [];

    const missing_elements = Array.isArray(coachingRaw.missing_elements)
      ? capStringList(
          coachingRaw.missing_elements.filter((m): m is string => typeof m === 'string'),
          MAX_MISSING,
          MAX_MISSING_WORDS,
        )
      : [];

    const feedbackRaw =
      typeof coachingRaw.feedback === 'string' && coachingRaw.feedback.trim()
        ? coachingRaw.feedback.trim()
        : missing_elements.length > 0
          ? `Good start — next time, tighten this: ${missing_elements[0]}`
          : FALLBACK_FEEDBACK;

    const corrected =
      row.corrected_transcript === null || row.corrected_transcript === undefined
        ? rawTranscript
        : typeof row.corrected_transcript === 'string' && row.corrected_transcript.trim()
          ? row.corrected_transcript.trim()
          : rawTranscript;

    return {
      corrected_transcript: corrected,
      coaching_reference: {
        feedback: clampWords(feedbackRaw, MAX_FEEDBACK_WORDS),
        restructured_example: capStringList(
          toSampleAnswerParagraphs(restructuredRaw),
          MAX_RESTRUCTURED,
          MAX_RESTRUCTURED_WORDS,
        ),
        technical_terms,
        missing_elements,
      },
    };
  }

  // Legacy shape → map structured_points into coaching only; leave corrected ≈ raw
  const structured_points = Array.isArray(row.structured_points)
    ? row.structured_points.filter((s): s is string => typeof s === 'string')
    : [];
  const technical_terms = Array.isArray(row.technical_terms)
    ? row.technical_terms
        .filter(
          (t): t is { term: string; definition: string; pronunciation?: string } =>
            !!t &&
            typeof t === 'object' &&
            typeof (t as { term?: unknown }).term === 'string' &&
            typeof (t as { definition?: unknown }).definition === 'string',
        )
        .slice(0, MAX_TECH_TERMS)
        .map((t) => ({
          term: t.term.trim(),
          definition: clampWords(t.definition, MAX_DEFINITION_WORDS),
          ...(typeof t.pronunciation === 'string' && t.pronunciation.trim()
            ? { pronunciation: t.pronunciation.trim() }
            : {}),
        }))
    : [];
  const missing_elements = Array.isArray(row.missing_elements)
    ? capStringList(
        row.missing_elements.filter((m): m is string => typeof m === 'string'),
        MAX_MISSING,
        MAX_MISSING_WORDS,
      )
    : [];
  const feedback =
    typeof row.feedback === 'string' && row.feedback.trim()
      ? clampWords(row.feedback.trim(), MAX_FEEDBACK_WORDS)
      : FALLBACK_FEEDBACK;

  return {
    corrected_transcript: rawTranscript,
    coaching_reference: {
      feedback,
      restructured_example: capStringList(
        toSampleAnswerParagraphs(structured_points),
        MAX_RESTRUCTURED,
        MAX_RESTRUCTURED_WORDS,
      ),
      technical_terms,
      missing_elements,
    },
  };
}
