/**
 * Compact auto_structure prompts (v2.6).
 *
 * v2.6: sample answer is a complete 10/10 spoken rewrite — same paragraph
 * count and similar length as the transcript (not STAR stubs).
 * v2.5: unlabeled STAR/flow paragraphs.
 * v2.4: 4 labeled STAR/flow lines.
 * v2.3: required vs optional coaching gaps; credit semantic STAR without labels.
 *
 * Latency root cause on v1: verbose few-shots + uncapped max_tokens →
 * ~600–720 completion tokens and 6–14s on gpt-4.1-mini.
 * v2: compact prompt + flash. v2.1: allow corrected_transcript=null when
 * unchanged (avoids echoing long answers into a tight max_tokens budget —
 * QA 2026-08-12: completion_tokens==450 truncated JSON → 502).
 */

export const AUTO_STRUCTURE_PROMPT_VERSION = 'auto-structure-v2.6';

export const AUTO_STRUCTURE_SYSTEM = `You help mock-interview candidates in two separate ways. Never mix them.

1) corrected_transcript — Fix ONLY clear STT garbling of tech terms/names (e.g. "super a base"→"Supabase", "react jay es"→"React.js", "big o n log n"→"O(n log n)", "exjudation"→"exhaustion").
Rules: do NOT fix grammar/tense; do NOT split/merge sentences; do NOT polish/rephrase; do NOT invent facts. Substitute garbled spans only.
CRITICAL: If there is NO STT garble, set "corrected_transcript" to null (do NOT copy the full raw answer — null means unchanged).

Examples:
IN: "I use super a base and connect it with my app" → OUT corrected_transcript: "I use Supabase and connect it with my app"
IN: "we used react jay es query then ship it" → OUT corrected_transcript: "we used React Query then ship it"
IN: clean transcript with no garble → OUT corrected_transcript: null

2) coaching_reference — Learning-only coaching (never the submitted answer).
- feedback: 1–2 warm sentences (≤40 words). Credit semantic STAR/reasoning even without labels.
- restructured_example: a complete first-person SAMPLE ANSWER the candidate could speak — same shape as the review transcript (full paragraphs, blank line between them). Match the transcript's paragraph count. Be at least as long (not stubs, not 1-line beats, no Situation:/Task: headings). Behavioral: spoken STAR as prose. Technical: spoken logical flow as prose. 10/10 quality on this question: every part addresses the ask; clear; complete arc; named work + what YOU did + outcome. Use ONLY their incident. Fix STT/grammar in the sample. Do not invent a different project, employer, or fake metrics — quantify only if they already gave a number; otherwise keep their qualitative result. No real incident → [].
- technical_terms: ≤3 terms the candidate actually used; definition ≤12 words
- missing_elements: ≤2 short gaps (≤12 words each). ONLY required gaps the question actually asked. Never list optional extras (HTTP methods, primitive types, GC, N+1) as missing. If required coverage is complete, at most one optional enhancement prefixed "To go further:".
- NEVER encourage fabricating experiences. If they have no matching incident: acknowledge honesty; the missing competency is a coverage gap, not "no structure". Use a genuine example from another real project, or briefly explain the limitation and the closest real experience. Do not coach "invent / make up / recall a minor conflict" to fit the question.

Output ONLY valid JSON. Finish the JSON object fully.`;

function transcriptStats(raw: string): { words: number; paragraphs: number } {
  const trimmed = raw.trim();
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const paragraphs = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).length || 1;
  return { words, paragraphs };
}

export function buildAutoStructureUserPrompt(args: {
  displayQuestion: string;
  targetRole: string;
  rawTranscript: string;
  questionType?: 'behavioral' | 'technical';
}): string {
  const questionType = args.questionType ?? 'behavioral';
  const isTechnical = questionType === 'technical';
  const { words, paragraphs } = transcriptStats(args.rawTranscript);
  const maxWords = Math.min(220, Math.max(words + 24, Math.round(words * 1.25)));
  const framework = isTechnical
    ? 'logical_flow (technical). Full spoken paragraphs: problem → approach → why → conclusion.'
    : 'STAR (behavioral). Full spoken paragraphs: context → owned task → what YOU did → result.';

  return `Question: ${args.displayQuestion}
Role: ${args.targetRole}
Question type: ${questionType}
Framework: ${framework}
Transcript length: ${words} words, ${paragraphs} paragraph(s). Sample answer: ${paragraphs} full paragraph(s), ${words}–${maxWords} words (same completeness as the review transcript — not shorter stubs).
Raw transcript:
${args.rawTranscript}

JSON only (finish the object — do not truncate):
{"corrected_transcript":null,"coaching_reference":{"feedback":"...","restructured_example":["full paragraph 1","full paragraph 2"],"technical_terms":[],"missing_elements":[]}}

Rules:
- corrected_transcript: null when no STT garble; otherwise the minimal fixed string only.
- restructured_example: complete spoken sample answer (one JSON string per paragraph). No headings. [] if they told no real incident.
- Keep feedback short. The sample answer itself must be complete. No prose outside JSON.`;
}

/**
 * Output budget sized so a long corrected_transcript + full sample answer
 * can finish. Registry cap is the hard ceiling.
 */
export function resolveAutoStructureMaxTokens(
  rawTranscriptChars: number,
  registryCap: number,
): number {
  // ~3.5 chars/token for spoken English; + coaching/JSON overhead for a full sample.
  const transcriptTokens = Math.ceil(Math.max(0, rawTranscriptChars) / 3.5);
  const needed = transcriptTokens + 520;
  return Math.min(Math.max(needed, 500), registryCap);
}
