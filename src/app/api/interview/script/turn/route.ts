import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getScript } from '@/lib/ai/scripts/script-loader';
import { buildRuntimeContext, experienceYearsToLevel } from '@/lib/ai/scripts/runtime-context';
import { validateTurnOutput, TurnValidationError } from '@/lib/ai/scripts/turn-validator';
import { completeInterviewChat } from '@/lib/ai/interview-completion';
import {
  buildScriptResumeSummary,
  clampJobDescriptionForQuestions,
} from '@/lib/interview/question-gen-input';
import { questionTypeFromScript } from '@/lib/interview/answer-score/question-type';
import type { ScriptType } from '@/lib/ai/scripts/script-loader';
import { loadResumeContextForInterview } from '@/lib/resume/interview-snapshot';

const SPECIAL_VALUES = ['[NONE]', '[SKIPPED]', '[TIMEOUT]'] as const;

const LLM_TIMEOUT_MS = 45_000;

const turnRequestSchema = z.object({
  interviewId: z.string().uuid(),
  lastAnswer: z.string(),
  currentPhase: z.enum(['warmup', 'self_intro', 'core', 'candidate_questions', 'closing']),
  questionNumber: z.number(),
  // 'structured' kept for legacy clients; new UI submits 'corrected' (STT cleanup only).
  submittedAs: z.enum(['raw', 'corrected', 'structured', 'auto_submit']).optional(),
  prevTurnIndex: z.number().optional(),
  /**
   * Original STT (or typed) transcript for the previous turn.
   * Written once into script_turns.raw_transcript and never overwritten when
   * the candidate later submits a corrected version as answer_text.
   */
  sttRawTranscript: z.string().optional(),
});

type InterviewRow = {
  interviewer_id: 'priya' | 'arjun';
  script_type: ScriptType;
  difficulty: string;
  role: string;
  question_count: number;
  session_context: {
    goal?: string;
    interviewMode?: string;
    experienceYears?: number;
    interviewerId?: string;
    jobDescription?: string;
  } | null;
  current_turn_index: number;
  self_intro_enabled: boolean;
  last_question_type: 'technical' | 'behavioral' | null;
  skips_used: number;
  max_skips: number;
  multilingual_detected: boolean;
  is_returning_user: boolean;
  resume_id: string;
};

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
    // STEP 1 — auth + ownership
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

    const validation = turnRequestSchema.safeParse(rawBody);
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
      lastAnswer,
      currentPhase,
      questionNumber,
      submittedAs,
      prevTurnIndex,
      sttRawTranscript,
    } =
      validation.data;
    interviewIdForLog = interviewId;

    const serviceClient = createServiceClient();

    const { data: ownership, error: ownershipError } = await serviceClient
      .from('interviews')
      .select('id, status, engine')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .eq('engine', 'v2.1')
      .maybeSingle();

    if (ownershipError) {
      console.error(`[interview/script/turn] ownership query failed (interviewId=${interviewId}):`, ownershipError);
      return NextResponse.json({ error: 'Failed to load interview' }, { status: 500 });
    }
    if (!ownership) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }
    if (ownership.status === 'completed' || ownership.status === 'abandoned') {
      return NextResponse.json({ error: 'Interview is no longer active' }, { status: 403 });
    }

    // STEP 2 — load interview state + resume + display name
    const { data: interview, error: interviewError } = await serviceClient
      .from('interviews')
      .select(
        'interviewer_id, script_type, difficulty, role, question_count, session_context, current_turn_index, self_intro_enabled, last_question_type, skips_used, max_skips, multilingual_detected, is_returning_user, resume_id',
      )
      .eq('id', interviewId)
      .single<InterviewRow>();

    if (interviewError || !interview) {
      console.error(`[interview/script/turn] interview load failed (interviewId=${interviewId}):`, interviewError);
      return NextResponse.json({ error: 'Failed to load interview' }, { status: 500 });
    }

    const [resumeCtx, { data: priorTurns }, { data: profile }] = await Promise.all([
      loadResumeContextForInterview(serviceClient, {
        interviewId,
        resumeId: interview.resume_id,
      }),
      // Fetch previously asked questions so the LLM can avoid repeating them.
      // Only core + self_intro question turns are relevant (warmup is conversational).
      serviceClient
        .from('script_turns')
        .select('llm_output, phase')
        .eq('interview_id', interviewId)
        .eq('is_question', true)
        .in('phase', ['core', 'self_intro'])
        .order('turn_index', { ascending: true }),
      serviceClient
        .from('users')
        .select('name')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    const resumeSummary = resumeCtx.parsed
      ? buildScriptResumeSummary(resumeCtx.parsed, interview.role)
      : 'Not available';

    const displayName =
      (profile?.name && String(profile.name).trim()) ||
      (user.email ? user.email.split('@')[0] : 'Candidate');

    // STEP 3 — multilingual detection (only actual non-Latin scripts, not em dashes/curly quotes/accented Latin)
    const NON_LATIN_PATTERN = /[ऀ-ॿ؀-ۿ一-鿿가-힯Ѐ-ӿ฀-๿]/;
    const isSpecialValue = (SPECIAL_VALUES as readonly string[]).includes(lastAnswer);
    let multilingualDetected = interview.multilingual_detected;
    const hasNonLatinScript = NON_LATIN_PATTERN.test(lastAnswer);
    if (hasNonLatinScript && !isSpecialValue) {
      multilingualDetected = true;
      const { error: mlError } = await serviceClient
        .from('interviews')
        .update({ multilingual_detected: true })
        .eq('id', interviewId);
      if (mlError) {
        console.error(`[interview/script/turn] multilingual flag update failed (interviewId=${interviewId}):`, mlError);
      }
    }

    // STEP 4 — system prompt = script + runtime context block
    const sessionContext = interview.session_context ?? {};
    const jdClamped = clampJobDescriptionForQuestions(sessionContext.jobDescription);
    const runtimeContext = buildRuntimeContext({
      candidate_name: displayName,
      target_role: interview.role,
      experience_level: experienceYearsToLevel(sessionContext.experienceYears ?? 0),
      interview_goal: sessionContext.goal ?? 'general_practice',
      company_name: 'Not specified',
      company_type: 'unknown',
      difficulty: interview.difficulty,
      resume_summary: resumeSummary,
      job_description: jdClamped ?? 'Not provided',
      question_pool: 'Not available',
      current_phase: currentPhase,
      question_number: questionNumber,
      total_questions: interview.question_count,
      skips_used: interview.skips_used,
      max_skips: interview.max_skips,
      last_answer: lastAnswer,
      multilingual_detected: multilingualDetected,
      is_returning_user: interview.is_returning_user,
      self_intro_enabled: interview.self_intro_enabled,
      current_turn_index: interview.current_turn_index + 1,
      selected_interviewer:
        interview.script_type === 'SCRIPT_M'
          ? interview.interviewer_id === 'priya'
            ? 'Priya'
            : 'Arjun'
          : undefined,
      last_question_type:
        interview.script_type === 'SCRIPT_M' ? interview.last_question_type : undefined,
    });

    const systemPrompt =
      getScript(interview.script_type) +
      '\n\n## RUNTIME CONTEXT\n\n```\n' +
      runtimeContext +
      '\n```';

    // STEP 5 — user message (prepend previously asked questions so the LLM avoids repeats)
    const askedQuestions: string[] = (priorTurns ?? [])
      .map((t) => {
        const o = t.llm_output as Record<string, unknown> | null;
        return (o?.display_question as string | null) || (o?.speech as string | null) || '';
      })
      .filter(Boolean);

    const alreadyAskedBlock =
      askedQuestions.length > 0
        ? `\n\nALREADY ASKED — Do NOT repeat these questions or ask closely similar ones:\n${askedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
        : '';

    const userMessage =
      lastAnswer === '[NONE]'
        ? `Begin the interview.${alreadyAskedBlock}`
        : `${lastAnswer}${alreadyAskedBlock}`;

    // STEP 6 — LLM call (unregistered op resolves to the cheap model: openai/gpt-4.1-mini)
    let llmContent: string;
    try {
      const completion = await completeInterviewChat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        operation: 'script_turn_generation',
        jsonMode: true,
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      });
      llmContent = completion.content;
    } catch (llmError) {
      if (isTimeoutError(llmError)) {
        console.error(`[interview/script/turn] LLM timeout (interviewId=${interviewId}):`, llmError);
        return NextResponse.json({ error: 'llm_timeout' }, { status: 504 });
      }
      console.error(`[interview/script/turn] LLM error (interviewId=${interviewId}):`, llmError);
      return NextResponse.json(
        { error: 'llm_error', message: 'The interviewer is temporarily unavailable. Please retry.' },
        { status: 502 },
      );
    }

    // STEP 7 — parse + validate turn output
    let validated;
    try {
      const parsed = parseLlmJson(llmContent);
      validated = validateTurnOutput(parsed, interview.script_type);
    } catch (parseError) {
      if (parseError instanceof TurnValidationError) {
        console.error(
          `[interview/script/turn] invalid turn output (interviewId=${interviewId}, field=${parseError.field}). Raw output:`,
          llmContent,
        );
        return NextResponse.json(
          { error: 'invalid_turn_output', field: parseError.field },
          { status: 422 },
        );
      }
      console.error(
        `[interview/script/turn] LLM output not parseable as JSON (interviewId=${interviewId}). Raw output:`,
        llmContent,
      );
      return NextResponse.json(
        { error: 'invalid_turn_output', field: '(root)' },
        { status: 422 },
      );
    }

    const newTurnIndex = interview.current_turn_index + 1;

    // STEP 8 — persist the new turn
    const { error: turnInsertError } = await serviceClient.from('script_turns').insert({
      interview_id: interviewId,
      turn_index: newTurnIndex,
      phase: validated.phase,
      is_question: validated.is_question,
      llm_output: validated,
      timer_seconds: validated.timer_seconds,
      // Tag question_type at generation time (drives score-v1 structure routing):
      // SCRIPT_M emits it per turn; H/T are single-type scripts so derive it.
      question_type:
        validated.question_type ??
        (validated.is_question ? questionTypeFromScript(interview.script_type) : null),
    });

    let turnForResponse = validated;
    let reusedExistingTurn = false;

    if (turnInsertError) {
      // Concurrent duplicate /script/turn (Strict Mode double-boot, retry overlap):
      // unique (interview_id, turn_index) — return the winner's row as 200.
      const isDuplicate =
        turnInsertError.code === '23505' ||
        /duplicate key|unique constraint/i.test(turnInsertError.message ?? '');

      if (!isDuplicate) {
        console.error(`[interview/script/turn] script_turns insert failed (interviewId=${interviewId}):`, turnInsertError);
        return NextResponse.json({ error: 'Failed to save turn' }, { status: 500 });
      }

      console.warn(
        `[interview/script/turn] duplicate turn_index=${newTurnIndex} (interviewId=${interviewId}) — returning existing row`,
      );

      const { data: existing, error: existingErr } = await serviceClient
        .from('script_turns')
        .select('turn_index, llm_output, timer_seconds, question_type, is_question, phase')
        .eq('interview_id', interviewId)
        .eq('turn_index', newTurnIndex)
        .maybeSingle();

      if (existingErr || !existing?.llm_output) {
        console.error(
          `[interview/script/turn] duplicate insert but existing row missing (interviewId=${interviewId}, turnIndex=${newTurnIndex}):`,
          existingErr,
        );
        return NextResponse.json({ error: 'Failed to save turn' }, { status: 500 });
      }

      try {
        turnForResponse = validateTurnOutput(existing.llm_output, interview.script_type);
      } catch {
        // Stored JSON may be the already-validated shape — trust it for resume.
        turnForResponse = existing.llm_output as typeof validated;
      }
      reusedExistingTurn = true;
    }

    // STEP 9 — record the candidate's answer on the previous turn.
    // raw_transcript: write-once from original STT (sttRawTranscript ?? lastAnswer when first set).
    // answer_text: whatever they actually submit (raw or corrected) — varies by submitted_as.
    // TODO: unsafe if a redo-this-answer path is added later — raw_transcript is write-once per turn
    if (prevTurnIndex != null && lastAnswer !== '[NONE]') {
      const { data: prevTurn } = await serviceClient
        .from('script_turns')
        .select('raw_transcript')
        .eq('interview_id', interviewId)
        .eq('turn_index', prevTurnIndex)
        .maybeSingle();

      const updatePayload: Record<string, unknown> = {
        submitted_as: submittedAs ?? 'raw',
        answer_text: lastAnswer,
      };

      if (!isSpecialValue && (prevTurn?.raw_transcript == null || prevTurn.raw_transcript === '')) {
        const original =
          typeof sttRawTranscript === 'string' && sttRawTranscript.trim().length > 0
            ? sttRawTranscript
            : lastAnswer;
        updatePayload.raw_transcript = original;
      }

      const { error: prevUpdateError } = await serviceClient
        .from('script_turns')
        .update(updatePayload)
        .eq('interview_id', interviewId)
        .eq('turn_index', prevTurnIndex);

      if (prevUpdateError) {
        console.error(`[interview/script/turn] previous turn update failed (interviewId=${interviewId}, turnIndex=${prevTurnIndex}):`, prevUpdateError);
      }
    }

    // STEP 10 — advance interview state (always sync cursor even on idempotent reuse)
    const interviewUpdate: Record<string, unknown> = {
      current_turn_index: newTurnIndex,
    };
    if (!reusedExistingTurn && validated.question_type != null) {
      interviewUpdate.last_question_type = validated.question_type;
    }
    if (!reusedExistingTurn && lastAnswer === '[SKIPPED]') {
      interviewUpdate.skips_used = interview.skips_used + 1;
    }

    const { error: interviewUpdateError } = await serviceClient
      .from('interviews')
      .update(interviewUpdate)
      .eq('id', interviewId);

    if (interviewUpdateError) {
      console.error(`[interview/script/turn] interview state update failed (interviewId=${interviewId}):`, interviewUpdateError);
      return NextResponse.json({ error: 'Failed to update interview state' }, { status: 500 });
    }

    // STEP 11 — respond
    return NextResponse.json(
      { turn: turnForResponse, turnIndex: newTurnIndex, interviewId },
      { status: 200 },
    );
  } catch (err) {
    console.error(`[interview/script/turn] Unexpected error (interviewId=${interviewIdForLog}):`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
