import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { evaluateAnswer } from '@/lib/openai/evaluate-answer';
import { checkRateLimit, buildRateLimitHttpResponse } from '@/lib/redis/rate-limit';
import { checkLLMCostGuard, estimateLLMCallCostUSD, recordLLMSpend } from '@/lib/ai/llm-cost-guard';
import { interviewAnswerSchema } from '@/lib/validations/schemas';
import { analyzeFillerWords } from '@/lib/filler-words/analyze';
import type { QuestionRubric } from '@/types/app.types';
import { trackInterviewEvent } from '@/lib/analytics/interview-events';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // ── Step 1: Authenticate + verify interview ownership ─────────────────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Step 2: Rate limiting (5 req / 10s per user) ──────────────────────────
    const rateLimit = await checkRateLimit(`answer:${user.id}`, 10, 5, { failClosed: true });
    const blocked = buildRateLimitHttpResponse(
      rateLimit,
      'Too many requests. Please wait a moment before submitting.',
    );
    if (blocked) {
      return NextResponse.json(blocked.body, {
        status: blocked.status,
        headers: { ...blocked.headers, 'X-RateLimit-Remaining': '0' },
      });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = interviewAnswerSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { interviewId, questionId, answerText, answerMode, answerStyle, durationSeconds } =
      validation.data;

    const serviceClient = createServiceClient();

    const { data: interview } = await serviceClient
      .from('interviews')
      .select('id, user_id, status')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }
    if (interview.status === 'completed' || interview.status === 'abandoned') {
      return NextResponse.json({ error: 'Interview is not in progress' }, { status: 400 });
    }

    if (interview.status === 'pending') {
      const now = new Date().toISOString();
      await serviceClient
        .from('interviews')
        .update({
          status: 'in_progress',
          started_at: now,
        })
        .eq('id', interviewId)
        .eq('user_id', user.id);
    } else if (interview.status !== 'in_progress') {
      return NextResponse.json({ error: 'Interview is not in progress' }, { status: 400 });
    }

    // ── Step 3: Fetch question + rubric ───────────────────────────────────────
    const { data: question } = await serviceClient
      .from('questions')
      .select('id, question_text, rubric')
      .eq('id', questionId)
      .eq('interview_id', interviewId)
      .maybeSingle();

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // ── Idempotent: duplicate submit for same question ─────────────────────
    const { data: existingAnswer } = await serviceClient
      .from('answers')
      .select('id')
      .eq('question_id', questionId)
      .maybeSingle();

    if (existingAnswer?.id) {
      const { data: existingEval } = await serviceClient
        .from('evaluations')
        .select('id, overall_score, feedback_text')
        .eq('answer_id', existingAnswer.id)
        .maybeSingle();

      trackInterviewEvent('answer_recorded', {
        userId: user.id,
        interviewId,
        questionId,
        idempotent: true,
      });

      return NextResponse.json({
        evaluationId: existingEval?.id ?? null,
        score: existingEval?.overall_score ?? null,
        feedback: existingEval?.feedback_text ?? 'Answer already recorded.',
        idempotent: true,
      });
    }

    // ── Step 4: Save answer record ────────────────────────────────────────────
    const { data: answer, error: answerError } = await serviceClient
      .from('answers')
      .insert({
        question_id: questionId,
        answer_text: answerText,
        answer_mode: answerMode ?? 'text',
      })
      .select('id')
      .single();

    if (answerError || !answer) {
      console.error('[interview/answer] Answer insert error:', answerError);
      return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 });
    }

    trackInterviewEvent('answer_recorded', {
      userId: user.id,
      interviewId,
      questionId,
      answerMode: answerMode ?? 'text',
      durationSeconds: durationSeconds ?? 0,
    });

    // ── Step 4b: Persist speech metrics (non-fatal if column absent in prod) ──
    if (durationSeconds !== undefined) {
      try {
        const speechMetrics = analyzeFillerWords(answerText, durationSeconds);
        const { error: metricsErr } = await serviceClient
          .from('answers')
          .update({
            duration_seconds: durationSeconds,
            speech_metrics: speechMetrics,
          })
          .eq('id', answer.id);

        if (metricsErr) {
          // Migration 022 may not yet be applied in this environment — log and
          // continue so the answer + evaluation are never blocked by this.
          console.warn(
            '[interview/answer] speech_metrics persist skipped (migration pending?):',
            metricsErr.message,
          );
        } else {
          console.info('[interview/answer] speech_metrics persisted', {
            answerId: answer.id,
            durationSeconds,
            fillerCount: speechMetrics.count,
            severity: speechMetrics.severity,
          });
        }
      } catch (metricsEx) {
        console.warn('[interview/answer] speech_metrics compute failed (non-fatal):', metricsEx);
      }
    }

    // ── Step 5: LLM cost guard (enforce max_llm_cost_per_month_usd) ──────────
    const { data: userProfile } = await serviceClient
      .from('users')
      .select('plan_tier')
      .eq('id', user.id)
      .single();
    const planTier = (userProfile?.plan_tier as string | undefined) ?? 'free';
    const estimatedCost = estimateLLMCallCostUSD('answer_evaluation');
    const costGuard = await checkLLMCostGuard(user.id, planTier, estimatedCost, 'answer_evaluation');
    if (!costGuard.allowed) {
      // Save fallback evaluation so answer isn't orphaned — report can still be generated
      console.warn('[interview/answer] Cost guard blocked evaluation — saving fallback', {
        answerId: answer.id,
        userId: user.id,
      });
      const fallbackDimensions = {
        communication_clarity: 5,
        technical_depth: 5,
        answer_structure: 5,
        confidence: 5,
        relevance: 5,
      };
      await serviceClient
        .from('evaluations')
        .insert({
          answer_id: answer.id,
          overall_score: 5,
          dimension_scores: fallbackDimensions,
          feedback_text: 'Evaluation skipped — monthly AI usage limit reached.',
          detailed_analysis: {
            strengths: ['Your answer was recorded.'],
            improvements: ['Upgrade your plan to get detailed feedback.'],
            model_answer_hint: '',
            keywords_missing: [],
            score_justification: {
              why_this_score: 'Neutral score assigned due to usage limit.',
              key_strengths: ['Answer submitted.'],
              improvement_areas: ['Upgrade for full evaluation.'],
            },
          },
        });
      return NextResponse.json(
        {
          error: 'Monthly AI usage limit reached. Your answer was saved with a neutral score.',
          evaluationId: null,
          score: 5,
          feedback: 'Evaluation skipped — upgrade your plan for detailed feedback.',
          fallback: true,
        },
        { status: 429 },
      );
    }

    // ── Steps 6–7: Evaluate + store (graceful degradation on AI failure) ─────
    try {
      const evaluationResult = await evaluateAnswer({
        questionText: question.question_text as string,
        rubric: question.rubric as QuestionRubric,
        answerText,
        answerStyle,
      });

      const { data: evaluation, error: evalInsertErr } = await serviceClient
        .from('evaluations')
        .insert({
          answer_id: answer.id,
          overall_score: evaluationResult.overall_score,
          dimension_scores: evaluationResult.dimension_scores,
          feedback_text: evaluationResult.feedback_text,
          detailed_analysis: evaluationResult.detailed_analysis,
        })
        .select('id')
        .single();

      if (evalInsertErr) {
        console.error('[interview/answer] Evaluation insert failed:', evalInsertErr);
        throw new Error(`Evaluation insert failed: ${evalInsertErr.message}`);
      }

      // Record actual estimated cost after successful evaluation
      await recordLLMSpend(user.id, estimatedCost);

      // ── Step 8: Return ────────────────────────────────────────────────────
      return NextResponse.json({
        evaluationId: evaluation?.id ?? null,
        score: evaluationResult.overall_score,
        feedback: evaluationResult.feedback_text,
        provider: evaluationResult.provider,
      });
    } catch (evalErr) {
      // Answer is safely saved — evaluation failure is non-fatal.
      // Persist a VALID fallback evaluation with neutral scores (5/10) so the
      // report can still be generated. Null scores cause aggregation failures.
      const errMsg = evalErr instanceof Error ? evalErr.message : String(evalErr);
      const isTimeout = errMsg.includes('deadline') || errMsg.includes('timeout');
      console.error('[interview/answer] Evaluation failed (non-fatal):', {
        error: errMsg,
        isTimeout,
        answerId: answer.id,
        questionId: questionId,
      });

      // Fallback evaluation with neutral scores — ensures report aggregation works
      const fallbackDimensions = {
        communication_clarity: 5,
        technical_depth: 5,
        answer_structure: 5,
        confidence: 5,
        relevance: 5,
      };
      const fallbackScore = 5;
      const fallbackFeedback = isTimeout
        ? 'Evaluation timed out. Your answer was recorded but could not be scored in time.'
        : 'Evaluation unavailable for this response. Your answer was recorded.';
      const fallbackAnalysis = {
        strengths: ['Your answer was recorded successfully.'],
        improvements: ['Evaluation was unavailable — practice with another session for detailed feedback.'],
        model_answer_hint: '',
        keywords_missing: [],
        score_justification: {
          why_this_score: 'Neutral score assigned due to evaluation service unavailability.',
          key_strengths: ['Answer submitted successfully.'],
          improvement_areas: ['Try another session for detailed evaluation.'],
        },
      };

      // Retry fallback insert up to 2 times to ensure persistence
      let fallbackInserted = false;
      for (let attempt = 1; attempt <= 2 && !fallbackInserted; attempt++) {
        try {
          const { error: fallbackErr } = await serviceClient
            .from('evaluations')
            .insert({
              answer_id: answer.id,
              overall_score: fallbackScore,
              dimension_scores: fallbackDimensions,
              feedback_text: fallbackFeedback,
              detailed_analysis: fallbackAnalysis,
            });

          if (fallbackErr) {
            console.warn(`[interview/answer] Fallback insert attempt ${attempt} failed:`, fallbackErr.message);
            if (attempt < 2) {
              // Brief delay before retry
              await new Promise(r => setTimeout(r, 200));
            }
          } else {
            fallbackInserted = true;
            console.info('[interview/answer] Fallback evaluation persisted successfully', {
              answerId: answer.id,
              attempt,
            });
          }
        } catch (dbErr) {
          console.warn(`[interview/answer] Fallback insert attempt ${attempt} threw:`, dbErr);
        }
      }

      if (!fallbackInserted) {
        console.error('[interview/answer] CRITICAL: All fallback insert attempts failed', {
          answerId: answer.id,
          questionId: questionId,
        });
      }

      return NextResponse.json({
        evaluationId: null,
        score: fallbackInserted ? fallbackScore : null,
        feedback: fallbackFeedback,
        provider: null,
        fallback: true,
      });
    }
  } catch (err) {
    console.error('[interview/answer] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
/** Outer route budget — must exceed answer_evaluation deadline + inserts (see operation-registry). */
export const maxDuration = 60;
