import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { evaluateAnswer } from '@/lib/openai/evaluate-answer';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { checkLLMCostGuard, estimateLLMCallCostUSD, recordLLMSpend } from '@/lib/ai/llm-cost-guard';
import { interviewAnswerSchema } from '@/lib/validations/schemas';
import { analyzeFillerWords } from '@/lib/filler-words/analyze';
import type { QuestionRubric } from '@/types/app.types';

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
    const rateLimit = await checkRateLimit(`answer:${user.id}`, 10, 5);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before submitting.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetInSeconds),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
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
    if (interview.status !== 'in_progress') {
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
      return NextResponse.json(
        { error: 'Monthly AI usage limit reached. Please upgrade your plan or try again next month.' },
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

      const { data: evaluation } = await serviceClient
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
      // Persist a sentinel evaluation row so the question is never silently
      // omitted from the PDF report; the fallback text will render instead.
      console.error('[interview/answer] Evaluation failed (non-fatal):', evalErr);
      try {
        await serviceClient
          .from('evaluations')
          .insert({
            answer_id: answer.id,
            overall_score: null,
            dimension_scores: null,
            feedback_text: 'Evaluation unavailable for this response.',
            detailed_analysis: null,
          });
      } catch (dbErr) {
        console.warn('[interview/answer] Could not persist fallback evaluation row:', dbErr);
      }
      return NextResponse.json({
        evaluationId: null,
        score: null,
        feedback: 'Unable to evaluate this answer.',
        provider: null,
      });
    }
  } catch (err) {
    console.error('[interview/answer] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
