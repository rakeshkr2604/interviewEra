import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { completeInterviewChat } from '@/lib/ai/interview-completion';
import { getTokenBudget } from '@/lib/ai/token-budget';
import { getContextLimits, getOperationTimeoutMs } from '@/lib/ai/operation-registry';
import {
  ANSWER_SCORE_PROMPT_VERSION,
  subRubricForQuestionType,
  validateAnswerScoreOutput,
  type ValidatedAnswerScore,
} from '@/lib/interview/answer-score/rubric';
import {
  buildAnswerScoreSystemPrompt,
  buildAnswerScoreUserPrompt,
  buildAnswerScoreRepairPrompt,
} from '@/lib/interview/answer-score/prompt';
import { resolveQuestionType } from '@/lib/interview/answer-score/question-type';
import { normalizeComplexityNotationForScoring } from '@/lib/interview/normalize-complexity-notation';
import { clampText } from '@/lib/ai/context-hygiene';
import type { ScriptType } from '@/lib/ai/scripts/script-loader';
import { answerScoreRequestSchema } from '@/lib/interview/script-turn-request-schema';
import {
  enforceScriptLlmRateLimit,
  reserveScriptLlmCost,
} from '@/lib/interview/script-llm-guards';

const MIN_SCOREABLE_WORDS = 5;
/**
 * Deepgram final-segment confidence below this marks the transcript
 * low-reliability: the score still computes, but the row is flagged
 * score_suspect (low_stt_confidence) for the audit queue.
 */
const LOW_STT_CONFIDENCE_THRESHOLD = 0.6;

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

/**
 * score-v1 per-answer evaluation.
 *
 * Retry strategy (exactly one retry, strategy (b) — repair instruction):
 * when attempt 1 fails validation, we re-send the SAME system+user prompt
 * plus the model's invalid output and an explicit list of validation errors.
 * Rationale: temperature is 0.2, so re-sending an identical prompt mostly
 * reproduces the same failure; a targeted repair message fixes the exact
 * schema/range violation instead of re-rolling. If the repair attempt also
 * fails validation, we persist status='failed' for audit and return 422 —
 * the card shows "Score unavailable". No neutral/default score is ever
 * fabricated for display.
 */
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

    const rateLimited = await enforceScriptLlmRateLimit(user.id, 'answer_score');
    if (rateLimited) return rateLimited;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = answerScoreRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', fieldErrors: validation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      interviewId,
      turnIndex,
      transcript: rawTranscript,
      displayQuestion,
      targetRole,
      questionType,
      sttMinConfidence,
    } = validation.data;
    /** Scoring input only — raw_transcript on turns stays untouched; this closes the approve-without-tap gap. */
    const transcript = normalizeComplexityNotationForScoring(rawTranscript);
    interviewIdForLog = interviewId;

    const lowSttConfidence =
      sttMinConfidence !== undefined && sttMinConfidence < LOW_STT_CONFIDENCE_THRESHOLD;

    if (transcript.trim().split(/\s+/).filter(Boolean).length < MIN_SCOREABLE_WORDS) {
      return NextResponse.json({ error: 'answer_too_short' }, { status: 422 });
    }

    const serviceClient = createServiceClient();

    const { data: interview, error: ownershipError } = await serviceClient
      .from('interviews')
      .select('id, script_type')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .eq('engine', 'v2.1')
      .maybeSingle<{ id: string; script_type: ScriptType }>();

    if (ownershipError) {
      console.error(
        `[interview/script/answer-score] ownership query failed (interviewId=${interviewId}):`,
        ownershipError,
      );
      return NextResponse.json({ error: 'Failed to load interview' }, { status: 500 });
    }
    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // Idempotency: a concurrent/duplicate call for the SAME transcript returns
    // the already-persisted score instead of double-billing an LLM call.
    // If the candidate edited (or accepted STT fixes) before Approve, the
    // review flow re-posts with a different transcript — that must re-score
    // and replace the stale prefetch row, not return the raw-capture score.
    const { data: existingEval } = await serviceClient
      .from('answer_evaluations')
      .select('dimensions, overall, score_suspect, status, transcript')
      .eq('interview_id', interviewId)
      .eq('turn_index', turnIndex)
      .maybeSingle();

    if (existingEval) {
      const sameTranscript =
        (existingEval.transcript ?? '').trim() === transcript.trim();
      if (sameTranscript) {
        if (existingEval.status !== 'scored' || !existingEval.dimensions) {
          return NextResponse.json({ error: 'score_unavailable' }, { status: 422 });
        }
        return NextResponse.json(
          {
            score: {
              dimensions: existingEval.dimensions,
              overall: Number(existingEval.overall),
              score_suspect: existingEval.score_suspect,
            },
          },
          { status: 200 },
        );
      }
      const { error: deleteStaleError } = await serviceClient
        .from('answer_evaluations')
        .delete()
        .eq('interview_id', interviewId)
        .eq('turn_index', turnIndex);
      if (deleteStaleError) {
        console.error(
          `[interview/script/answer-score] failed to replace stale eval (interviewId=${interviewId}, turnIndex=${turnIndex}):`,
          deleteStaleError,
        );
        return NextResponse.json({ error: 'Failed to rescore answer' }, { status: 500 });
      }
    }

    // Question-type: prefer the tag persisted at generation time (client sends
    // it from the turn payload; also stored on script_turns). Legacy untagged
    // SCRIPT_M turns fall through to the capped classifier inside
    // resolveQuestionType — classifier timeout never blocks scoring beyond
    // 3.5s; on failure we proceed with technical/logical_flow, source logged.
    let taggedType = questionType ?? null;
    if (!taggedType) {
      const { data: turnRow } = await serviceClient
        .from('script_turns')
        .select('question_type')
        .eq('interview_id', interviewId)
        .eq('turn_index', turnIndex)
        .maybeSingle<{ question_type: 'technical' | 'behavioral' | null }>();
      taggedType = turnRow?.question_type ?? null;
    }

    const { questionType: resolvedType, typeSource } = await resolveQuestionType({
      taggedType,
      scriptType: interview.script_type,
      question: displayQuestion,
    });
    const expectedSubRubric = subRubricForQuestionType(resolvedType);

    const systemPrompt = buildAnswerScoreSystemPrompt(resolvedType);
    const inputBudget = getContextLimits('answer_score').maxInputChars;
    // Keep the full rubric; only clamp the candidate transcript to remaining budget.
    const transcriptBudget = Math.max(500, inputBudget - systemPrompt.length - 400);
    const clampedTranscript = clampText(transcript, transcriptBudget);
    const userPrompt = buildAnswerScoreUserPrompt({
      question: displayQuestion,
      questionType: resolvedType,
      targetRole,
      transcript: clampedTranscript,
    });
    const maxTokens = getTokenBudget('answer_score');
    const promptChars = systemPrompt.length + userPrompt.length;
    const llmTimeoutMs = getOperationTimeoutMs('answer_score');

    const { data: userProfile } = await serviceClient
      .from('users')
      .select('plan_tier')
      .eq('id', user.id)
      .maybeSingle();
    const planTier = (userProfile?.plan_tier as string | undefined) ?? 'free';
    const costReserve = await reserveScriptLlmCost(user.id, planTier, 'answer_score');
    if (!costReserve.ok) return costReserve.response;
    const costReservation = costReserve.reservation;
    /** True after any provider response (tokens may have been billed). */
    let costCommitted = false;

    try {
      const rawOutputs: string[] = [];
      let validated: ValidatedAnswerScore | null = null;
      let modelUsed = 'unknown';
      let lastErrors: string[] = [];

      // Attempt 1 + at most one repair retry (strategy (b) — see doc above).
      for (let attempt = 0; attempt < 2 && !validated; attempt++) {
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ];
        if (attempt === 1) {
          messages.push(
            { role: 'assistant', content: rawOutputs[0] ?? '' },
            { role: 'user', content: buildAnswerScoreRepairPrompt(lastErrors, expectedSubRubric) },
          );
        }

        let content: string;
        const attemptStarted = Date.now();
        try {
          const completion = await completeInterviewChat({
            messages,
            temperature: 0.2,
            operation: 'answer_score',
            jsonMode: true,
            maxTokens,
            signal: AbortSignal.timeout(llmTimeoutMs),
            interviewId,
            userId: user.id,
          });
          content = completion.content;
          modelUsed = completion.model;
          costCommitted = true;
          console.info(
            JSON.stringify({
              event: 'answer_score_llm_ok',
              interviewId,
              turnIndex,
              attempt: attempt + 1,
              model: modelUsed,
              prompt_chars: promptChars,
              max_tokens: maxTokens,
              prompt_tokens: completion.usage?.prompt_tokens ?? null,
              completion_tokens: completion.usage?.completion_tokens ?? null,
              latency_ms: Date.now() - attemptStarted,
              timeout_ms: llmTimeoutMs,
            }),
          );
        } catch (llmError) {
          console.error(
            JSON.stringify({
              event: 'answer_score_llm_failed',
              interviewId,
              turnIndex,
              attempt: attempt + 1,
              prompt_chars: promptChars,
              max_tokens: maxTokens,
              latency_ms: Date.now() - attemptStarted,
              timeout_ms: llmTimeoutMs,
              timeout: isTimeoutError(llmError),
            }),
          );
          if (isTimeoutError(llmError)) {
            console.error(
              `[interview/script/answer-score] LLM timeout (interviewId=${interviewId}, turnIndex=${turnIndex}, attempt=${attempt + 1}):`,
              llmError,
            );
            return NextResponse.json({ error: 'llm_timeout' }, { status: 504 });
          }
          console.error(
            `[interview/script/answer-score] LLM error (interviewId=${interviewId}, turnIndex=${turnIndex}, attempt=${attempt + 1}):`,
            llmError,
          );
          return NextResponse.json({ error: 'llm_error' }, { status: 502 });
        }

        rawOutputs.push(content);

        let parsed: unknown;
        try {
          parsed = parseLlmJson(content);
        } catch {
          lastErrors = ['(root): output was not parseable JSON'];
          continue;
        }

        const result = validateAnswerScoreOutput(parsed, expectedSubRubric, { lowSttConfidence });
        const returnedSubRubric =
          parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>).sub_rubric
            : undefined;
        console.info(
          JSON.stringify({
            event: 'answer_score_validation',
            interviewId,
            turnIndex,
            attempt: attempt + 1,
            question_type: resolvedType,
            authoritative_sub_rubric: expectedSubRubric,
            returned_sub_rubric: returnedSubRubric ?? null,
            validation_ok: result.ok,
            latency_ms: Date.now() - attemptStarted,
          }),
        );
        if (result.ok) {
          validated = result.value;
        } else {
          lastErrors = result.errors;
          console.warn(
            `[interview/script/answer-score] validation failed (interviewId=${interviewId}, turnIndex=${turnIndex}, attempt=${attempt + 1}): ${result.errors.join('; ')}`,
          );
        }
      }

      // Audit row — persisted for BOTH outcomes (scored and failed) so a
      // disputed or missing score is always reconstructable.
      const auditRow = {
        interview_id: interviewId,
        turn_index: turnIndex,
        user_id: user.id,
        question: displayQuestion,
        transcript,
        question_type: resolvedType,
        type_source: typeSource,
        sub_rubric: expectedSubRubric,
        prompt_version: ANSWER_SCORE_PROMPT_VERSION,
        model: modelUsed,
        raw_model_output: rawOutputs.join('\n---RETRY---\n'),
        stt_min_confidence: sttMinConfidence ?? null,
        dimensions: validated ? validated.dimensions : null,
        overall: validated ? validated.overall : null,
        status: validated ? 'scored' : 'failed',
        score_suspect: validated ? validated.score_suspect : false,
        suspect_reasons: validated ? validated.suspect_reasons : lastErrors.slice(0, 5),
      };

      const { error: insertError } = await serviceClient.from('answer_evaluations').insert(auditRow);
      if (insertError) {
        // Duplicate (concurrent call won the race) — degrade to a log, the
        // response below still carries the freshly-computed score.
        const isDuplicate =
          insertError.code === '23505' || /duplicate key|unique constraint/i.test(insertError.message ?? '');
        if (!isDuplicate) {
          console.error(
            `[interview/script/answer-score] audit insert failed (interviewId=${interviewId}, turnIndex=${turnIndex}):`,
            insertError,
          );
        }
      }

      if (!validated) {
        console.error(
          `[interview/script/answer-score] both attempts failed validation (interviewId=${interviewId}, turnIndex=${turnIndex}): ${lastErrors.join('; ')}`,
        );
        return NextResponse.json({ error: 'score_unavailable' }, { status: 422 });
      }

      if (validated.score_suspect) {
        console.warn(
          `[interview/script/answer-score] score flagged suspect (interviewId=${interviewId}, turnIndex=${turnIndex}): ${validated.suspect_reasons.join(', ')}`,
        );
      }

      return NextResponse.json(
        {
          score: {
            dimensions: validated.dimensions,
            overall: validated.overall,
            one_line_summary: validated.one_line_summary,
            score_suspect: validated.score_suspect,
          },
        },
        { status: 200 },
      );
    } finally {
      if (!costCommitted) {
        await costReservation.release();
      }
    }
  } catch (err) {
    console.error(
      `[interview/script/answer-score] Unexpected error (interviewId=${interviewIdForLog}):`,
      err,
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
