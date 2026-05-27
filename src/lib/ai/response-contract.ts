/**
 * Response contract enforcement.
 *
 * Every JSON-returning AI operation re-implemented its own extractJSON +
 * parse + validate logic, which drifted over time (different error
 * messages, different fence handling, inconsistent telemetry). This module
 * centralises the parsing pipeline so all callers share one battle-tested
 * implementation.
 *
 * Pipeline:
 *   1. Strip surrounding markdown fences (```json ... ```).
 *   2. Direct JSON.parse — fast path when the model behaved.
 *   3. Brace-match fallback — extracts the first {...} block when the model
 *      adds a preamble or trailing text.
 *   4. Optional Zod schema validation when caller passes a schema.
 *
 * Failures return a discriminated result rather than throwing — callers
 * decide whether to retry, fall back, or surface an error.
 */

import type { z, ZodSchema } from 'zod';

// ── Result types ──────────────────────────────────────────────────────────────

export type ParseResult<T> =
  | { ok: true;  value: T; repairedVia: 'direct' | 'fence-strip' | 'brace-match' }
  | { ok: false; error: string; rawPreview: string };

// ── Extraction ────────────────────────────────────────────────────────────────

/**
 * Walk the string and return the first `{...}` or `[...]` substring that
 * `JSON.parse` accepts. Respects JSON string escaping so nested `{` in strings
 * does not break balancing. Fixes greedy-regex false positives when the model
 * emits trailing commentary after a valid object.
 */
export function findFirstBalancedJsonSlice(input: string): string | null {
  const s = input;
  for (let start = 0; start < s.length; start++) {
    const open = s[start];
    if (open !== '{' && open !== '[') continue;
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (inString) {
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === '\\') {
          escape = true;
          continue;
        }
        if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === open) depth += 1;
      else if (ch === close) {
        depth -= 1;
        if (depth === 0) {
          const slice = s.slice(start, i + 1);
          try {
            JSON.parse(slice);
            return slice;
          } catch {
            break;
          }
        }
      }
    }
  }
  return null;
}

/**
 * Strip markdown fences and locate the JSON block.
 * Returns the original input when it already parses cleanly.
 */
export function extractJsonBlock(content: string): {
  text: string;
  via: 'direct' | 'fence-strip' | 'brace-match';
} {
  const trimmed = (content ?? '').trim();

  // 1. Direct parse — most common path on well-behaved models
  try {
    JSON.parse(trimmed);
    return { text: trimmed, via: 'direct' };
  } catch {
    /* fall through */
  }

  // 2. Strip markdown fences (non-greedy inner; may be multiple — try each)
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(trimmed)) !== null) {
    const inner = m[1].trim();
    const balanced = findFirstBalancedJsonSlice(inner) ?? inner;
    try {
      JSON.parse(balanced);
      return { text: balanced, via: 'fence-strip' };
    } catch {
      /* next fence */
    }
  }

  // 3. Balanced slice on full text — preamble / trailing prose
  const balancedFull = findFirstBalancedJsonSlice(trimmed);
  if (balancedFull) {
    try {
      JSON.parse(balancedFull);
      return { text: balancedFull, via: 'brace-match' };
    } catch {
      /* fall through */
    }
  }

  // Return trimmed so the caller can include it in error context
  return { text: trimmed, via: 'direct' };
}

// ── Parsing ───────────────────────────────────────────────────────────────────

/**
 * Parse model output into a plain object. No schema validation — caller is
 * responsible for shape checking when no Zod schema is supplied.
 *
 * Use the schema-validated overload (parseJson(content, schema)) for any
 * structured operation that has a Zod definition.
 */
export function parseJsonObject(content: string): ParseResult<unknown> {
  const { text, via } = extractJsonBlock(content);
  try {
    const value = JSON.parse(text) as unknown;
    return { ok: true, value, repairedVia: via };
  } catch (err) {
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'json_parse_failed',
      rawPreview: text.slice(0, 500),
    };
  }
}

/**
 * Parse + validate model output against a Zod schema.
 * On schema mismatch returns ok:false with the formatted Zod error.
 */
export function parseJson<T extends ZodSchema>(
  content: string,
  schema: T,
): ParseResult<z.infer<T>> {
  const parsed = parseJsonObject(content);
  if (!parsed.ok) return parsed;

  const result = schema.safeParse(parsed.value);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ');
    return {
      ok:    false,
      error: `schema_mismatch: ${issues}`,
      rawPreview: JSON.stringify(parsed.value).slice(0, 500),
    };
  }
  return { ok: true, value: result.data, repairedVia: parsed.repairedVia };
}
