/**
 * Heuristic resume vs job-description classification to reduce mistaken uploads.
 * Uses pattern hit counts; "balanced" docs apply slot-specific tie-breaks (JD box is lenient on ties).
 */

export type DocumentKindGuess = 'resume' | 'job_description' | 'balanced';

export type DocumentValidation = { ok: true } | { ok: false; message: string };

/** Max chars scanned (keeps regex work bounded on pasted blobs). */
const SAMPLE_LEN = 14_000;

/** Below this length, kind stays `balanced` — avoid guessing from tiny snippets. */
const MIN_LEN_FOR_KIND_GUESS = 60;

/** Minimum pasted/uploaded text before we call it substantial enough to validate. */
const MIN_SUBSTANTIVE_LEN = 25;

/** Long balanced JD text with zero JD signals — still reject in JD slot only. */
const STRICT_MIN_LEN = 120;

/**
 * Kind resolution margin: higher = fewer false "job description" classifications.
 */
const KIND_MARGIN = 3;

const RESUME_PATTERNS: readonly RegExp[] = [
  /\bcurriculum vitae\b/i,
  /\bresume\b/i,
  /\bcv\b/i,
  /work\s+experience/i,
  /employment\s+history/i,
  /professional\s+experience/i,
  /technical\s+skills/i,
  /\bb\.?tech\b|\bb\.?e\.?\b|\bm\.?tech\b|\bmca\b|\bmba\b/i,
  /\bcgpa\b|\bgpa\b/i,
  /\binternship\b/i,
  /\bcertification\b/i,
  /languages?\s+known/i,
];

const JD_PATTERNS: readonly RegExp[] = [
  /\bjob\s+description\b/i,
  /\bkey\s+responsibilit/i,
  /roles?\s+and\s+responsibilit/i,
  /what\s+you(?:'ll|\s+will)\s+do/i,
  /\bwe\s+are\s+(?:looking|hiring)\s+for\b/i,
  /\brequired\s+qualification/i,
  /\bpreferred\s+qualification/i,
  /\bmust\s*[- ]have\b/i,
  /\bnice\s+to\s+have\b/i,
  /\byears?\s+of\s+experience\b/i,
  /\bapply\s+(?:for|to)\s+this\b/i,
  /\babout\s+the\s+role\b/i,
  /\bresponsibilit(?:y|ies)\b/i,
  /\b(job\s+)?requirements?\b/i,
  /\beligibility\b/i,
  /\bwork\s+location\b/i,
  /\bctc\b|\bcompensation\b|\bsalary\s+range\b/i,
  /\bcandidate\s+(?:must|should|will)\b/i,
  /\bhiring\s+for\b/i,
  /\bposition\s+overview\b/i,
  /\bkey\s+skills\b/i,
];

function patternHits(text: string, patterns: readonly RegExp[]): number {
  let n = 0;
  for (const p of patterns) {
    const re = p.global ? new RegExp(p.source, p.flags.replace('g', '')) : p;
    if (re.test(text)) n += 1;
  }
  return n;
}

function analyzeDocument(rawText: string): {
  text: string;
  resumeHits: number;
  jdHits: number;
  kind: DocumentKindGuess;
} {
  const text = rawText.slice(0, SAMPLE_LEN).trim();
  const resumeHits = patternHits(text, RESUME_PATTERNS);
  const jdHits = patternHits(text, JD_PATTERNS);

  if (text.length < MIN_LEN_FOR_KIND_GUESS) {
    return { text, resumeHits, jdHits, kind: 'balanced' };
  }

  let kind: DocumentKindGuess = 'balanced';
  if (resumeHits >= jdHits + KIND_MARGIN) kind = 'resume';
  else if (jdHits >= resumeHits + KIND_MARGIN) kind = 'job_description';

  return { text, resumeHits, jdHits, kind };
}

export function classifyDocumentKind(rawText: string): DocumentKindGuess {
  return analyzeDocument(rawText).kind;
}

export function assertLooksLikeResume(rawText: string): DocumentValidation {
  const { text, kind } = analyzeDocument(rawText);

  if (text.length < MIN_SUBSTANTIVE_LEN) {
    return {
      ok: false,
      message: 'We could only read a very small amount of text. Upload a complete resume PDF or TXT.',
    };
  }

  // Only hard-reject when classification is clearly a job posting — not on weak/balanced signals.
  if (kind === 'job_description') {
    return {
      ok: false,
      message:
        'This file reads like a job description, not a resume. Upload your CV/resume here — put the employer’s JD in the Job description section.',
    };
  }

  return { ok: true };
}

export function assertLooksLikeJobDescription(rawText: string): DocumentValidation {
  const { text, resumeHits, jdHits, kind } = analyzeDocument(rawText);

  if (text.length < MIN_SUBSTANTIVE_LEN) {
    return {
      ok: false,
      message: 'Job description text is too short. Paste the full JD or upload a PDF/TXT of the posting.',
    };
  }

  if (kind === 'resume') {
    return {
      ok: false,
      message:
        'This looks like your resume. Paste or upload the company’s job description (requirements & responsibilities), not your CV.',
    };
  }

  if (kind === 'balanced') {
    // JD field: ties and JD-leaning pass; reject only when resume patterns clearly dominate.
    if (jdHits >= resumeHits) {
      if (text.length >= STRICT_MIN_LEN && jdHits < 1) {
        return {
          ok: false,
          message:
            'This does not look enough like a JD (missing typical responsibilities or requirements). Paste text from the official job posting.',
        };
      }
      return { ok: true };
    }
    return {
      ok: false,
      message:
        'We could not confirm this is a job description — it looks closer to a CV. Use the Job description box for the employer posting only.',
    };
  }

  return { ok: true };
}
