import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { completeInterviewChat } from '@/lib/ai/interview-completion';

const LLM_TIMEOUT_MS = 12_000;

const autoStructureSchema = z.object({
  interviewId: z.string().uuid(),
  turnIndex: z.number(),
  rawTranscript: z.string(),
  displayQuestion: z.string(),
  targetRole: z.string(),
  scriptType: z.enum(['SCRIPT_H', 'SCRIPT_T', 'SCRIPT_M']),
  questionType: z.enum(['technical', 'behavioral']).optional(),
});

const AUTO_STRUCTURE_SYSTEM = `You are an expert interview coach helping candidates present their answers more clearly and professionally.
Preserve the candidate's original facts, experiences, and claims exactly — do not add, invent, or embellish any details.
The structured_points should flow naturally as complete sentences that a candidate would naturally say in an interview, not bullet fragments.
For missing_elements, only list things that are genuinely absent and would realistically improve the answer — maximum 2 items.
For technical_terms, only include terms the candidate actually used that a non-technical interviewer might not know — skip common words.
Output ONLY valid JSON. Nothing else.`;

const AUTO_STRUCTURE_USER = `Question asked: {displayQuestion}
Role context: {targetRole}
Raw transcript: {rawTranscript}

Transform this answer into 3-4 clear, complete sentences that a candidate would naturally say in an interview.

Output ONLY valid JSON:
{
  "structured_points": ["Full sentence 1.", "Full sentence 2.", "Full sentence 3."],
  "technical_terms": [
    { "term": "exact term", "definition": "one sentence", "pronunciation": "phonetic if non-obvious" }
  ],
  "missing_elements": ["Item that was genuinely absent (max 2)"]
}

Rules:
- structured_points: 3-4 complete sentences. Natural interview speech. No bullet fragments.
- Behavioral answers: STAR format woven into sentences (Situation, Action, Result).
- Technical answers: core concept, how it works, trade-off — as full sentences.
- technical_terms: only terms the candidate actually used that a non-technical interviewer might not know.
- pronunciation: only if non-obvious (nginx → engine-x, kubectl → kube-control).
- missing_elements: 0-2 items only. Only genuinely absent things that would improve the answer.
- If transcript is empty or fewer than 10 words: return { "structured_points": [], "technical_terms": [], "missing_elements": ["No answer detected — try again"] }
- Output ONLY JSON. Nothing else.`;

function isTimeoutError(err: unknown): boolean {
  if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
    return true;
  }
  return err instanceof Error && /timeout|aborted/i.test(err.message);
}

/** LLM output may arrive fenced or with stray prose when json_object falls back to plain. */
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

export async function POST(request: Request): Promise<NextResponse> {
  let interviewIdForLog = 'unknown';
  try {
    // Auth + ownership (same pattern as turn route Step 1)
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
        temperature: 0.3,
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

    const { error: updateError } = await serviceClient
      .from('script_turns')
      .update({ structured_answer: parsedOutput })
      .eq('interview_id', interviewId)
      .eq('turn_index', turnIndex);

    if (updateError) {
      console.error(`[interview/script/auto-structure] structured_answer update failed (interviewId=${interviewId}, turnIndex=${turnIndex}):`, updateError);
      return NextResponse.json({ error: 'Failed to save structured answer' }, { status: 500 });
    }

    return NextResponse.json({ structuredAnswer: parsedOutput }, { status: 200 });
  } catch (err) {
    console.error(`[interview/script/auto-structure] Unexpected error (interviewId=${interviewIdForLog}):`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
