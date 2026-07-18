import type {
  ActionPriority,
  AtsActionItem,
  AtsJdMatch,
  AtsResultV2,
  ExtractedResumeData,
  Finding,
  FindingSeverity,
} from './ats-types';
import { EMPTY_EXTRACTED } from './ats-types';

/** v2 key — browsers with v1 (`ie-ats-result-v1`) payloads are ignored, not misparsed. */
export const ATS_RESULT_STORAGE_KEY = 'ie-ats-result-v2';

const STORAGE_VERSION = 2 as const;

type StoredPayload = {
  v: typeof STORAGE_VERSION;
  savedAt: number;
  result: AtsResultV2;
};

const SEVERITIES: FindingSeverity[] = ['info', 'warning', 'error'];
const PRIORITIES: ActionPriority[] = ['high', 'medium', 'low'];

function isFinding(x: unknown): x is Finding {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.message === 'string' &&
    typeof o.severity === 'string' &&
    (SEVERITIES as readonly string[]).includes(o.severity) &&
    o.message.trim().length > 0
  );
}

function isAction(x: unknown): x is AtsActionItem {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.text === 'string' &&
    typeof o.expectedImpact === 'string' &&
    typeof o.priority === 'string' &&
    (PRIORITIES as readonly string[]).includes(o.priority) &&
    o.text.trim().length > 0
  );
}

function isNullableString(x: unknown): x is string | null {
  return x === null || typeof x === 'string';
}

function parseExtracted(raw: unknown): ExtractedResumeData | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (
    !isNullableString(o.name) ||
    !isNullableString(o.email) ||
    !isNullableString(o.phone) ||
    !isNullableString(o.linkedin) ||
    !isNullableString(o.location)
  ) {
    return null;
  }
  if (!Array.isArray(o.experience) || !Array.isArray(o.education) || !Array.isArray(o.skills)) {
    return null;
  }
  return {
    name: o.name,
    email: o.email,
    phone: o.phone,
    linkedin: o.linkedin,
    location: o.location,
    experience: o.experience
      .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
      .map((e) => ({
        company: isNullableString(e.company) ? e.company : null,
        title: isNullableString(e.title) ? e.title : null,
        startDate: isNullableString(e.startDate) ? e.startDate : null,
        endDate: isNullableString(e.endDate) ? e.endDate : null,
      })),
    education: o.education
      .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
      .map((e) => ({
        institution: isNullableString(e.institution) ? e.institution : null,
        degree: isNullableString(e.degree) ? e.degree : null,
        year: isNullableString(e.year) ? e.year : null,
      })),
    skills: o.skills.filter((s): s is string => typeof s === 'string' && s.trim().length > 0),
  };
}

function clampScore(n: unknown): number | null {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.round(Math.min(100, Math.max(0, n)));
}

function stringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
}

function parseJdMatch(raw: unknown): AtsJdMatch | null {
  if (raw == null) return null;
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const score = clampScore(o.score);
  const requiredCoverage = clampScore(o.requiredCoverage);
  const preferredCoverage = clampScore(o.preferredCoverage);
  const jdRequirementCoverage = clampScore(o.jdRequirementCoverage);
  const resumeFocusAlignment = clampScore(o.resumeFocusAlignment);
  if (
    score == null ||
    requiredCoverage == null ||
    preferredCoverage == null ||
    jdRequirementCoverage == null ||
    resumeFocusAlignment == null
  ) {
    return null;
  }
  if (!Array.isArray(o.findings) || !o.findings.every(isFinding)) return null;
  return {
    score,
    findings: o.findings as Finding[],
    requiredCoverage,
    preferredCoverage,
    jdRequirementCoverage,
    resumeFocusAlignment,
    matchedRequired: stringArray(o.matchedRequired),
    missingRequired: stringArray(o.missingRequired),
    matchedPreferred: stringArray(o.matchedPreferred),
    missingPreferred: stringArray(o.missingPreferred),
    degraded: o.degraded === true ? true : undefined,
  };
}

/** Client-side validation of payload from sessionStorage. Rejects v1 and malformed v2. */
export function parseStoredAtsResult(json: string): AtsResultV2 | null {
  try {
    const data = JSON.parse(json) as { v?: unknown; result?: unknown };
    // Explicitly reject legacy v1 shape (had score + issues).
    if (data?.v !== STORAGE_VERSION) return null;
    if (!data.result || typeof data.result !== 'object') return null;
    const r = data.result as Record<string, unknown>;

    // Guard against accidentally reading a v1 object under a wrong version flag.
    if ('score' in r && 'issues' in r && !('parseability' in r)) return null;

    const parseability = r.parseability as Record<string, unknown> | undefined;
    const fieldExtraction = r.fieldExtraction as Record<string, unknown> | undefined;
    const structureQuality = r.structureQuality as Record<string, unknown> | undefined;

    const pScore = clampScore(parseability?.score);
    const fScore = clampScore(fieldExtraction?.score);
    const sScore = clampScore(structureQuality?.score);
    if (pScore == null || fScore == null || sScore == null) return null;

    if (!Array.isArray(parseability?.findings) || !parseability.findings.every(isFinding)) {
      return null;
    }
    if (!Array.isArray(structureQuality?.findings) || !structureQuality.findings.every(isFinding)) {
      return null;
    }
    if (!Array.isArray(r.actionItems) || !r.actionItems.every(isAction)) return null;

    const extracted = parseExtracted(fieldExtraction?.extracted) ?? { ...EMPTY_EXTRACTED };
    const missingFields = Array.isArray(fieldExtraction?.missingFields)
      ? fieldExtraction.missingFields.filter((x): x is string => typeof x === 'string')
      : [];

    // Accept null / missing jdMatch (no-JD runs) or a validated object.
    let jdMatch: AtsJdMatch | null = null;
    if ('jdMatch' in r && r.jdMatch != null) {
      jdMatch = parseJdMatch(r.jdMatch);
      if (!jdMatch) return null;
    }

    return {
      parseability: {
        score: pScore,
        findings: parseability.findings as Finding[],
      },
      fieldExtraction: {
        score: fScore,
        extracted,
        missingFields,
        extractionDegraded:
          fieldExtraction?.extractionDegraded === true ? true : undefined,
      },
      structureQuality: {
        score: sScore,
        findings: structureQuality.findings as Finding[],
      },
      actionItems: (r.actionItems as AtsActionItem[]).map((a) => ({
        priority: a.priority,
        text: String(a.text).trim(),
        expectedImpact: String(a.expectedImpact).trim(),
      })),
      jdMatch,
    };
  } catch {
    return null;
  }
}

export function serializeAtsResult(result: AtsResultV2): string {
  const payload: StoredPayload = {
    v: STORAGE_VERSION,
    savedAt: Date.now(),
    result: { ...result, jdMatch: result.jdMatch ?? null },
  };
  return JSON.stringify(payload);
}
