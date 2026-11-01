/**
 * ATS Checker v2 result contract — multi-dimensional, explainable scores.
 * Client-safe (no Node/server imports).
 */

export type FindingSeverity = 'info' | 'warning' | 'error';

export interface Finding {
  id: string;
  severity: FindingSeverity;
  /** Human-readable explanation tied to a concrete check. */
  message: string;
}

export interface ExtractedExperience {
  company: string | null;
  title: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface ExtractedEducation {
  institution: string | null;
  degree: string | null;
  year: string | null;
}

export interface ExtractedResumeData {
  name: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  location: string | null;
  experience: ExtractedExperience[];
  education: ExtractedEducation[];
  skills: string[];
}

export type ActionPriority = 'high' | 'medium' | 'low';

export interface AtsActionItem {
  priority: ActionPriority;
  text: string;
  expectedImpact: string;
  /**
   * Approximate JD-match score points recoverable by addressing this fix,
   * derived from the existing required×45 + preferred×15 weighting (display
   * only — never feeds back into the actual score calculation).
   */
  pointsEstimate?: number;
}

/**
 * JD language-overlap dimension (only when a JD is provided).
 * InterviewEra's own analysis — not a named-platform match score.
 */
export interface AtsJdMatch {
  score: number;
  findings: Finding[];
  /** Exact/normalized coverage of JD required skills (0–100). */
  requiredCoverage: number;
  /** Exact/normalized coverage of JD preferred skills (0–100). */
  preferredCoverage: number;
  /** Semantic: how well resume language covers JD requirements (0–100). */
  jdRequirementCoverage: number;
  /** Semantic: how focused resume skill language is on this JD (0–100). */
  resumeFocusAlignment: number;
  matchedRequired: string[];
  missingRequired: string[];
  matchedPreferred: string[];
  missingPreferred: string[];
  /** Total canonical required items contributing to the required-coverage weight (matched + missing). */
  requiredTotalCount: number;
  /** Total canonical preferred items contributing to the preferred-coverage weight (matched + missing). */
  preferredTotalCount: number;
  /** Full missing-required count (missingRequired[] above may be display-truncated to 8). */
  requiredMissingCount: number;
  /** Full missing-preferred count (missingPreferred[] above may be display-truncated to 8). */
  preferredMissingCount: number;
  /**
   * JD skills matched ONLY via mentions found in resume free text (experience
   * bullets / projects) — not listed in the skills section. Distinguishes
   * "you listed this" from "we found evidence but you didn't list it".
   */
  inferredFromExperience?: string[];
  degraded?: boolean;
}

export interface AtsResultV2 {
  parseability: { score: number; findings: Finding[] };
  fieldExtraction: {
    score: number;
    extracted: ExtractedResumeData;
    missingFields: string[];
    /** True when Zod validation failed twice and we degraded. */
    extractionDegraded?: boolean;
  };
  structureQuality: { score: number; findings: Finding[] };
  actionItems: AtsActionItem[];
  /** null when the user did not provide a job description. */
  jdMatch: AtsJdMatch | null;
}

/** @deprecated Phase 0 shape — kept only for type-migration clarity. */
export type AtsResult = AtsResultV2;

export type AtsErrorCode =
  | 'PARSER_UNAVAILABLE'
  | 'ENCRYPTED'
  | 'SCANNED_NO_TEXT'
  | 'CORRUPT'
  | 'UNSUPPORTED'
  | 'PARSER_RUNTIME'
  | 'EMPTY'
  | 'TOO_LARGE'
  | 'NO_FILE'
  | 'AI_ERROR'
  | 'RATE_LIMIT'
  | 'AUTH_REQUIRED'
  | 'EMAIL_UNVERIFIED'
  | 'AUTH_UNAVAILABLE'
  | 'NOT_CONFIGURED'
  | 'TOO_SHORT'
  /** Uploaded resume slot failed positive resume / anti-tracker classification. */
  | 'WRONG_DOCUMENT_TYPE'
  /** Optional JD slot failed job-description classification. */
  | 'WRONG_JD_TYPE';

export interface AtsState {
  result?: AtsResultV2;
  error?: string;
  code?: AtsErrorCode;
}

export const initialState: AtsState = {};

export const EMPTY_EXTRACTED: ExtractedResumeData = {
  name: null,
  email: null,
  phone: null,
  linkedin: null,
  location: null,
  experience: [],
  education: [],
  skills: [],
};
