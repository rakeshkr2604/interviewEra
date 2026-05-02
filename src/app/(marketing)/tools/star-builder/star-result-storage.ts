import type { StarResult, StarScores } from './actions';

export const STAR_RESULT_STORAGE_KEY = 'ie-star-result-v1';

type StoredPayload = {
  v: 1;
  savedAt: number;
  result: StarResult;
  notice?: string;
};

function isScores(x: unknown): x is StarScores {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  const keys: (keyof StarScores)[] = ['structure', 'specificity', 'impact'];
  return keys.every((k) => {
    const n = o[k];
    return typeof n === 'number' && Number.isFinite(n) && n >= 1 && n <= 10;
  });
}

function isStarResult(x: unknown): x is StarResult {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (typeof o.polishedAnswer !== 'string' || String(o.polishedAnswer).trim().length < 10) return false;
  if (!isScores(o.scores)) return false;
  if (!Array.isArray(o.suggestions) || o.suggestions.length === 0) return false;
  if (!o.suggestions.every((s) => typeof s === 'string' && String(s).trim().length > 0)) return false;
  return true;
}

export function parseStoredStarPayload(json: string): { result: StarResult; notice?: string } | null {
  try {
    const data = JSON.parse(json) as StoredPayload;
    if (data?.v !== 1 || !data.result || !isStarResult(data.result)) return null;
    const notice =
      typeof data.notice === 'string' && data.notice.trim() ? data.notice.trim() : undefined;
    return {
      result: {
        polishedAnswer: String(data.result.polishedAnswer).trim(),
        scores: {
          structure: Math.round(data.result.scores.structure),
          specificity: Math.round(data.result.scores.specificity),
          impact: Math.round(data.result.scores.impact),
        },
        suggestions: data.result.suggestions.map((s) => String(s).trim()),
      },
      notice,
    };
  } catch {
    return null;
  }
}

export function serializeStarPayload(result: StarResult, notice?: string): string {
  const payload: StoredPayload = {
    v: 1,
    savedAt: Date.now(),
    result,
    ...(notice?.trim() ? { notice: notice.trim() } : {}),
  };
  return JSON.stringify(payload);
}
