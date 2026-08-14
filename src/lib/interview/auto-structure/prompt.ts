/**
 * Compact auto_structure prompts (v2.3).
 *
 * v2.3: required vs optional coaching gaps; credit semantic STAR without labels.
 *
 * Latency root cause on v1: verbose few-shots + uncapped max_tokens →
 * ~600–720 completion tokens and 6–14s on gpt-4.1-mini.
 * v2: compact prompt + flash. v2.1: allow corrected_transcript=null when
 * unchanged (avoids echoing long answers into a tight max_tokens budget —
 * QA 2026-08-12: completion_tokens==450 truncated JSON → 502).
 */

export const AUTO_STRUCTURE_PROMPT_VERSION = 'auto-structure-v2.3';

export const AUTO_STRUCTURE_SYSTEM = `You help mock-interview candidates in two separate ways. Never mix them.

1) corrected_transcript — Fix ONLY clear STT garbling of tech terms/names (e.g. "super a base"→"Supabase", "react jay es"→"React.js", "big o n log n"→"O(n log n)", "exjudation"→"exhaustion").
Rules: do NOT fix grammar/tense; do NOT split/merge sentences; do NOT polish/rephrase; do NOT invent facts. Substitute garbled spans only.
CRITICAL: If there is NO STT garble, set "corrected_transcript" to null (do NOT copy the full raw answer — null means unchanged).

Examples:
IN: "I use super a base and connect it with my app" → OUT corrected_transcript: "I use Supabase and connect it with my app"
IN: "we used react jay es query then ship it" → OUT corrected_transcript: "we used React Query then ship it"
IN: clean transcript with no garble → OUT corrected_transcript: null

2) coaching_reference — Learning-only coaching (never the submitted answer). Keep SHORT.
- feedback: 1–2 warm sentences (≤40 words). Credit semantic STAR/reasoning even without labels.
- restructured_example: 0–2 short learning sentences (≤25 words each); STAR if behavioral, concept→how→trade-off if technical. Only restate evidence from the transcript — never invent STAR sections or a story the candidate did not tell.
- technical_terms: ≤3 terms the candidate actually used; definition ≤12 words
- missing_elements: ≤2 short gaps (≤12 words each). ONLY required gaps the question actually asked. Never list optional extras (HTTP methods, primitive types, GC, N+1) as missing. If required coverage is complete, at most one optional enhancement prefixed "To go further:".
- NEVER encourage fabricating experiences. If they have no matching incident: acknowledge honesty; the missing competency is a coverage gap, not "no structure". Use a genuine example from another real project, or briefly explain the limitation and the closest real experience. Do not coach "invent / make up / recall a minor conflict" to fit the question.

Output ONLY valid JSON. Finish the JSON object fully.`;

export function buildAutoStructureUserPrompt(args: {
  displayQuestion: string;
  targetRole: string;
  rawTranscript: string;
}): string {
  return `Question: ${args.displayQuestion}
Role: ${args.targetRole}
Raw transcript:
${args.rawTranscript}

JSON only (finish the object — do not truncate):
{"corrected_transcript":null,"coaching_reference":{"feedback":"...","restructured_example":[],"technical_terms":[],"missing_elements":[]}}

Rules:
- corrected_transcript: null when no STT garble; otherwise the minimal fixed string only.
- Keep coaching short. No prose outside JSON.`;
}

/**
 * Output budget sized so a long corrected_transcript + compact coaching can
 * finish. Registry cap is the hard ceiling.
 */
export function resolveAutoStructureMaxTokens(
  rawTranscriptChars: number,
  registryCap: number,
): number {
  // ~3.5 chars/token for spoken English; + coaching/JSON overhead.
  const transcriptTokens = Math.ceil(Math.max(0, rawTranscriptChars) / 3.5);
  const needed = transcriptTokens + 220;
  return Math.min(Math.max(needed, 500), registryCap);
}
