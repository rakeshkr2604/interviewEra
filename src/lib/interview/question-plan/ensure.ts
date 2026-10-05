import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScriptType } from '@/lib/ai/scripts/script-loader';
import { estimateLLMCallCostUSD, reserveLLMCost } from '@/lib/ai/llm-cost-guard';
import { extractResumeProjectHints } from '@/lib/interview/question-gen-input';
import type { ParsedResume } from '@/types/app.types';
import { generateCandidatePool } from './generate-pool';
import { logQuestionPlan } from './log';
import {
  isIncompleteUnaskedPlan,
  loadQuestionPlan,
  loadRecentCoreQuestionTexts,
  persistQuestionPlan,
  QuestionPlanSchemaUnavailable,
  rewriteEarlierReservations,
  setQuestionPlanStatus,
} from './persist';
import { assembleQuestionPlan } from './select';
import type { PlannedCoreQuestion, QuestionPlanContext } from './types';

export function questionPlanContext(opts: {
  role: string;
  parsedResume: ParsedResume | null;
  jobDescription?: string;
}): QuestionPlanContext {
  const skills = opts.parsedResume?.skills?.map((skill) => skill.trim()).filter(Boolean) ?? [];
  const projects = opts.parsedResume ? extractResumeProjectHints(opts.parsedResume, 4) : [];
  return {
    role: opts.role,
    skills: skills.slice(0, 8),
    projects,
    jobDescription: opts.jobDescription?.trim() || undefined,
  };
}

export async function ensureInterviewQuestionPlan(
  client: SupabaseClient,
  opts: {
    interviewId: string;
    userId: string;
    role: string;
    difficulty: 'easy' | 'medium' | 'hard';
    questionCount: number;
    scriptType: ScriptType;
    goal: string;
    interviewMode: string;
    experienceYears: number;
    jobDescription?: string;
    parsedResume: ParsedResume | null;
  },
): Promise<PlannedCoreQuestion[]> {
  const started = Date.now();
  const context = questionPlanContext({
    role: opts.role,
    parsedResume: opts.parsedResume,
    jobDescription: opts.jobDescription,
  });
  try {
    const existing = await loadQuestionPlan(client, opts.interviewId);
    if (existing.length > 0 && !isIncompleteUnaskedPlan(existing, opts.questionCount)) {
      await setQuestionPlanStatus(client, opts.interviewId, 'ready');
      return existing;
    }

    const { recent, userHistory, reserved } = await loadRecentCoreQuestionTexts(client, {
      interviewId: opts.interviewId,
      userId: opts.userId,
    });

    const { data: userRow } = await client
      .from('users')
      .select('plan_tier')
      .eq('id', opts.userId)
      .maybeSingle();
    const planTier = typeof userRow?.plan_tier === 'string' ? userRow.plan_tier : 'free';
    const reservation = await reserveLLMCost(
      opts.userId,
      planTier,
      estimateLLMCallCostUSD('script_question_plan'),
      'script_question_plan',
      { failClosed: false },
    );

    let candidates: Awaited<ReturnType<typeof generateCandidatePool>> = [];
    const llmStarted = Date.now();
    if (reservation.ok) {
      try {
        candidates = await generateCandidatePool({
          required: opts.questionCount,
          role: opts.role,
          difficulty: opts.difficulty,
          interviewMode: opts.interviewMode,
          experienceYears: opts.experienceYears,
          goal: opts.goal,
          scriptType: opts.scriptType,
          parsedResume: opts.parsedResume,
          context,
          recentQuestions: recent,
        });
      } catch (err) {
        await reservation.release();
        logQuestionPlan(opts.interviewId, {
          event: 'question_plan_generation_failed',
          rejectionReason: 'generation_failed',
          source: 'resume_fallback',
          latencyMs: Date.now() - llmStarted,
        });
        console.error('[question-plan] generation failed', {
          interviewId: opts.interviewId,
          message: err instanceof Error ? err.message : 'unknown',
        });
      }
    } else {
      logQuestionPlan(opts.interviewId, {
        event: 'question_plan_generation_failed',
        rejectionReason: 'llm_cost_blocked',
        source: 'resume_fallback',
      });
    }
    const llmMs = Date.now() - llmStarted;

    const missing = Math.max(1, opts.questionCount - existing.length);
    const assembled = assembleQuestionPlan({
      candidates,
      required: existing.length > 0 ? missing : opts.questionCount,
      scriptType: opts.scriptType,
      difficulty: opts.difficulty,
      interviewMode: opts.interviewMode,
      context,
      recentQuestions: recent,
      userHistory,
      reservedQuestions: reserved,
      rejected: existing.map((question) => question.questionText),
      orderOffset: existing.length,
    });

    for (const event of assembled.events) {
      logQuestionPlan(opts.interviewId, event);
    }

    const extras = assembled.questions;

    const persistStarted = Date.now();
    const stored = await persistQuestionPlan(client, opts.interviewId, extras);
    const reconciled = await rewriteEarlierReservations(client, opts.interviewId, context);
    const persistMs = Date.now() - persistStarted;
    await setQuestionPlanStatus(client, opts.interviewId, 'ready');
    const totalMs = Date.now() - started;
    logQuestionPlan(opts.interviewId, {
      event: 'question_plan_persisted',
      questionNumber: reconciled.length,
      planStatus: 'planned',
      rejectionReason: `sources=${reconciled.map((q) => q.source).join(',')}`,
      latencyMs: totalMs,
      timings: {
        poolMs: llmMs,
        llmMs,
        duplicateFilterMs: assembled.duplicateFilterMs,
        noveltyMs: assembled.noveltyMs,
        persistMs,
        totalMs,
      },
    });
    return reconciled.length > 0 ? reconciled : stored;
  } catch (err) {
    const reason = err instanceof QuestionPlanSchemaUnavailable ? 'schema_unavailable' : 'persist_failed';
    logQuestionPlan(opts.interviewId, {
      event: 'question_plan_generation_failed',
      rejectionReason: reason,
      source: 'resume_fallback',
      latencyMs: Date.now() - started,
    });
    console.error('[question-plan] ensure failed', {
      interviewId: opts.interviewId,
      reason,
      message: err instanceof Error ? err.message : 'unknown',
    });
    const fallback = assembleQuestionPlan({
      candidates: [],
      required: opts.questionCount,
      scriptType: opts.scriptType,
      difficulty: opts.difficulty,
      interviewMode: opts.interviewMode,
      context,
    });
    return fallback.questions;
  }
}
