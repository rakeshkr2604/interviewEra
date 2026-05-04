/**
 * Lightweight heuristic classification so users don't swap resume ↔ JD uploads.
 * Stricter mode: balanced documents must lean the right way + minimum signal counts.
 */

export type DocumentKindGuess = 'resume' | 'job_description' | 'balanced';

const SAMPLE_LEN = 14_000;

/** Minimum text length before we require stronger resume/JD signals */
const STRICT_MIN_LEN = 120;

const RESUME_PATTERNS: RegExp[] = [
  /\bcurriculum vitae\b/i,
  /\bresume\b/i,
  /\bcv\b/i,
  /work\s+experience/i,
  /employment\s+history/i,
  /professional\s+experience/i,
  /technical\s+skills/i,
  /education\b/i,
  /\bb\.?tech\b|\bb\.?e\.?\b|\bm\.?tech\b|\bmca\b|\bmba\b/i,
  /\bcgpa\b|\bgpa\b/i,
  /\binternship\b/i,
  /\bcertification\b/i,
  /languages?\s+known/i,
];

const JD_PATTERNS: RegExp[] = [
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
];

function patternHits(text: string, patterns: RegExp[]): number {
  let n = 0;
  for (const p of patterns) {
    const flags = p.flags.replace('g', '');
    const re = new RegExp(p.source, flags || undefined);
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

  if (text.length < 60) {
    return { text, resumeHits, jdHits, kind: 'balanced' };
  }

  let kind: DocumentKindGuess = 'balanced';
  if (resumeHits >= jdHits + 2) kind = 'resume';
  else if (jdHits >= resumeHits + 2) kind = 'job_description';

  return { text, resumeHits, jdHits, kind };
}

export function classifyDocumentKind(rawText: string): DocumentKindGuess {
  return analyzeDocument(rawText).kind;
}

export function assertLooksLikeResume(rawText: string): { ok: true } | { ok: false; message: string } {
  const { text, resumeHits, jdHits, kind } = analyzeDocument(rawText);

  if (text.length < 40) {
    return {
      ok: false,
      message: 'Extracted text from this file is too short. Upload a complete resume PDF or TXT.',
    };
  }

  if (kind === 'job_description') {
    return {
      ok: false,
      message:
        'This file reads like a job description, not a resume. Upload your CV/resume here — put the employer’s JD in the Job description section.',
    };
  }

  if (kind === 'balanced') {
    if (jdHits >= resumeHits) {
      return {
        ok: false,
        message:
          'We could not confirm this is a resume — it looks closer to a job posting. Upload your CV in this slot and move the company JD to the Job description section.',
      };
    }
    if (text.length >= STRICT_MIN_LEN && resumeHits < 2) {
      return {
        ok: false,
        message:
          'This does not look enough like a resume (missing typical education, experience, or skills signals). Upload your actual CV — not a cover letter or JD.',
      };
    }
  }

  return { ok: true };
}

export function assertLooksLikeJobDescription(rawText: string): { ok: true } | { ok: false; message: string } {
  const { text, resumeHits, jdHits, kind } = analyzeDocument(rawText);

  if (text.length < 40) {
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
    if (resumeHits >= jdHits) {
      return {
        ok: false,
        message:
          'We could not confirm this is a job description — it looks closer to a CV. Use the Job description box for the employer posting only.',
      };
    }
    if (text.length >= STRICT_MIN_LEN && jdHits < 2) {
      return {
        ok: false,
        message:
          'This does not look enough like a JD (missing typical responsibilities or requirements). Paste text from the official job posting.',
      };
    }
  }

  return { ok: true };
}
