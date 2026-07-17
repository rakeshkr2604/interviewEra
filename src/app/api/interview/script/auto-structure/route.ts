import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { completeInterviewChat } from '@/lib/ai/interview-completion';
import { guardCorrectedTranscript } from '@/lib/interview/corrected-transcript-guard';

const LLM_TIMEOUT_MS = 22_000;

const autoStructureSchema = z.object({
  interviewId: z.string().uuid(),
  turnIndex: z.number(),
  rawTranscript: z.string(),
  displayQuestion: z.string(),
  targetRole: z.string(),
  scriptType: z.enum(['SCRIPT_H', 'SCRIPT_T', 'SCRIPT_M']),
  questionType: z.enum(['technical', 'behavioral']).optional(),
});

/**
 * Single LLM call returns BOTH:
 *  - corrected_transcript: STT cleanup only (submittable)
 *  - coaching_reference: read-only coaching (never submittable as the answer)
 * Kept as one op (`auto_structure`) to avoid double latency; fields are strictly separated in the prompt.
 * A deterministic word-diff guardrail post-processes corrected_transcript before response.
 */
const AUTO_STRUCTURE_SYSTEM = `You help mock-interview candidates in two separate ways. Never mix them.

1) corrected_transcript — Fix ONLY clear speech-to-text garbling of technical terms / names (e.g. "super a base" → "Supabase", "react jay es" → "React.js", "next jay es" → "Next.js").
Hard rules for corrected_transcript (violations are failures):
- Do NOT correct grammar, verb tense, or subject-verb agreement. If the candidate said "connect" keep "connect" (not "connected"). If they said "store" keep "store" (not "stored").
- Do NOT split or merge sentences. Preserve the candidate's original sentence boundaries and pause words (then/and/so) exactly as spoken.
- Do NOT add, remove, or "improve" punctuation for correctness. Minimal punctuation only inside a fixed tech term (e.g. "Next.js"). Do NOT capitalize the first word of a sentence merely for correctness if the raw started lowercase.
- Do NOT rephrase for polish, do NOT add STAR structure, do NOT invent facts, do NOT add or remove content words.
- Only substitute the garbled span with the inferred proper term; leave every other word character-for-character the same aside from that substitution.

Few-shot examples for corrected_transcript (input → output):
Example A — keep informal tense, fix only the garble:
  IN:  "I use super a base and connect it with my app"
  OUT: "I use Supabase and connect it with my app"
Example B — keep dropped grammar, fix only the garble:
  IN:  "then I store session in redis and use next jay es"
  OUT: "then I store session in redis and use Next.js"
Example C — multi-word garble only; no sentence split:
  IN:  "we used react jay es query for caching then ship it"
  OUT: "we used React Query for caching then ship it"

2) coaching_reference — Separate coaching only. May restructure into clearer interview form for LEARNING (STAR when behavioral; concept → how → trade-off when technical). feedback is a warm 2–3 sentence coach reaction. missing_elements max 2. technical_terms only for terms the candidate actually used. Put all rewriting / stronger phrasing HERE — never in corrected_transcript.

Output ONLY valid JSON. Nothing else.`;

const AUTO_STRUCTURE_USER = `Question asked: {displayQuestion}
Role context: {targetRole}
Raw transcript: {rawTranscript}

Output ONLY valid JSON:
{
  "corrected_transcript": "Same answer with STT garbling fixed only — grammar/tense/sentence boundaries unchanged.",
  "coaching_reference": {
    "feedback": "2-3 sentence coach reaction.",
    "restructured_example": ["Optional clearer sentences for learning — NOT the candidate's submitted answer."],
    "technical_terms": [
      { "term": "exact term from transcript", "definition": "one sentence", "pronunciation": "phonetic if non-obvious" }
    ],
    "missing_elements": ["Genuinely absent improvement (max 2)"]
  }
}

Rules:
- corrected_transcript: STT cleanup ONLY. Same grammar, tense, and sentence boundaries as raw. Empty/near-empty input (<10 words) → copy raw or empty string.
- coaching_reference.restructured_example: 0-4 learning sentences; may restructure. Never treat as what the candidate said.
- coaching_reference.feedback: conversational, no invented facts.
- technical_terms: only terms present in the raw/corrected transcript.
- missing_elements: 0-2 items.
- Output ONLY JSON.`;

function isTimeoutError(err: unknown): boolean {
  if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
    return true;
  }
  return err instanceof Error && /timeout|aborted/i.test(err.message);
}

function parseLlmJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(content.slice(start, end + 1));
    }
    throw new Error('LLM response contained no JSON object');
  }
}

type CoachingReference = {
  feedback: string;
  restructured_example: string[];
  technical_terms: Array<{ term: string; definition: string; pronunciation?: string }>;
  missing_elements: string[];
};

type NormalizedAutoStructure = {
  corrected_transcript: string;
  coaching_reference: CoachingReference;
};

/** Normalize new shape; also accept legacy { structured_points, feedback, ... } from older model replies. */
function normalizeAutoStructureOutput(parsed: unknown, rawTranscript: string): NormalizedAutoStructure {
  const fallbackFeedback =
    'Solid answer. Keep practicing the same clarity on the next question.';

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      corrected_transcript: rawTranscript,
      coaching_reference: {
        feedback: fallbackFeedback,
        restructured_example: [],
        technical_terms: [],
        missing_elements: [],
      },
    };
  }

  const row = parsed as Record<string, unknown>;

  // New shape
  if (typeof row.corrected_transcript === 'string' || row.coaching_reference) {
    const coachingRaw =
      row.coaching_reference && typeof row.coaching_reference === 'object' && !Array.isArray(row.coaching_reference)
        ? (row.coaching_reference as Record<string, unknown>)
        : {};

    const restructured = Array.isArray(coachingRaw.restructured_example)
      ? coachingRaw.restructured_example.filter((s): s is string => typeof s === 'string')
      : Array.isArray(coachingRaw.structured_points)
        ? coachingRaw.structured_points.filter((s): s is string => typeof s === 'string')
        : [];

    const technical_terms = Array.isArray(coachingRaw.technical_terms)
      ? coachingRaw.technical_terms.filter(
          (t): t is { term: string; definition: string; pronunciation?: string } =>
            !!t &&
            typeof t === 'object' &&
            typeof (t as { term?: unknown }).term === 'string' &&
            typeof (t as { definition?: unknown }).definition === 'string',
        )
      : [];

    const missing_elements = Array.isArray(coachingRaw.missing_elements)
      ? coachingRaw.missing_elements.filter((m): m is string => typeof m === 'string' && m.trim().length > 0).slice(0, 2)
      : [];

    const feedback =
      typeof coachingRaw.feedback === 'string' && coachingRaw.feedback.trim()
        ? coachingRaw.feedback.trim()
        : missing_elements.length > 0
          ? `Good start — next time, tighten this: ${missing_elements[0]}`
          : fallbackFeedback;

    const corrected =
      typeof row.corrected_transcript === 'string' && row.corrected_transcript.trim()
        ? row.corrected_transcript.trim()
        : rawTranscript;

    return {
      corrected_transcript: corrected,
      coaching_reference: {
        feedback,
        restructured_example: restructured,
        technical_terms,
        missing_elements,
      },
    };
  }

  // Legacy shape → map structured_points into coaching only; leave corrected ≈ raw
  const structured_points = Array.isArray(row.structured_points)
    ? row.structured_points.filter((s): s is string => typeof s === 'string')
    : [];
  const technical_terms = Array.isArray(row.technical_terms)
    ? row.technical_terms.filter(
        (t): t is { term: string; definition: string; pronunciation?: string } =>
          !!t &&
          typeof t === 'object' &&
          typeof (t as { term?: unknown }).term === 'string' &&
          typeof (t as { definition?: unknown }).definition === 'string',
      )
    : [];
  const missing_elements = Array.isArray(row.missing_elements)
    ? row.missing_elements.filter((m): m is string => typeof m === 'string' && m.trim().length > 0).slice(0, 2)
    : [];
  const feedback =
    typeof row.feedback === 'string' && row.feedback.trim()
      ? row.feedback.trim()
      : fallbackFeedback;

  return {
    corrected_transcript: rawTranscript,
    coaching_reference: {
      feedback,
      restructured_example: structured_points,
      technical_terms,
      missing_elements,
    },
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  let interviewIdForLog = 'unknown';
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = autoStructureSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          fieldErrors: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { interviewId, turnIndex, rawTranscript, displayQuestion, targetRole } = validation.data;
    interviewIdForLog = interviewId;

    const serviceClient = createServiceClient();

    const { data: ownership, error: ownershipError } = await serviceClient
      .from('interviews')
      .select('id')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .eq('engine', 'v2.1')
      .maybeSingle();

    if (ownershipError) {
      console.error(`[interview/script/auto-structure] ownership query failed (interviewId=${interviewId}):`, ownershipError);
      return NextResponse.json({ error: 'Failed to load interview' }, { status: 500 });
    }
    if (!ownership) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const filledUser = AUTO_STRUCTURE_USER
      .replace('{rawTranscript}', rawTranscript)
      .replace('{displayQuestion}', displayQuestion)
      .replace('{targetRole}', targetRole);

    let llmContent: string;
    try {
      const completion = await completeInterviewChat({
        messages: [
          { role: 'system', content: AUTO_STRUCTURE_SYSTEM },
          { role: 'user', content: filledUser },
        ],
        temperature: 0.2,
        operation: 'auto_structure',
        jsonMode: true,
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      });
      llmContent = completion.content;
    } catch (llmError) {
      if (isTimeoutError(llmError)) {
        console.error(`[interview/script/auto-structure] LLM timeout (interviewId=${interviewId}):`, llmError);
        return NextResponse.json({ error: 'llm_timeout' }, { status: 504 });
      }
      console.error(`[interview/script/auto-structure] LLM error (interviewId=${interviewId}):`, llmError);
      return NextResponse.json(
        { error: 'llm_error', message: 'Answer structuring is temporarily unavailable.' },
        { status: 502 },
      );
    }

    let parsedOutput: unknown;
    try {
      parsedOutput = parseLlmJson(llmContent);
    } catch {
      console.error(
        `[interview/script/auto-structure] LLM output not parseable as JSON (interviewId=${interviewId}). Raw output:`,
        llmContent,
      );
      return NextResponse.json(
        { error: 'llm_error', message: 'Answer structuring returned an invalid response.' },
        { status: 502 },
      );
    }

    const normalized = normalizeAutoStructureOutput(parsedOutput, rawTranscript);

    // Deterministic guardrail: never show / persist over-corrected STT cleanup.
    const guard = guardCorrectedTranscript(rawTranscript, normalized.corrected_transcript);
    if (!guard.accepted) {
      console.warn(
        `[interview/script/auto-structure] corrected_transcript rejected (interviewId=${interviewId}, turnIndex=${turnIndex}, reason=${guard.reason}, diffRatio=${guard.diffRatio.toFixed(3)}, disallowed=${guard.disallowedChangedWords}/${guard.totalWords})`,
        {
          raw: rawTranscript,
          attempted: normalized.corrected_transcript,
          diffRatio: guard.diffRatio,
          reason: guard.reason,
        },
      );
      normalized.corrected_transcript = guard.transcript; // raw fallback
    }

    const { error: updateError } = await serviceClient
      .from('script_turns')
      .update({ structured_answer: normalized })
      .eq('interview_id', interviewId)
      .eq('turn_index', turnIndex);

    if (updateError) {
      console.error(`[interview/script/auto-structure] structured_answer update failed (interviewId=${interviewId}, turnIndex=${turnIndex}):`, updateError);
      return NextResponse.json({ error: 'Failed to save structured answer' }, { status: 500 });
    }

    return NextResponse.json({ structuredAnswer: normalized }, { status: 200 });
  } catch (err) {
    console.error(`[interview/script/auto-structure] Unexpected error (interviewId=${interviewIdForLog}):`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
