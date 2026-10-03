import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { completeInterviewChat } from '@/lib/ai/interview-completion';
import { getTokenBudget } from '@/lib/ai/token-budget';
import { getContextLimits, getOperationTimeoutMs } from '@/lib/ai/operation-registry';
import { clampText } from '@/lib/ai/context-hygiene';
import { guardCorrectedTranscript } from '@/lib/interview/corrected-transcript-guard';
import {
  AUTO_STRUCTURE_PROMPT_VERSION,
  AUTO_STRUCTURE_SYSTEM,
  buildAutoStructureUserPrompt,
  resolveAutoStructureMaxTokens,
} from '@/lib/interview/auto-structure/prompt';
import { normalizeAutoStructureOutput } from '@/lib/interview/auto-structure/normalize';
import type { NormalizedAutoStructure } from '@/lib/interview/auto-structure/normalize';
import { questionTypeFromScript } from '@/lib/interview/answer-score/question-type';

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

    const {
      interviewId,
      turnIndex,
      rawTranscript,
      displayQuestion,
      targetRole,
      scriptType,
      questionType,
    } = validation.data;
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

    const inputBudget = getContextLimits('auto_structure').maxInputChars;
    const systemLen = AUTO_STRUCTURE_SYSTEM.length;
    const questionBudget = Math.min(400, Math.max(80, Math.floor(inputBudget * 0.15)));
    const roleBudget = 80;
    const reserved = systemLen + questionBudget + roleBudget + 280;
    const transcriptBudget = Math.max(400, inputBudget - reserved);
    const clampedQuestion = clampText(displayQuestion, questionBudget);
    const clampedRole = clampText(targetRole || 'Not specified', roleBudget);
    const clampedTranscript = clampText(rawTranscript, transcriptBudget);

    const filledUser = buildAutoStructureUserPrompt({
      displayQuestion: clampedQuestion,
      targetRole: clampedRole,
      rawTranscript: clampedTranscript,
      questionType: questionType ?? questionTypeFromScript(scriptType) ?? 'behavioral',
    });
    const registryCap = getTokenBudget('auto_structure');
    const maxTokens = resolveAutoStructureMaxTokens(clampedTranscript.length, registryCap);
    const llmTimeoutMs = getOperationTimeoutMs('auto_structure');
    const promptChars = AUTO_STRUCTURE_SYSTEM.length + filledUser.length;

    let llmContent: string;
    let modelUsed = 'unknown';
    let completionTokens: number | null = null;
    const attemptStarted = Date.now();
    try {
      const completion = await completeInterviewChat({
        messages: [
          { role: 'system', content: AUTO_STRUCTURE_SYSTEM },
          { role: 'user', content: filledUser },
        ],
        temperature: 0.2,
        operation: 'auto_structure',
        jsonMode: true,
        maxTokens,
        signal: AbortSignal.timeout(llmTimeoutMs),
        interviewId,
        userId: user.id,
      });
      llmContent = completion.content;
      modelUsed = completion.model;
      completionTokens = completion.usage?.completion_tokens ?? null;
      const hitTokenCeiling =
        completionTokens != null && completionTokens >= maxTokens;
      console.info(
        JSON.stringify({
          event: 'auto_structure_llm_ok',
          operation: 'auto_structure',
          interviewId,
          turnIndex,
          attempt: 1,
          model: modelUsed,
          prompt_version: AUTO_STRUCTURE_PROMPT_VERSION,
          prompt_chars: promptChars,
          input_answer_chars: rawTranscript.length,
          max_tokens: maxTokens,
          prompt_tokens: completion.usage?.prompt_tokens ?? null,
          completion_tokens: completionTokens,
          hit_token_ceiling: hitTokenCeiling,
          latency_ms: Date.now() - attemptStarted,
          success: true,
        }),
      );
    } catch (llmError) {
      const timedOut = isTimeoutError(llmError);
      console.error(
        JSON.stringify({
          event: 'auto_structure_failed',
          operation: 'auto_structure',
          reason: timedOut ? 'llm_timeout' : 'llm_error',
          interviewId,
          turnIndex,
          attempt: 1,
          model: modelUsed,
          prompt_version: AUTO_STRUCTURE_PROMPT_VERSION,
          prompt_chars: promptChars,
          input_answer_chars: rawTranscript.length,
          max_tokens: maxTokens,
          latency_ms: Date.now() - attemptStarted,
          success: false,
        }),
        llmError,
      );
      if (timedOut) {
        return NextResponse.json({ error: 'llm_timeout' }, { status: 504 });
      }
      return NextResponse.json(
        { error: 'llm_error', message: 'Answer structuring is temporarily unavailable.' },
        { status: 502 },
      );
    }

    let parsedOutput: unknown;
    try {
      parsedOutput = parseLlmJson(llmContent);
    } catch {
      // Degrade-don't-fail: truncated JSON (common when max_tokens is tight)
      // must not blank the coaching panel — return raw + fallback coaching.
      const hitTokenCeiling =
        completionTokens != null && completionTokens >= maxTokens;
      console.warn(
        JSON.stringify({
          event: 'auto_structure_degraded',
          reason: 'invalid_json',
          interviewId,
          turnIndex,
          model: modelUsed,
          prompt_version: AUTO_STRUCTURE_PROMPT_VERSION,
          max_tokens: maxTokens,
          completion_tokens: completionTokens,
          hit_token_ceiling: hitTokenCeiling,
          content_chars: llmContent.length,
        }),
      );
      parsedOutput = null;
    }

    const normalized: NormalizedAutoStructure = normalizeAutoStructureOutput(
      parsedOutput,
      rawTranscript,
    );

    // Deterministic guardrail: never show / persist over-corrected STT cleanup.
    const guard = guardCorrectedTranscript(rawTranscript, normalized.corrected_transcript);
    if (!guard.accepted) {
      console.warn(
        `[interview/script/auto-structure] corrected_transcript rejected (interviewId=${interviewId}, turnIndex=${turnIndex}, reason=${guard.reason}, diffRatio=${guard.diffRatio.toFixed(3)}, disallowed=${guard.disallowedChangedWords}/${guard.totalWords})`,
        {
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
      console.error(
        JSON.stringify({
          event: 'auto_structure_failed',
          reason: 'db_update',
          interviewId,
          turnIndex,
        }),
        updateError,
      );
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
