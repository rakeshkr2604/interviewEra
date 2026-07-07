/**
 * FM-5 backfill: re-evaluate answers saved during a Redis outage.
 *
 * /api/interview/answer degrades on a rate-limiter (Redis) outage: it saves
 * the answer with evaluation_status='pending_backfill' and skips the LLM
 * evaluation (no rate limiting and no Redis-backed cost guard can run during
 * the outage). This script completes those evaluations once Redis is healthy.
 *
 * Per pending answer:
 *   1. If a VALID evaluation row already exists (a previous run inserted it
 *      but crashed before the status flip), just flip evaluation_status —
 *      never a duplicate LLM call.
 *   2. Otherwise run the same evaluateAnswer() the live route uses, insert the
 *      evaluation, then flip evaluation_status='evaluated'.
 *   3. Blank answer_text is never evaluated (a technical failure must not be
 *      scored as if it were candidate speech) — logged and left pending for
 *      human review.
 *
 * SAFETY / IDEMPOTENCY:
 *   - Dry-run by default: prints the plan, mutates nothing, calls no LLM.
 *   - Pass --apply to execute. Re-running after --apply is a no-op (only
 *     pending rows are selected; existing evaluations are reused, not redone).
 *   - Probes Redis first: if it is still down, new submissions are still being
 *     marked pending, so the run aborts unless --force is passed.
 *   - Reports whose interviews already completed keep their stored overall
 *     score (the report is an immutable snapshot); the per-question breakdown
 *     reads evaluations live, so backfilled scores appear there automatically.
 *
 * Usage:
 *   npx tsx scripts/backfill-pending-evaluations.ts              # dry-run
 *   npx tsx scripts/backfill-pending-evaluations.ts --apply      # execute
 *   npx tsx scripts/backfill-pending-evaluations.ts --apply --force  # skip Redis probe
 *
 * Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   OPENROUTER_API_KEY (evaluation chain),
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (health probe).
 */
import { createClient } from '@supabase/supabase-js';
import { evaluateAnswer } from '../src/lib/openai/evaluate-answer';
import { isValidPersistedEvaluation } from '../src/lib/evaluation/evaluation-validity';
import { estimateLLMCallCostUSD, recordLLMSpend } from '../src/lib/ai/llm-cost-guard';
import getRedis from '../src/lib/redis/client';
import type { QuestionRubric } from '../src/types/app.types';

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function redisHealthy(): Promise<boolean> {
  try {
    const redis = getRedis();
    await redis.incr('backfill:health-probe');
    return true;
  } catch (err) {
    console.warn('[backfill] Redis health probe failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

type PendingAnswer = {
  id: string;
  question_id: string;
  answer_text: string | null;
};

async function main(): Promise<void> {
  console.log(
    APPLY
      ? '*** APPLY MODE — evaluations WILL be generated and written ***'
      : '--- DRY RUN — no writes, no LLM calls (pass --apply to execute) ---',
  );

  if (APPLY && !FORCE) {
    const healthy = await redisHealthy();
    if (!healthy) {
      console.error(
        '[backfill] Redis is still unavailable — new submissions are still being marked ' +
          'pending_backfill. Re-run when Redis is healthy, or pass --force to proceed anyway.',
      );
      process.exit(1);
    }
    console.log('[backfill] Redis healthy — proceeding.');
  }

  const db = svc();

  const { data: pending, error: pendingErr } = await db
    .from('answers')
    .select('id, question_id, answer_text')
    .eq('evaluation_status', 'pending_backfill')
    .order('submitted_at', { ascending: true });
  if (pendingErr) throw new Error(`read pending answers: ${pendingErr.message}`);

  const rows = (pending ?? []) as PendingAnswer[];
  console.log(`Pending-backfill answers: ${rows.length}`);
  if (rows.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  let evaluated = 0;
  let repaired = 0;
  let skippedEmpty = 0;
  let failed = 0;

  for (const answer of rows) {
    const label = `answer ${answer.id}`;

    const text = (answer.answer_text ?? '').trim();
    if (!text) {
      // Never score a technical failure as if it were candidate speech.
      skippedEmpty++;
      console.warn(`  [skip] ${label}: empty answer_text — left pending for human review.`);
      continue;
    }

    // Idempotency: reuse an existing valid evaluation (partial previous run).
    const { data: existingEval, error: evalReadErr } = await db
      .from('evaluations')
      .select('id, overall_score, dimension_scores')
      .eq('answer_id', answer.id)
      .maybeSingle();
    if (evalReadErr) {
      failed++;
      console.error(`  [fail] ${label}: read evaluation — ${evalReadErr.message}`);
      continue;
    }

    if (
      existingEval &&
      isValidPersistedEvaluation({
        overall_score: existingEval.overall_score,
        dimension_scores: existingEval.dimension_scores,
      })
    ) {
      repaired++;
      console.log(`  ${label}: valid evaluation already exists → flip status only.`);
      if (APPLY) {
        const { error: flipErr } = await db
          .from('answers')
          .update({ evaluation_status: 'evaluated' })
          .eq('id', answer.id);
        if (flipErr) {
          failed++;
          console.error(`    [fail] status flip: ${flipErr.message}`);
        }
      }
      continue;
    }

    const { data: question, error: qErr } = await db
      .from('questions')
      .select('id, question_text, rubric, interview_id')
      .eq('id', answer.question_id)
      .maybeSingle();
    if (qErr || !question) {
      failed++;
      console.error(`  [fail] ${label}: question ${answer.question_id} not found${qErr ? ` — ${qErr.message}` : ''}.`);
      continue;
    }

    console.log(`  ${label}: needs evaluation (question ${question.id}).`);
    if (!APPLY) {
      evaluated++;
      continue;
    }

    try {
      const result = await evaluateAnswer({
        questionText: question.question_text as string,
        rubric: question.rubric as QuestionRubric,
        answerText: text,
      });

      const { error: insertErr } = await db.from('evaluations').insert({
        answer_id: answer.id,
        overall_score: result.overall_score,
        dimension_scores: result.dimension_scores,
        feedback_text: result.feedback_text,
        detailed_analysis: result.detailed_analysis,
      });
      if (insertErr) {
        failed++;
        console.error(`    [fail] evaluation insert: ${insertErr.message}`);
        continue;
      }

      const { error: flipErr } = await db
        .from('answers')
        .update({ evaluation_status: 'evaluated' })
        .eq('id', answer.id);
      if (flipErr) {
        // Evaluation persisted — the next run repairs the status without a
        // duplicate LLM call (see idempotency branch above).
        console.error(`    [warn] evaluation saved but status flip failed: ${flipErr.message} — re-run to repair.`);
      }

      // Best-effort spend accounting against the interview owner's monthly cap.
      try {
        const { data: interview } = await db
          .from('interviews')
          .select('user_id')
          .eq('id', question.interview_id as string)
          .maybeSingle();
        if (interview?.user_id) {
          await recordLLMSpend(interview.user_id as string, estimateLLMCallCostUSD('answer_evaluation'));
        }
      } catch {
        /* spend accounting is best-effort — never blocks the backfill */
      }

      evaluated++;
      console.log(`    evaluated: score ${result.overall_score} (provider ${result.provider}).`);
    } catch (err) {
      failed++;
      console.error(`    [fail] evaluateAnswer threw: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(
    `\nDone. ${APPLY ? '' : '(dry-run) '}evaluated=${evaluated} repaired=${repaired} ` +
      `skipped_empty=${skippedEmpty} failed=${failed}`,
  );
  if (failed > 0) process.exit(1);
}

void main().catch((err) => {
  console.error('[backfill] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
