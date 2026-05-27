import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { generateQuestions, QuestionGenerationError } from '@/lib/openai/generate-questions';
import { checkAndDeductCredit, refundCredit } from '@/lib/utils/credits';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { interviewStartSchema } from '@/lib/validations/schemas';
import { checkLLMCostGuard, estimateLLMCallCostUSD, recordLLMSpend } from '@/lib/ai/llm-cost-guard';

import {
  buildCacheKey,
  computeJdFingerprint,
  getCachedQuestions,
  setCachedQuestions,
} from '@/lib/redis/question-cache';
import type { ParsedResume, QuestionCategory, InterviewSessionContext } from '@/types/app.types';
import { getInterviewerById } from '@/lib/config/interviewers';
import { difficultyQuestionCount } from '@/lib/interview/difficulty-question-count';
import { getUserProgress } from '@/lib/retention';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // ── Step 1: Authenticate user ─────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Rate limiting (5 starts / 60s per user) ───────────────────────────────
    const rateLimit = await checkRateLimit(`start:${user.id}`, 60, 5);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many interview starts. Please wait before trying again.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetInSeconds),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // ── Validate input ────────────────────────────────────────────────────────
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = interviewStartSchema.safeParse(rawBody);
    if (!validation.success) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[interview/start] validation_failed', validation.error.flatten());
      }
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 }
      );
    }
    const {
      resumeId,
      role,
      difficulty,
      interviewerId,
      goal,
      interviewMode,
      experienceYears,
      questionCount: clientQuestionCount,
      domainPackId,
      jobDescription: rawJobDescription,
    } = validation.data;

    const jobDescription =
      rawJobDescription && rawJobDescription.trim().length > 0
        ? rawJobDescription.trim().slice(0, 12000)
        : undefined;

    let rawCount: number;
    if (domainPackId) {
      rawCount = clientQuestionCount ?? 6;
    } else {
      rawCount = clientQuestionCount ?? difficultyQuestionCount(difficulty);
    }
    const questionCount = Math.min(10, Math.max(4, rawCount));

    const sessionContext: InterviewSessionContext = {
      goal,
      interviewMode,
      experienceYears,
      interviewerId,
    };
    if (jobDescription) {
      sessionContext.jobDescription = jobDescription;
    }

    const userTier = (await getUserProgress(user.id))?.current_tier ?? 1;
    const cacheSession = {
      goal,
      interviewMode,
      experienceYears,
      interviewerId,
      jdFingerprint: computeJdFingerprint(jobDescription),
      tier: userTier,
    };
    const interviewer = getInterviewerById(interviewerId);
    if (!interviewer) {
      return NextResponse.json({ error: 'Invalid interviewer selection' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // ── Domain pack: Pro-only gate ────────────────────────────────────────────
    if (domainPackId) {
      const { data: profile } = await serviceClient
        .from('users')
        .select('plan_tier')
        .eq('id', user.id)
        .single();

      const tier = profile?.plan_tier ?? 'free';
      if (tier !== 'pro' && tier !== 'campus') {
        return NextResponse.json(
          { error: 'Domain packs are a Pro feature. Please upgrade your plan.' },
          { status: 403 }
        );
      }
    }

    // ── Step 2: Fetch resume (verify ownership + parsed status) ───────────────
    const { data: resume } = await serviceClient
      .from('resumes')
      .select('id, user_id, parsed_data, status')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!resume || resume.status !== 'parsed') {
      return NextResponse.json(
        { error: 'Resume is not ready yet. Please wait for parsing to complete.' },
        { status: 409 }
      );
    }

    // ── Step 3: Resolve question payload BEFORE any state mutation ────────────
    // Credit deduction + interview INSERT are deferred until questions are in
    // hand. That eliminates orphan interview rows + credit-refund churn when
    // AI fails, and keeps the user uncharged on slow/failed generation paths.
    // `order_index` is computed now; `interview_id` is filled in after the
    // interview row is created below.
    type QuestionPayload = {
      order_index: number;
      question_text: string;
      rubric: unknown;
      category: string;
    };
    let resolvedQuestions: QuestionPayload[];

    if (domainPackId) {
      // ── Domain pack path: fetch questions from DB ─────────────────────────
      const { data: packQuestions, error: packError } = await serviceClient
        .from('domain_pack_questions')
        .select('id, question_text, rubric, category, difficulty')
        .eq('pack_id', domainPackId)
        .order('id'); // stable ordering for shuffle

      if (packError || !packQuestions || packQuestions.length === 0) {
        return NextResponse.json({ error: 'Domain pack not found or empty.' }, { status: 404 });
      }

      const shuffled = packQuestions
        .map((q) => ({ q, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ q }) => q);

      resolvedQuestions = shuffled.slice(0, questionCount).map((q, idx) => ({
        order_index: idx,
        question_text: q.question_text as string,
        rubric: q.rubric,
        category: q.category as string,
      }));
    } else {
      // ── AI path: generate questions via GPT (with Redis cache) ───────────
      const parsedResume = resume.parsed_data as ParsedResume;
      const cacheKey = buildCacheKey(role, difficulty, parsedResume, cacheSession);
      const cached = await getCachedQuestions(cacheKey);

      if (cached) {
        const shuffled = cached
          .map((q) => ({ q, sort: Math.random() }))
          .sort((a, b) => a.sort - b.sort)
          .map(({ q }) => q);

        resolvedQuestions = shuffled.slice(0, questionCount).map((q, idx) => ({
          order_index: idx,
          question_text: q.question_text,
          rubric: q.rubric,
          category: q.category as QuestionCategory,
        }));
      } else {
        // ── LLM cost guard: only runs on real AI calls, not cache hits ─────
        const { data: userProfile } = await serviceClient
          .from('users')
          .select('plan_tier')
          .eq('id', user.id)
          .single();
        const planTier = (userProfile?.plan_tier as string | undefined) ?? 'free';
        const qGenCost = estimateLLMCallCostUSD('question_generation');
        const qGenCostGuard = await checkLLMCostGuard(user.id, planTier, qGenCost, 'question_generation');
        if (!qGenCostGuard.allowed) {
          return NextResponse.json(
            { error: 'Monthly AI usage limit reached. Please upgrade your plan or try again next month.' },
            { status: 429 },
          );
        }

        let generatedQuestions: Awaited<ReturnType<typeof generateQuestions>>;
        try {
          generatedQuestions = await generateQuestions({
            parsedResume,
            role,
            difficulty,
            questionCount,
            goal,
            interviewMode,
            experienceYears,
            interviewerId,
            jobDescription,
            userId: user.id,
            // Pass tier from the cacheSession block — avoids a second
            // getUserProgress lookup inside generate-questions.
            userTier: userTier as 1 | 2 | 3 | 4,
          });
        } catch (err) {
          if (err instanceof QuestionGenerationError) {
            return NextResponse.json({ error: err.message }, { status: 500 });
          }
          return NextResponse.json(
            { error: 'Failed to generate questions. Please try again.' },
            { status: 500 }
          );
        }

        void recordLLMSpend(user.id, qGenCost);

        void setCachedQuestions(
          cacheKey,
          generatedQuestions.questions.map((q) => ({
            order: q.order,
            question_text: q.question_text,
            category: q.category,
            rubric: q.rubric,
          }))
        );

        resolvedQuestions = generatedQuestions.questions.map((q) => ({
          order_index: q.order,
          question_text: q.question_text,
          rubric: q.rubric,
          category: q.category as QuestionCategory,
        }));
      }
    }

    // ── Step 4: Deduct 1 credit (atomic RPC) ──────────────────────────────────
    // Now that questions are resolved, charge the user. Failure here means the
    // user can't start — no orphan state to clean up because we haven't
    // mutated anything yet.
    const creditResult = await checkAndDeductCredit(user.id);
    if (!creditResult.success) {
      return NextResponse.json(
        { error: 'no_credits', upgradeUrl: '/upgrade' },
        { status: 402 }
      );
    }

    // ── Step 5: Create interview record ───────────────────────────────────────
    const { data: interview, error: interviewError } = await serviceClient
      .from('interviews')
      .insert({
        user_id: user.id,
        resume_id: resumeId,
        role,
        difficulty,
        interviewer_id: interviewer.id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        question_count: questionCount,
        session_context: sessionContext,
      })
      .select('id')
      .single();

    if (interviewError || !interview) {
      await refundCredit(user.id);
      console.error('[interview/start] DB insert error:', interviewError);
      return NextResponse.json({ error: 'Failed to create interview record' }, { status: 500 });
    }

    // ── Step 6: Insert questions (fill in interview_id) ───────────────────────
    const questionsToInsert = resolvedQuestions.map((q) => ({
      interview_id: interview.id,
      ...q,
    }));

    const { data: insertedQuestions, error: questionsError } = await serviceClient
      .from('questions')
      .insert(questionsToInsert)
      .select('id, interview_id, order_index, question_text, rubric, category');

    if (questionsError || !insertedQuestions) {
      await refundCredit(user.id);
      await serviceClient.from('interviews').delete().eq('id', interview.id);
      console.error('[interview/start] Questions insert error:', questionsError);
      return NextResponse.json({ error: 'Failed to save questions' }, { status: 500 });
    }

    // ── Step 7: Return ────────────────────────────────────────────────────────
    return NextResponse.json({
      interviewId: interview.id,
      questions: insertedQuestions,
      creditsRemaining: creditResult.remaining,
    });
  } catch (err) {
    console.error('[interview/start] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
