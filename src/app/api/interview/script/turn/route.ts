import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getScript } from '@/lib/ai/scripts/script-loader';
import { buildRuntimeContext, experienceYearsToLevel } from '@/lib/ai/scripts/runtime-context';
import { validateTurnOutput, TurnValidationError } from '@/lib/ai/scripts/turn-validator';
import type { ScriptTurnOutput } from '@/lib/ai/scripts/turn-validator';
import { completeInterviewChat } from '@/lib/ai/interview-completion';
import {
  buildScriptResumeSummary,
  clampJobDescriptionForQuestions,
} from '@/lib/interview/question-gen-input';
import { questionTypeFromScript } from '@/lib/interview/answer-score/question-type';
import type { ScriptType } from '@/lib/ai/scripts/script-loader';
import { loadResumeContextForInterview } from '@/lib/resume/interview-snapshot';
import { completeScriptInterviewFromTurn } from '@/lib/interview/complete-script-interview-from-turn';
import {
  encodeSseEvent,
  streamScriptTurnLlm,
  wantsScriptTurnSse,
} from '@/lib/interview/script-turn-stream';
import {
  enforceScriptLlmRateLimit,
  reserveScriptLlmCost,
} from '@/lib/interview/script-llm-guards';
import {
  applyTurnAuthorityOverrides,
  cannedCandidateQuestionsTurn,
  cannedClosingTurn,
  cannedCoreEntryTurn,
  countCandidateQuestionFollowUps,
  countCandidateQuestionGuidanceTurns,
  countCandidateQuestionsExchanges,
  countCoreQuestions,
  countFollowUpsSinceLastCoreQuestion,
  countSelfIntroQuestions,
  countSelfIntroTurns,
  countWarmupQuestions,
  countWarmupTurns,
  displayQuestionNumberAfterTurn,
  bootResumeTurnIndex,
  existingNextTurnIndexAfterAnswer,
  lastCandidateQuestionAction,
  lastTurnWasCandidateQuestionsAnswer,
  lastTurnWasSelfIntroBridge,
  MAX_CANDIDATE_QUESTION_EXCHANGES,
  MAX_CANDIDATE_QUESTION_FOLLOW_UPS,
  probeIsRequired,
  recentAcknowledgments,
  resolvePromptPhase,
  resolveTurnCap,
  resolveTurnCapExhaustion,
  shouldForceClosingBeforeLlm,
  shouldForceCoreEntryBeforeLlm,
  shouldShowCandidateQuestionGuidance,
  turnIsFollowUp,
  type ScriptTurnRow,
} from '@/lib/ai/scripts/turn-authority';
import { resolveTurnContinuation } from '@/lib/ai/scripts/turn-continuation';
import {
  questionTextFromTurn,
  lastCoreQuestionTurn,
  lastFollowUpQuestionSinceParent,
  resolveFollowUpGenerationContext,
} from '@/lib/ai/scripts/follow-up-context';
import { nextScriptMCoreQuestionType } from '@/lib/ai/scripts/script-m-progression';
import { rewriteHypotheticalBehavioralTurn } from '@/lib/ai/scripts/hypothetical-framing-guard';
import {
  assignedCoreDirective,
  bindPlannedCoreQuestion,
} from '@/lib/interview/question-plan/bind-turn';
import { questionPlanContext, ensureInterviewQuestionPlan } from '@/lib/interview/question-plan/ensure';
import { logQuestionPlan } from '@/lib/interview/question-plan/log';
import { markQuestionPlanRows } from '@/lib/interview/question-plan/persist';
import { pickNextPlannedCore } from '@/lib/interview/question-plan/select';
import type { PlannedCoreQuestion } from '@/lib/interview/question-plan/types';
import { probeNeededFromEvaluationRow, type ProbeNeeded } from '@/lib/interview/answer-score/probe-needed';
import {
  cannedCandidateQuestionGuidanceTurn,
  selectCandidateQuestionGuidance,
} from '@/lib/interview/candidate-questions/guidance';
import { buildCandidateQuestionConversation } from '@/lib/interview/candidate-questions/context';
import { turnRequestSchema } from '@/lib/interview/script-turn-request-schema';
import {
  isSkipAnswer,
  skipsUsedAfterAnswer,
} from '@/lib/interview/skip-accounting';
import {
  buildAnswerQualityDirective,
  classifyCandidateAnswer,
  countConsecutiveQuestionEchoes,
} from '@/lib/interview/answer-quality';

const SPECIAL_VALUES = ['[NONE]', '[SKIPPED]', '[TIMEOUT]'] as const;

const LLM_TIMEOUT_MS = 45_000;

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
    questionPlanStatus?: 'pending' | 'ready';
  } | null;
  current_turn_index: number;
  self_intro_enabled: boolean;
  follow_up_enabled: boolean;
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

function turnResponse(
  turn: ScriptTurnOutput,
  turnIndex: number,
  interviewId: string,
  questionNumber: number,
  skipsUsed: number,
): NextResponse {
  return NextResponse.json(
    { turn, turnIndex, interviewId, questionNumber, skipsUsed },
    { status: 200 },
  );
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

    const rateLimited = await enforceScriptLlmRateLimit(user.id, 'turn');
    if (rateLimited) return rateLimited;

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
      // questionNumber from client is intentionally unused — see schema comment.
      submittedAs,
      prevTurnIndex,
      sttRawTranscript,
    } = validation.data;
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

    // STEP 2 — load interview state + resume + prior turns + display name
    const { data: interview, error: interviewError } = await serviceClient
      .from('interviews')
      .select(
        'interviewer_id, script_type, difficulty, role, question_count, session_context, current_turn_index, self_intro_enabled, follow_up_enabled, last_question_type, skips_used, max_skips, multilingual_detected, is_returning_user, resume_id',
      )
      .eq('id', interviewId)
      .single<InterviewRow>();

    if (interviewError || !interview) {
      console.error(`[interview/script/turn] interview load failed (interviewId=${interviewId}):`, interviewError);
      return NextResponse.json({ error: 'Failed to load interview' }, { status: 500 });
    }

    // Post-answer skip budget for this request (DB write happens later).
    // Must feed runtime context + allow_skip authority so the next turn does
    // not lag one skip behind the counter the candidate just consumed.
    const skipsUsedForSession = skipsUsedAfterAnswer(interview.skips_used, lastAnswer);
    const skipExtraUpdate = isSkipAnswer(lastAnswer)
      ? { skips_used: skipsUsedForSession }
      : {};

    // follow_up_enabled may be missing on rows created before the migration lands —
    // treat undefined as true (matches column DEFAULT).
    const followUpEnabled = interview.follow_up_enabled !== false;
    const recipientEmail = user.email?.trim() ?? '';

    const recordPreviousAnswer = async () => {
      if (prevTurnIndex == null || lastAnswer === '[NONE]') return;
      const { data: prevTurn } = await serviceClient
        .from('script_turns')
        .select('raw_transcript')
        .eq('interview_id', interviewId)
        .eq('turn_index', prevTurnIndex)
        .maybeSingle();

      const updatePayload: Record<string, unknown> = {
        submitted_as: submittedAs ?? 'raw',
        answer_text: lastAnswer,
        // Authoritative submit moment for retention duration (answered_at − created_at).
        answered_at: new Date().toISOString(),
      };

      const isSpecial =
        (SPECIAL_VALUES as readonly string[]).includes(lastAnswer);
      if (!isSpecial && (prevTurn?.raw_transcript == null || prevTurn.raw_transcript === '')) {
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
        console.error(
          `[interview/script/turn] previous turn update failed (interviewId=${interviewId}, turnIndex=${prevTurnIndex}):`,
          prevUpdateError,
        );
      }
    };

    // Idempotent resume: prefetch (or a prior call) already inserted the next
    // turn and advanced current_turn_index, but the client lost the response.
    // Return that row without a second LLM call or orphan insert at index+2.
    // Boot `[NONE]` also resumes when turn_index already advanced (duplicate
    // warmup race) or when turn 1 exists while current_turn_index is still 0.
    let resumeTurnIndex = existingNextTurnIndexAfterAnswer({
      prevTurnIndex,
      lastAnswer,
      currentTurnIndex: interview.current_turn_index,
    });
    if (resumeTurnIndex == null) {
      resumeTurnIndex = bootResumeTurnIndex({
        lastAnswer,
        currentTurnIndex: interview.current_turn_index,
      });
    }
    if (resumeTurnIndex == null && lastAnswer === '[NONE]' && interview.current_turn_index === 0) {
      const { data: bootRow } = await serviceClient
        .from('script_turns')
        .select('turn_index')
        .eq('interview_id', interviewId)
        .eq('turn_index', 1)
        .maybeSingle();
      if (bootRow?.turn_index === 1) {
        resumeTurnIndex = 1;
      }
    }
    if (resumeTurnIndex != null) {
      const { data: existingResume, error: resumeErr } = await serviceClient
        .from('script_turns')
        .select('turn_index, llm_output, phase, is_question')
        .eq('interview_id', interviewId)
        .eq('turn_index', resumeTurnIndex)
        .maybeSingle();

      if (resumeErr) {
        console.error(
          `[interview/script/turn] resume existing turn load failed (interviewId=${interviewId}, turnIndex=${resumeTurnIndex}):`,
          resumeErr,
        );
      } else if (existingResume?.llm_output) {
        console.warn(
          JSON.stringify({
            event: 'turn_idempotent_resume',
            interviewId,
            prevTurnIndex,
            resumeTurnIndex,
            currentTurnIndex: interview.current_turn_index,
          }),
        );

        await recordPreviousAnswer();

        let turnForResponse: ScriptTurnOutput;
        try {
          turnForResponse = validateTurnOutput(existingResume.llm_output, interview.script_type);
        } catch {
          turnForResponse = existingResume.llm_output as ScriptTurnOutput;
          if (turnForResponse.is_follow_up === undefined) {
            turnForResponse = { ...turnForResponse, is_follow_up: false };
          }
        }

        const { data: turnsForCount } = await serviceClient
          .from('script_turns')
          .select('turn_index, phase, is_question, llm_output')
          .eq('interview_id', interviewId)
          .order('turn_index', { ascending: true });
        const rows: ScriptTurnRow[] = (turnsForCount ?? []).map((t) => ({
          turn_index: t.turn_index as number,
          phase: t.phase as string,
          is_question: Boolean(t.is_question),
          llm_output: t.llm_output,
        }));
        const beforeRows = rows.filter((t) => t.turn_index < resumeTurnIndex);
        const coresBefore = countCoreQuestions(beforeRows);
        const questionNumber = displayQuestionNumberAfterTurn(coresBefore, turnForResponse);

        return turnResponse(
          turnForResponse,
          resumeTurnIndex,
          interviewId,
          questionNumber,
          interview.skips_used,
        );
      }
      // Row missing despite advanced index. For a [NONE] boot mid-interview,
      // try the latest available turn rather than generating a fresh warmup
      // (which would 422 or duplicate-greet a candidate already in core).
      if (lastAnswer === '[NONE]' && !resumeErr) {
        const { data: latestRow } = await serviceClient
          .from('script_turns')
          .select('turn_index, llm_output, phase, is_question')
          .eq('interview_id', interviewId)
          .order('turn_index', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestRow?.llm_output) {
          let turnForResponse: ScriptTurnOutput;
          try {
            turnForResponse = validateTurnOutput(latestRow.llm_output, interview.script_type);
          } catch {
            turnForResponse = latestRow.llm_output as ScriptTurnOutput;
            if (turnForResponse.is_follow_up === undefined) {
              turnForResponse = { ...turnForResponse, is_follow_up: false };
            }
          }
          console.warn(
            JSON.stringify({
              event: 'turn_boot_fallback_latest',
              interviewId,
              resumeTurnIndex,
              fallbackTurnIndex: latestRow.turn_index,
            }),
          );
          return turnResponse(
            turnForResponse,
            latestRow.turn_index as number,
            interviewId,
            0,
            interview.skips_used,
          );
        }
      }
      console.warn(
        `[interview/script/turn] idempotent resume index=${resumeTurnIndex} missing row (interviewId=${interviewId}) — generating`,
      );
    }

    // STEP 2 — load interview state + resume + prior turns + display name
    const [resumeCtx, { data: allTurnsRaw }, { data: profile }] = await Promise.all([
      loadResumeContextForInterview(serviceClient, {
        interviewId,
        resumeId: interview.resume_id,
      }),
      serviceClient
        .from('script_turns')
        .select('turn_index, phase, is_question, llm_output, answer_text')
        .eq('interview_id', interviewId)
        .order('turn_index', { ascending: true }),
      serviceClient
        .from('users')
        .select('name')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    const allTurns: ScriptTurnRow[] = (allTurnsRaw ?? []).map((t) => ({
      turn_index: t.turn_index as number,
      phase: t.phase as string,
      is_question: Boolean(t.is_question),
      llm_output: t.llm_output,
      answer_text: (t.answer_text as string | null | undefined) ?? null,
    }));

    const coreQuestionsAsked = countCoreQuestions(allTurns);
    const followUpsThisQuestion = countFollowUpsSinceLastCoreQuestion(allTurns);
    const candidateQuestionsExchanges = countCandidateQuestionsExchanges(allTurns);
    const candidateQuestionGuidanceTurns = countCandidateQuestionGuidanceTurns(allTurns);
    const candidateQuestionFollowUps = countCandidateQuestionFollowUps(allTurns);
    const warmupQuestionsAsked = countWarmupQuestions(allTurns);
    const warmupTurns = countWarmupTurns(allTurns);
    const selfIntroQuestionsAsked = countSelfIntroQuestions(allTurns);
    const selfIntroTurnsCount = countSelfIntroTurns(allTurns);
    const maxFollowUpsPerQuestion = followUpEnabled ? 2 : 0;
    const acknowledgments = recentAcknowledgments(allTurns, 3);
    const totalTurns = allTurns.length;
    const turnCap = resolveTurnCap(interview.difficulty);
    const sessionContext = interview.session_context ?? {};
    const experienceLevel = experienceYearsToLevel(sessionContext.experienceYears ?? 0);

    /** Persist a closing turn, mark interview completed, queue email. */
    const emitClosingAndComplete = async (
      closing: ScriptTurnOutput,
      extraInterviewUpdate?: Record<string, unknown>,
    ): Promise<NextResponse> => {
      const newTurnIndex = interview.current_turn_index + 1;
      await recordPreviousAnswer();

      const { error: closingInsertError } = await serviceClient.from('script_turns').insert({
        interview_id: interviewId,
        turn_index: newTurnIndex,
        phase: closing.phase,
        is_question: closing.is_question,
        llm_output: closing,
        timer_seconds: closing.timer_seconds,
        question_type: null,
      });

      if (closingInsertError) {
        const isDuplicate =
          closingInsertError.code === '23505' ||
          /duplicate key|unique constraint/i.test(closingInsertError.message ?? '');
        if (!isDuplicate) {
          console.error(
            `[interview/script/turn] closing insert failed (interviewId=${interviewId}):`,
            closingInsertError,
          );
          return NextResponse.json({ error: 'Failed to save turn' }, { status: 500 });
        }
      }

      const completeResult = await completeScriptInterviewFromTurn({
        serviceClient,
        interviewId,
        userId: user.id,
        recipientEmail,
        currentTurnIndex: newTurnIndex,
        performanceBucket: 'average',
        extraInterviewUpdate: {
          ...(extraInterviewUpdate ?? {}),
          ...skipExtraUpdate,
        },
      });

      if (!completeResult.ok) {
        return NextResponse.json({ error: 'Failed to complete interview' }, { status: 500 });
      }

      return turnResponse(
        closing,
        newTurnIndex,
        interviewId,
        coreQuestionsAsked,
        skipsUsedForSession,
      );
    };

    /** Persist a canned non-closing turn (core entry / reserved CQ) without completing. */
    const persistCannedActiveTurn = async (
      canned: ScriptTurnOutput,
      logLabel: string,
    ): Promise<NextResponse> => {
      const newTurnIndex = interview.current_turn_index + 1;
      await recordPreviousAnswer();
      const { error: insertError } = await serviceClient.from('script_turns').insert({
        interview_id: interviewId,
        turn_index: newTurnIndex,
        phase: canned.phase,
        is_question: canned.is_question,
        llm_output: canned,
        timer_seconds: canned.timer_seconds,
        question_type: null,
      });
      if (insertError) {
        const isDuplicate =
          insertError.code === '23505' ||
          /duplicate key|unique constraint/i.test(insertError.message ?? '');
        if (!isDuplicate) {
          console.error(
            `[interview/script/turn] ${logLabel} insert failed (interviewId=${interviewId}):`,
            insertError,
          );
          return NextResponse.json({ error: 'Failed to save turn' }, { status: 500 });
        }
      } else {
        const { error: interviewUpdateError } = await serviceClient
          .from('interviews')
          .update({
            current_turn_index: newTurnIndex,
            ...skipExtraUpdate,
          })
          .eq('id', interviewId);
        if (interviewUpdateError) {
          console.error(
            `[interview/script/turn] ${logLabel} state update failed (interviewId=${interviewId}):`,
            interviewUpdateError,
          );
          return NextResponse.json({ error: 'Failed to update interview state' }, { status: 500 });
        }
      }
      const questionNumber = displayQuestionNumberAfterTurn(coreQuestionsAsked, canned);
      if (wantsScriptTurnSse(request)) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                encodeSseEvent('sentence', {
                  index: 0,
                  speech: canned.speech,
                  turnIndex: newTurnIndex,
                  interviewId,
                }),
              ),
            );
            controller.enqueue(
              encoder.encode(
                encodeSseEvent('complete', {
                  turn: canned,
                  turnIndex: newTurnIndex,
                  interviewId,
                  questionNumber,
                  skipsUsed: skipsUsedForSession,
                }),
              ),
            );
            controller.close();
          },
        });
        return new NextResponse(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        });
      }
      return turnResponse(
        canned,
        newTurnIndex,
        interviewId,
        questionNumber,
        skipsUsedForSession,
      );
    };

    // STEP 2b — hard turn cap (no LLM call). Never skip candidate_questions
    // when cores are done — the cap is a runaway guard, not a product closer.
    if (totalTurns >= turnCap && currentPhase !== 'candidate_questions') {
      if (
        resolveTurnCapExhaustion({
          coreQuestionsAsked,
          totalQuestions: interview.question_count,
          candidateQuestionsExchanges,
        }) === 'candidate_questions'
      ) {
        return persistCannedActiveTurn(cannedCandidateQuestionsTurn(), 'cap-cq');
      }
      return emitClosingAndComplete(cannedClosingTurn());
    }

    // STEP 2c — the first generic decline gets concise contextual guidance.
    if (
      shouldShowCandidateQuestionGuidance({
        requestPhase: currentPhase,
        lastAnswer,
        candidateQuestionsExchanges,
        candidateQuestionGuidanceTurns,
      })
    ) {
      const questions = selectCandidateQuestionGuidance({
        interviewId,
        targetRole: interview.role,
        scriptType: interview.script_type,
        interviewGoal: sessionContext.goal ?? 'general_practice',
        experienceLevel,
      });
      return persistCannedActiveTurn(
        cannedCandidateQuestionGuidanceTurn({ questions }),
        'cq-guidance',
      );
    }

    // Completed CQ answer or a second generic decline → closing without LLM.
    if (
      shouldForceClosingBeforeLlm({
        requestPhase: currentPhase,
        lastAnswer,
        candidateQuestionsExchanges,
        lastTurnWasCqAnswer: lastTurnWasCandidateQuestionsAnswer(allTurns),
        candidateQuestionGuidanceTurns,
        maxCandidateQuestionsExchanges: MAX_CANDIDATE_QUESTION_EXCHANGES,
      })
    ) {
      return emitClosingAndComplete(cannedClosingTurn());
    }

    // Warmup exhausted + no self_intro → canned core entry, no LLM.
    // SSE sentence-0 must not be a discarded warmup-repeat.
    if (
      shouldForceCoreEntryBeforeLlm({
        requestPhase: currentPhase,
        warmupQuestionsAsked,
        warmupTurns,
        selfIntroEnabled: interview.self_intro_enabled,
      })
    ) {
      return persistCannedActiveTurn(cannedCoreEntryTurn(), 'core-entry');
    }

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

    // STEP 4 — system prompt = script + runtime context (server-derived counts)
    const jdClamped = clampJobDescriptionForQuestions(sessionContext.jobDescription);
    const followUpCtx = resolveFollowUpGenerationContext({
      turns: allTurns,
      lastAnswer,
      requestPhase: currentPhase,
      lastQuestionType:
        interview.script_type === 'SCRIPT_M' ? interview.last_question_type : null,
    });

    let answerProbeNeeded: ProbeNeeded = 'unknown';
    if (followUpEnabled && currentPhase === 'core') {
      const scoredTurn = lastCoreQuestionTurn(allTurns);
      if (scoredTurn) {
        const { data: evalRow } = await serviceClient
          .from('answer_evaluations')
          .select('status, overall, dimensions, raw_model_output')
          .eq('interview_id', interviewId)
          .eq('turn_index', scoredTurn.turn_index)
          .maybeSingle();
        answerProbeNeeded = probeNeededFromEvaluationRow(evalRow);
      }
    }

    const answerQuality = classifyCandidateAnswer({
      answer: followUpCtx.last_candidate_answer || lastAnswer,
      question: followUpCtx.parent_question,
    });
    const consecutiveQuestionEchoes = countConsecutiveQuestionEchoes({
      turns: allTurns,
      currentQuestion: followUpCtx.parent_question,
      currentAnswer: followUpCtx.last_candidate_answer || lastAnswer,
    });
    const answerQualityDirective = buildAnswerQualityDirective({
      quality: answerQuality,
      consecutiveEchoes: consecutiveQuestionEchoes,
      parentQuestion: followUpCtx.parent_question,
    });

    const promptPhase = resolvePromptPhase(
      currentPhase,
      coreQuestionsAsked,
      interview.question_count,
      {
        candidateQuestionsExchanges,
        maxCandidateQuestionsExchanges: MAX_CANDIDATE_QUESTION_EXCHANGES,
        lastTurnWasCqAnswer: lastTurnWasCandidateQuestionsAnswer(allTurns),
        warmupQuestionsAsked,
        warmupTurns,
        selfIntroEnabled: interview.self_intro_enabled,
        selfIntroQuestionsAsked,
        selfIntroTurns: selfIntroTurnsCount,
        lastTurnWasSelfIntroBridge: lastTurnWasSelfIntroBridge(allTurns),
        followUpEnabled,
        followUpsThisQuestion,
        maxFollowUpsPerQuestion: maxFollowUpsPerQuestion,
        hasValidParentCoreQuestion: followUpCtx.has_valid_parent_core_question,
        answerProbeNeeded,
      },
    );

    // Candidate-question entry is deterministic and explicit. This also keeps
    // an LLM/SSE fragment from jumping directly from final core to closing.
    if (
      promptPhase === 'candidate_questions' &&
      currentPhase !== 'candidate_questions' &&
      candidateQuestionsExchanges === 0
    ) {
      return persistCannedActiveTurn(cannedCandidateQuestionsTurn(), 'cq-entry');
    }

    const planContext = questionPlanContext({
      role: interview.role,
      parsedResume: resumeCtx.parsed,
      jobDescription: sessionContext.jobDescription,
    });
    const planMarker = sessionContext.questionPlanStatus;
    let questionPlan: PlannedCoreQuestion[] | null = null;
    if (planMarker === 'pending' || planMarker === 'ready') {
      const difficulty =
        interview.difficulty === 'easy' || interview.difficulty === 'hard'
          ? interview.difficulty
          : 'medium';
      questionPlan = await ensureInterviewQuestionPlan(serviceClient, {
        interviewId,
        userId: user.id,
        role: interview.role,
        difficulty,
        questionCount: interview.question_count,
        scriptType: interview.script_type,
        goal: sessionContext.goal ?? 'general_practice',
        interviewMode:
          sessionContext.interviewMode ??
          (interview.script_type === 'SCRIPT_T'
            ? 'technical'
            : interview.script_type === 'SCRIPT_H'
              ? 'hr_behavioral'
              : 'mixed'),
        experienceYears: sessionContext.experienceYears ?? 0,
        jobDescription: sessionContext.jobDescription,
        parsedResume: resumeCtx.parsed,
      });
    }

    const askedCoreQuestions = allTurns
      .filter((t) => t.phase === 'core' && t.is_question && !turnIsFollowUp(t.llm_output))
      .map((t) => questionTextFromTurn(t))
      .filter(Boolean);

    const coreProbeRequired = probeIsRequired({
      requestPhase: currentPhase,
      followUpEnabled,
      followUpsThisQuestion,
      maxFollowUpsPerQuestion,
      hasValidParentCoreQuestion: followUpCtx.has_valid_parent_core_question,
      answerProbeNeeded,
      lastAnswer,
      answerQuality,
    });
    const expectNewCore =
      questionPlan !== null &&
      currentPhase === 'core' &&
      !coreProbeRequired &&
      !answerQualityDirective &&
      coreQuestionsAsked < interview.question_count &&
      (followUpsThisQuestion >= maxFollowUpsPerQuestion ||
        answerProbeNeeded === false ||
        followUpCtx.previous_turn_was_acknowledgment ||
        lastAnswer === '[SKIPPED]' ||
        lastAnswer === '[TIMEOUT]');
    const assignedCore =
      expectNewCore && questionPlan
        ? pickNextPlannedCore({
            plan: questionPlan,
            scriptType: interview.script_type,
            lastQuestionType: interview.last_question_type,
            alreadyAsked: askedCoreQuestions,
          }).selected
        : null;

    const runtimeContext = buildRuntimeContext({
      candidate_name: displayName,
      target_role: interview.role,
      experience_level: experienceLevel,
      interview_goal: sessionContext.goal ?? 'general_practice',
      company_name: 'Not specified',
      company_type: 'unknown',
      difficulty: interview.difficulty,
      resume_summary: resumeSummary,
      job_description: jdClamped ?? 'Not provided',
      question_pool: assignedCore
        ? `assigned_core: ${assignedCore.questionText}`
        : questionPlan
          ? 'plan_active'
          : 'Not available',
      current_phase: promptPhase,
      question_number: coreQuestionsAsked,
      total_questions: interview.question_count,
      skips_used: skipsUsedForSession,
      max_skips: interview.max_skips,
      last_answer: followUpCtx.last_answer_for_prompt,
      multilingual_detected: multilingualDetected,
      is_returning_user: interview.is_returning_user,
      self_intro_enabled: interview.self_intro_enabled,
      current_turn_index: interview.current_turn_index + 1,
      follow_up_enabled: followUpEnabled,
      follow_ups_this_question: followUpsThisQuestion,
      max_follow_ups_per_question: maxFollowUpsPerQuestion,
      recent_acknowledgments: acknowledgments,
      parent_question: followUpCtx.parent_question,
      last_candidate_answer: followUpCtx.last_candidate_answer,
      last_answer_source: followUpCtx.last_answer_source,
      previous_turn_was_acknowledgment: followUpCtx.previous_turn_was_acknowledgment,
      selected_interviewer:
        interview.script_type === 'SCRIPT_M'
          ? interview.interviewer_id === 'priya'
            ? 'Meera'
            : 'Rohan'
          : undefined,
      last_question_type:
        interview.script_type === 'SCRIPT_M' ? interview.last_question_type : undefined,
      follow_up_cap_reached: followUpEnabled && followUpsThisQuestion >= maxFollowUpsPerQuestion,
      answer_probe_needed: answerProbeNeeded,
      answer_quality: answerQuality.kind,
      candidate_question_action: lastCandidateQuestionAction(allTurns) ?? 'none',
      candidate_question_guidance_shown: candidateQuestionGuidanceTurns > 0,
      candidate_question_follow_ups: candidateQuestionFollowUps,
      max_candidate_question_follow_ups: MAX_CANDIDATE_QUESTION_FOLLOW_UPS,
      candidate_question_conversation:
        currentPhase === 'candidate_questions'
          ? buildCandidateQuestionConversation(allTurns, lastAnswer)
          : '[NONE]',
      next_core_question_type:
        interview.script_type === 'SCRIPT_M'
          ? nextScriptMCoreQuestionType(interview.last_question_type)
          : undefined,
    });

    const systemPrompt =
      getScript(interview.script_type) +
      '\n\n## RUNTIME CONTEXT\n\n```\n' +
      runtimeContext +
      '\n```';

    // STEP 5 — user message (prepend previously asked questions so the LLM avoids repeats)
    const askedQuestions: string[] = allTurns
      .filter((t) => t.is_question && (t.phase === 'core' || t.phase === 'self_intro'))
      .map((t) => questionTextFromTurn(t))
      .filter(Boolean);

    const capReached =
      currentPhase === 'core' &&
      followUpEnabled &&
      followUpsThisQuestion >= maxFollowUpsPerQuestion;
    const probeNotNeeded = currentPhase === 'core' && answerProbeNeeded === false;
    const nextCoreType =
      interview.script_type === 'SCRIPT_M'
        ? nextScriptMCoreQuestionType(interview.last_question_type)
        : null;
    const alreadyAskedBlock =
      askedQuestions.length > 0
        ? `\n\nALREADY ASKED — Do NOT repeat these as NEW core questions (is_follow_up: false). Same-topic follow-ups (is_follow_up: true) on the latest parent are allowed when follow_up_enabled=true, answer_probe_needed is true or unknown, the answer is incomplete, and follow_ups_this_question < max_follow_ups_per_question:\n${askedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
        : '';
    const capDirective = capReached
      ? `\n\nFOLLOW-UP CAP REACHED (${followUpsThisQuestion}/${maxFollowUpsPerQuestion}). Set is_follow_up: false. Ask a NEW core question that is not in ALREADY ASKED and is not a restatement of parent_question.${
          nextCoreType
            ? ` SCRIPT_M: question_type MUST be "${nextCoreType}" (last_question_type=${interview.last_question_type ?? 'null'}). Alternation applies only to this new core.`
            : ''
        }`
      : '';
    const probeDirective = probeNotNeeded
      ? `\n\nANSWER DOES NOT NEED A FOLLOW-UP (answer_probe_needed=false). Set is_follow_up: false. Ask a NEW core question that is not in ALREADY ASKED, or use phase candidate_questions if question_number >= total_questions.`
      : '';

    const probeRequired = probeIsRequired({
      requestPhase: currentPhase,
      followUpEnabled,
      followUpsThisQuestion,
      maxFollowUpsPerQuestion,
      hasValidParentCoreQuestion: followUpCtx.has_valid_parent_core_question,
      answerProbeNeeded,
      lastAnswer,
      answerQuality,
    });
    const probeRequiredDirective = probeRequired
      ? `\n\nFOLLOW-UP REQUIRED (answer_probe_needed=true). The scored answer to parent_question is still weak, so the probe is mandatory, not optional. Set is_follow_up: true and is_question: true, keep phase "core", and ask ONE same-topic follow-up on parent_question targeting the gap in last_candidate_answer. Do NOT ask a new core question, do NOT move on, and do NOT change phase. Follow-ups used: ${followUpsThisQuestion}/${maxFollowUpsPerQuestion}.`
      : '';

    const continuation = resolveTurnContinuation({
      requestPhase: currentPhase,
      lastAnswer,
      previousTurnWasAcknowledgment: followUpCtx.previous_turn_was_acknowledgment,
      coreQuestionsAsked,
      totalQuestions: interview.question_count,
      nextCoreQuestionType: nextCoreType,
    });

    const candidateQuestionDirective =
      currentPhase === 'candidate_questions'
        ? `\n\nCANDIDATE-QUESTION PHASE: Answer the candidate directly in 2-3 sentences. Do not invent company facts. Set candidate_question_action="answer" and is_question=false unless one precise clarification is genuinely required to answer usefully. Only then set candidate_question_action="follow_up", is_question=true. CQ follow-ups used: ${candidateQuestionFollowUps}/${MAX_CANDIDATE_QUESTION_FOLLOW_UPS}. This is a maximum, not a quota.`
        : '';

    // Answer-quality recovery (echo / off-topic / uncertainty) wins over the
    // score-based probe/move-on user-message shortcuts; authority still clamps.
    const userMessage =
      lastAnswer === '[NONE]'
        ? `Begin the interview.${alreadyAskedBlock}`
        : answerQualityDirective
          ? `${followUpCtx.last_answer_for_prompt}${alreadyAskedBlock}${answerQualityDirective}`
          : capReached
            ? `Ask the next new core question now.${alreadyAskedBlock}${capDirective}`
            : probeNotNeeded
              ? `Ask the next new core question now.${alreadyAskedBlock}${probeDirective}`
              : probeRequired
                ? `Ask the required same-topic follow-up now.${alreadyAskedBlock}${probeRequiredDirective}`
                : continuation
                  ? `${continuation.instruction}${alreadyAskedBlock}${continuation.directive}`
                  : `${followUpCtx.last_answer_for_prompt}${alreadyAskedBlock}${candidateQuestionDirective}`;

    const userMessageWithPlan =
      assignedCore
        ? `${userMessage}${assignedCoreDirective(assignedCore.questionText, assignedCore.questionType)}`
        : userMessage;

    const llmMessages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessageWithPlan },
    ];

    type TurnOk = {
      ok: true;
      turn: ScriptTurnOutput;
      turnIndex: number;
      questionNumber: number;
      skipsUsed: number;
    };
    type TurnErr = { ok: false; status: number; body: Record<string, unknown> };

    /** Parse → validate → authority → persist. Shared by JSON and SSE paths. */
    const finalizeTurnFromLlmContent = async (llmContent: string): Promise<TurnOk | TurnErr> => {
      let validated: ScriptTurnOutput;
      try {
        const parsed = parseLlmJson(llmContent);
        validated = validateTurnOutput(parsed, interview.script_type);
      } catch (parseError) {
        if (parseError instanceof TurnValidationError) {
          console.error(
            `[interview/script/turn] invalid turn output (interviewId=${interviewId}, field=${parseError.field}). Raw output:`,
            llmContent,
          );
          return { ok: false, status: 422, body: { error: 'invalid_turn_output', field: parseError.field } };
        }
        console.error(
          `[interview/script/turn] LLM output not parseable as JSON (interviewId=${interviewId}). Raw output:`,
          llmContent,
        );
        return { ok: false, status: 422, body: { error: 'invalid_turn_output', field: '(root)' } };
      }

      validated = applyTurnAuthorityOverrides({
        turn: validated,
        coreQuestionsAsked,
        totalQuestions: interview.question_count,
        followUpsThisQuestion,
        followUpEnabled,
        hasValidParentCoreQuestion: followUpCtx.has_valid_parent_core_question,
        parentQuestionType:
          interview.script_type === 'SCRIPT_M' ? followUpCtx.parent_question_type : null,
        parentQuestion: followUpCtx.parent_question,
        lastCandidateAnswer: followUpCtx.last_candidate_answer,
        lastFollowUpQuestion: lastFollowUpQuestionSinceParent(allTurns),
        alreadyAskedQuestions: askedQuestions,
        lastQuestionType:
          interview.script_type === 'SCRIPT_M' ? interview.last_question_type : null,
        scriptType: interview.script_type,
        candidateQuestionsExchanges,
        maxCandidateQuestionsExchanges: MAX_CANDIDATE_QUESTION_EXCHANGES,
        candidateQuestionFollowUps,
        maxCandidateQuestionFollowUps: MAX_CANDIDATE_QUESTION_FOLLOW_UPS,
        requestPhase: currentPhase,
        lastAnswer,
        warmupQuestionsAsked,
        warmupTurns,
        selfIntroEnabled: interview.self_intro_enabled,
        selfIntroQuestionsAsked,
        selfIntroTurns: selfIntroTurnsCount,
        answerProbeNeeded,
        previousTurnWasAcknowledgment: followUpCtx.previous_turn_was_acknowledgment,
        skipsUsed: skipsUsedForSession,
        maxSkips: interview.max_skips,
        answerQuality,
        consecutiveQuestionEchoes,
      });

      const coreBinding = bindPlannedCoreQuestion({
        turn: validated,
        scriptType: interview.script_type,
        lastQuestionType: interview.script_type === 'SCRIPT_M' ? interview.last_question_type : null,
        plan: questionPlan,
        alreadyAskedCore: askedCoreQuestions,
        context: planContext,
      });
      validated = coreBinding.turn;

      // After binding: the plan replaces display_question, so a guard applied
      // earlier would never reach the candidate.
      const isBehavioralTurn =
        interview.script_type === 'SCRIPT_H' ||
        (interview.script_type === 'SCRIPT_M' && validated.question_type === 'behavioral');
      validated = rewriteHypotheticalBehavioralTurn(validated, {
        isBehavioral: isBehavioralTurn,
        interviewId,
        turnIndex: interview.current_turn_index + 1,
      });

      // Authority may replace speech/display_question (canned CQ / self_intro)
      // and canonicalizes speech to optional-bridge + exact display_question.
      // Re-check schema only — do not 422 on pre-normalize paraphrase.
      try {
        validated = validateTurnOutput(validated, interview.script_type);
      } catch (authorityValidateError) {
        if (authorityValidateError instanceof TurnValidationError) {
          console.error(
            `[interview/script/turn] authority turn failed validation (interviewId=${interviewId}, field=${authorityValidateError.field})`,
          );
          return {
            ok: false,
            status: 422,
            body: { error: 'invalid_turn_output', field: authorityValidateError.field },
          };
        }
        throw authorityValidateError;
      }

      const questionNumberForClient = displayQuestionNumberAfterTurn(coreQuestionsAsked, validated);
      const newTurnIndex = interview.current_turn_index + 1;

      const { error: turnInsertError } = await serviceClient.from('script_turns').insert({
        interview_id: interviewId,
        turn_index: newTurnIndex,
        phase: validated.phase,
        is_question: validated.is_question,
        llm_output: validated,
        timer_seconds: validated.timer_seconds,
        question_type:
          validated.question_type ??
          (validated.phase === 'core' && validated.is_question
            ? questionTypeFromScript(interview.script_type)
            : null),
      });

      let turnForResponse = validated;
      let reusedExistingTurn = false;

      if (turnInsertError) {
        const isDuplicate =
          turnInsertError.code === '23505' ||
          /duplicate key|unique constraint/i.test(turnInsertError.message ?? '');

        if (!isDuplicate) {
          console.error(`[interview/script/turn] script_turns insert failed (interviewId=${interviewId}):`, turnInsertError);
          return { ok: false, status: 500, body: { error: 'Failed to save turn' } };
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
          return { ok: false, status: 500, body: { error: 'Failed to save turn' } };
        }

        try {
          turnForResponse = validateTurnOutput(existing.llm_output, interview.script_type);
        } catch {
          turnForResponse = existing.llm_output as typeof validated;
          if (turnForResponse.is_follow_up === undefined) {
            turnForResponse = { ...turnForResponse, is_follow_up: false };
          }
        }
        reusedExistingTurn = true;
      }

      if (!reusedExistingTurn) {
        for (const event of coreBinding.events) {
          logQuestionPlan(interviewId, event);
        }
        if (coreBinding.askedId || coreBinding.skippedIds.length > 0) {
          await markQuestionPlanRows(serviceClient, [
            ...(coreBinding.askedId ? [{ id: coreBinding.askedId, status: 'asked' as const }] : []),
            ...coreBinding.skippedIds.map((id) => ({ id, status: 'skipped' as const })),
          ]);
        }
      }

      await recordPreviousAnswer();

      if (turnForResponse.phase === 'closing') {
        const completeResult = await completeScriptInterviewFromTurn({
          serviceClient,
          interviewId,
          userId: user.id,
          recipientEmail,
          currentTurnIndex: newTurnIndex,
          performanceBucket: 'average',
          extraInterviewUpdate: {
            ...(!reusedExistingTurn &&
            validated.phase === 'core' &&
            validated.question_type != null &&
            !validated.is_follow_up
              ? { last_question_type: validated.question_type }
              : {}),
            ...(!reusedExistingTurn ? skipExtraUpdate : {}),
          },
        });
        if (!completeResult.ok) {
          return { ok: false, status: 500, body: { error: 'Failed to complete interview' } };
        }
      } else {
        const interviewUpdate: Record<string, unknown> = {
          current_turn_index: newTurnIndex,
        };
        if (
          !reusedExistingTurn &&
          validated.phase === 'core' &&
          validated.question_type != null &&
          !validated.is_follow_up
        ) {
          interviewUpdate.last_question_type = validated.question_type;
        }
        if (!reusedExistingTurn && isSkipAnswer(lastAnswer)) {
          interviewUpdate.skips_used = skipsUsedForSession;
        }

        const { error: interviewUpdateError } = await serviceClient
          .from('interviews')
          .update(interviewUpdate)
          .eq('id', interviewId);

        if (interviewUpdateError) {
          console.error(`[interview/script/turn] interview state update failed (interviewId=${interviewId}):`, interviewUpdateError);
          return { ok: false, status: 500, body: { error: 'Failed to update interview state' } };
        }
      }

      return {
        ok: true,
        turn: turnForResponse,
        turnIndex: newTurnIndex,
        questionNumber: reusedExistingTurn
          ? displayQuestionNumberAfterTurn(coreQuestionsAsked, turnForResponse)
          : questionNumberForClient,
        // Reused turns already persisted the skip — report DB value, not +1 again.
        skipsUsed: reusedExistingTurn ? interview.skips_used : skipsUsedForSession,
      };
    };

    // STEP 6 — LLM call. SSE path (flag + Accept) streams first speech sentence;
    // flag-off / non-SSE keeps the existing complete-then-respond behavior.
    const { data: userProfile } = await serviceClient
      .from('users')
      .select('plan_tier')
      .eq('id', user.id)
      .maybeSingle();
    const planTier = (userProfile?.plan_tier as string | undefined) ?? 'free';
    const costReserve = await reserveScriptLlmCost(user.id, planTier, 'turn');
    if (!costReserve.ok) return costReserve.response;
    const costReservation = costReserve.reservation;

    if (wantsScriptTurnSse(request)) {
      console.info(
        `[script-stream] sse_path_selected interviewId=${interviewId} script=${interview.script_type}`,
      )
      const encoder = new TextEncoder();
      const timeout = AbortSignal.timeout(LLM_TIMEOUT_MS);
      const linked = AbortSignal.any
        ? AbortSignal.any([request.signal, timeout])
        : timeout;

      const stream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(encodeSseEvent(event, data)));
          };
          let costCommitted = false;
          try {
            const streamed = await streamScriptTurnLlm({
              messages: llmMessages,
              signal: linked,
              onSentence: (speech, index) => {
                console.info(
                  `[script-stream] sentence_emitted interviewId=${interviewId} index=${index} chars=${speech.length}`,
                )
                send('sentence', {
                  index,
                  speech,
                  turnIndex: interview.current_turn_index + 1,
                  interviewId,
                });
              },
              onFirstToken: () => {
                console.info(`[script-stream] first_token interviewId=${interviewId}`)
              },
            });

            if (linked.aborted && !streamed.rawJson.trim()) {
              controller.close();
              return;
            }
            if (streamed.rawJson.trim()) {
              costCommitted = true;
            }

            const finalized = await finalizeTurnFromLlmContent(streamed.rawJson);
            if (!finalized.ok) {
              // If a sentence was already spoken client-side, do not force a full
              // TTS replay — surface the error event only.
              send('error', finalized.body);
              controller.close();
              return;
            }

            console.info(
              `[script-stream] complete_emitted interviewId=${interviewId} earlySentence=${Boolean(streamed.firstSentence)}`,
            )
            send('complete', {
              turn: finalized.turn,
              turnIndex: finalized.turnIndex,
              interviewId,
              questionNumber: finalized.questionNumber,
              skipsUsed: finalized.skipsUsed,
            });
            controller.close();
          } catch (llmError) {
            if (linked.aborted || request.signal.aborted) {
              controller.close();
              return;
            }
            if (isTimeoutError(llmError)) {
              console.error(`[interview/script/turn] LLM timeout (interviewId=${interviewId}):`, llmError);
              send('error', { error: 'llm_timeout' });
            } else {
              console.error(`[interview/script/turn] LLM error (interviewId=${interviewId}):`, llmError);
              send('error', {
                error: 'llm_error',
                message: 'The interviewer is temporarily unavailable. Please retry.',
              });
            }
            controller.close();
          } finally {
            if (!costCommitted) {
              await costReservation.release();
            }
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    let llmContent: string;
    let costCommitted = false;
    try {
      try {
        const completion = await completeInterviewChat({
          messages: llmMessages,
          temperature: 0.7,
          operation: 'script_turn_generation',
          jsonMode: true,
          signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
          interviewId,
          userId: user.id,
        });
        llmContent = completion.content;
        costCommitted = true;
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

      const finalized = await finalizeTurnFromLlmContent(llmContent);
      if (!finalized.ok) {
        return NextResponse.json(finalized.body, { status: finalized.status });
      }

      return turnResponse(
        finalized.turn,
        finalized.turnIndex,
        interviewId,
        finalized.questionNumber,
        finalized.skipsUsed,
      );
    } finally {
      if (!costCommitted) {
        await costReservation.release();
      }
    }
  } catch (err) {
    console.error(`[interview/script/turn] Unexpected error (interviewId=${interviewIdForLog}):`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
