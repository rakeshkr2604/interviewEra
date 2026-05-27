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

  // 2. Strip markdown fences
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    const inner = fence[1].trim();
    try {
      JSON.parse(inner);
      return { text: inner, via: 'fence-strip' };
    } catch {
      /* fall through */
    }
  }

  // 3. Brace-match — handles preamble like "Sure! Here is the JSON: {...}"
  const brace = trimmed.match(/\{[\s\S]*\}/);
  if (brace) {
    try {
      JSON.parse(brace[0]);
      return { text: brace[0], via: 'brace-match' };
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
