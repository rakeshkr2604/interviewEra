import type { AtsIssueType, AtsResult } from './ats-types';

export const ATS_RESULT_STORAGE_KEY = 'ie-ats-result-v1';

type StoredPayload = {
  v: 1;
  savedAt: number;
  result: AtsResult;
};

const ISSUE_TYPES: AtsIssueType[] = ['success', 'warning', 'error'];

function isIssue(x: unknown): x is { type: AtsIssueType; text: string } {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.text === 'string' &&
    typeof o.type === 'string' &&
    (ISSUE_TYPES as readonly string[]).includes(o.type) &&
    String(o.text).trim().length > 0
  );
}

/** Client-side validation of payload from sessionStorage. */
export function parseStoredAtsResult(json: string): AtsResult | null {
  try {
    const data = JSON.parse(json) as StoredPayload;
    if (data?.v !== 1 || !data.result || typeof data.result !== 'object') return null;
    const r = data.result;
    if (typeof r.score !== 'number' || !Number.isFinite(r.score)) return null;
    if (!Array.isArray(r.issues) || r.issues.length === 0) return null;
    if (!r.issues.every(isIssue)) return null;
    return {
      score: Math.round(Math.min(100, Math.max(0, r.score))),
      issues: r.issues.map((i) => ({
        type: i.type,
        text: String(i.text).trim(),
      })),
    };
  } catch {
    return null;
  }
}

export function serializeAtsResult(result: AtsResult): string {
  const payload: StoredPayload = {
    v: 1,
    savedAt: Date.now(),
    result,
  };
  return JSON.stringify(payload);
}
