/**
 * One-off reconciliation for the completion-pipeline investigation (P5).
 *
 * Repairs two classes of historical divergence WITHOUT inventing data:
 *
 *   A) Stale user_progress roll-ups (root-cause F3). Retention partial writes
 *      (session_quality_log inserted, user_progress roll-up never landed) left
 *      total_sessions / averages / max-dimension permanently wrong. This
 *      recomputes those four roll-up fields from the DURABLE session_quality_log
 *      rows only — the exact same `summarize()` the runtime uses. It does NOT
 *      backfill synthetic session_quality_log rows, and it does NOT touch
 *      tier / streak / XP (not reconstructable from the log alone).
 *
 *   B) The zombie interview 54b8412e-56b9-4fbd-b9ac-805d27980284 (root-cause F2):
 *      status='completed' with 0 answers and no report. Flipped to 'abandoned'
 *      ONLY if it still has 0 answers and no report at run time (re-verified,
 *      never assumed).
 *
 * SAFETY:
 *   - Dry-run by default. Prints every planned change and mutates nothing.
 *   - Pass --apply to execute. Idempotent: re-running after --apply is a no-op.
 *   - Reads SUPABASE credentials from env (service role). Never commit those.
 *
 * Usage:
 *   npx tsx scripts/reconcile-completion-pipeline.ts              # dry-run
 *   npx tsx scripts/reconcile-completion-pipeline.ts --apply      # execute
 *
 * Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import { summarize } from '../src/lib/retention/scoring';
import type { SessionQualityRow } from '../src/lib/retention/types';

const ZOMBIE_INTERVIEW_ID = '54b8412e-56b9-4fbd-b9ac-805d27980284';

const APPLY = process.argv.includes('--apply');

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

type ProgressRow = {
  user_id: string;
  total_sessions: number | null;
  overall_avg_score: number | null;
  last_5_sessions_avg: number | null;
  max_dimension_score: number | null;
};

function numChanged(a: number | null, b: number | null): boolean {
  // Treat null and undefined the same; compare numbers with a tiny epsilon so a
  // NUMERIC(4,2) round-trip doesn't register as a spurious change.
  if (a === null && b === null) return false;
  if (a === null || b === null) return true;
  return Math.abs(a - b) > 0.005;
}

// ── Part A — recompute user_progress roll-ups from existing session_quality_log ──
async function reconcileProgressRollups(
  db: ReturnType<typeof createClient>,
): Promise<void> {
  console.log('\n=== Part A: user_progress roll-up reconciliation ===');

  // Every user who has at least one durable quality-log row is a candidate: only
  // those have roll-ups that can meaningfully diverge from the log.
  const { data: logUsers, error: luErr } = await db
    .from('session_quality_log')
    .select('user_id');
  if (luErr) throw new Error(`read session_quality_log user_ids: ${luErr.message}`);

  const userIds = [...new Set((logUsers ?? []).map((r) => r.user_id as string))];
  console.log(`Users with >=1 session_quality_log row: ${userIds.length}`);

  let changed = 0;
  for (const userId of userIds) {
    const { data: rows, error: rErr } = await db
      .from('session_quality_log')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });
    if (rErr) {
      console.warn(`  [skip] ${userId}: read logs failed — ${rErr.message}`);
      continue;
    }

    const summary = summarize((rows ?? []) as SessionQualityRow[]);

    const { data: progress, error: pErr } = await db
      .from('user_progress')
      .select('user_id, total_sessions, overall_avg_score, last_5_sessions_avg, max_dimension_score')
      .eq('user_id', userId)
      .maybeSingle();
    if (pErr) {
      console.warn(`  [skip] ${userId}: read user_progress failed — ${pErr.message}`);
      continue;
    }
    if (!progress) {
      console.warn(`  [skip] ${userId}: no user_progress row (bootstrap trigger missing?)`);
      continue;
    }

    const cur = progress as ProgressRow;
    const diverged =
      (cur.total_sessions ?? 0) !== summary.totalSessions ||
      numChanged(cur.overall_avg_score, summary.overallAvg) ||
      numChanged(cur.last_5_sessions_avg, summary.last5Avg) ||
      numChanged(cur.max_dimension_score, summary.maxDimensionScoreLifetime);

    if (!diverged) continue;
    changed++;

    console.log(
      `  ${userId}: total_sessions ${cur.total_sessions} -> ${summary.totalSessions}; ` +
        `overall_avg ${cur.overall_avg_score} -> ${summary.overallAvg}; ` +
        `last5 ${cur.last_5_sessions_avg} -> ${summary.last5Avg}; ` +
        `maxDim ${cur.max_dimension_score} -> ${summary.maxDimensionScoreLifetime}`,
    );

    if (APPLY) {
      const { error: upErr } = await db
        .from('user_progress')
        .update({
          total_sessions: summary.totalSessions,
          overall_avg_score: summary.overallAvg,
          last_5_sessions_avg: summary.last5Avg,
          max_dimension_score: summary.maxDimensionScoreLifetime,
        })
        .eq('user_id', userId);
      if (upErr) console.error(`    [FAIL] update ${userId}: ${upErr.message}`);
    }
  }

  console.log(`Part A: ${changed} user_progress row(s) ${APPLY ? 'updated' : 'would change'}.`);

  // Informational only: completed interviews with no quality log. NOT auto-fixed
  // — synthesizing logs is explicitly out of scope. Surface the count so the
  // divergence is visible and can be a product decision later.
  const { data: completed } = await db
    .from('interviews')
    .select('id')
    .eq('status', 'completed');
  const completedIds = (completed ?? []).map((r) => r.id as string);
  let missingLog = 0;
  for (const id of completedIds) {
    const { data: log } = await db
      .from('session_quality_log')
      .select('id')
      .eq('interview_id', id)
      .maybeSingle();
    if (!log) missingLog++;
  }
  console.log(
    `Part A (info): ${missingLog}/${completedIds.length} completed interviews have NO ` +
      `session_quality_log — left as-is (no synthetic backfill).`,
  );
}

// ── Part B — flip the verified zombie interview to abandoned ──
async function reconcileZombie(db: ReturnType<typeof createClient>): Promise<void> {
  console.log('\n=== Part B: zombie interview reconciliation ===');

  const { data: interview, error: iErr } = await db
    .from('interviews')
    .select('id, status')
    .eq('id', ZOMBIE_INTERVIEW_ID)
    .maybeSingle();
  if (iErr) throw new Error(`read zombie interview: ${iErr.message}`);
  if (!interview) {
    console.log(`  ${ZOMBIE_INTERVIEW_ID}: not found — nothing to do.`);
    return;
  }

  // Re-verify the pre-conditions at run time — never assume the snapshot.
  const { data: questions } = await db
    .from('questions')
    .select('id')
    .eq('interview_id', ZOMBIE_INTERVIEW_ID);
  const questionIds = (questions ?? []).map((q) => q.id as string);
  const { data: answers } =
    questionIds.length > 0
      ? await db.from('answers').select('id').in('question_id', questionIds)
      : { data: [] as { id: string }[] };
  const { data: report } = await db
    .from('reports')
    .select('id')
    .eq('interview_id', ZOMBIE_INTERVIEW_ID)
    .maybeSingle();

  const answerCount = answers?.length ?? 0;
  const hasReport = Boolean(report);

  console.log(
    `  ${ZOMBIE_INTERVIEW_ID}: status=${interview.status}, answers=${answerCount}, has_report=${hasReport}`,
  );

  if (interview.status !== 'completed') {
    console.log('  Skip: not in completed state (already reconciled or changed).');
    return;
  }
  if (answerCount > 0 || hasReport) {
    console.log('  Skip: has answers or a report — NOT a zombie, leaving untouched.');
    return;
  }

  console.log('  Plan: status completed -> abandoned (0 answers, no report).');
  if (APPLY) {
    const { error: upErr } = await db
      .from('interviews')
      .update({ status: 'abandoned' })
      .eq('id', ZOMBIE_INTERVIEW_ID)
      .eq('status', 'completed');
    if (upErr) console.error(`    [FAIL] flip zombie: ${upErr.message}`);
    else console.log('  Applied.');
  }
}

async function main(): Promise<void> {
  console.log(
    APPLY
      ? '*** APPLY MODE — mutations WILL be written ***'
      : '--- DRY RUN — no writes (pass --apply to execute) ---',
  );
  const db = svc();
  await reconcileProgressRollups(db);
  await reconcileZombie(db);
  console.log('\nDone.');
}

void main().catch((err) => {
  console.error('[reconcile] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
