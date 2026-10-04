/**
 * Build + persist a v2.1 script interview report from answer_evaluations.
 *
 * Concurrency: first caller claims via INSERT status='generating' (unique
 * interview_id). Losers wait for the claim to finish instead of dual LLM calls.
 */

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { completeInterviewChat } from '@/lib/ai/interview-completion';
import { reserveScriptLlmCost } from '@/lib/interview/script-llm-guards';
import { DIMENSION_KEYS, type DimensionKey } from '@/lib/interview/answer-score/rubric';
import {
  aggregateScriptAnswers,
  type AggregatedScriptReport,
  type PerQuestionReportRow,
  type ScoredAnswerInput,
} from '@/lib/interview/script-report/aggregate';
import {
  SCRIPT_REPORT_SYNTHESIS_VERSION,
  buildDeterministicSynthesis,
  buildScriptReportSynthesisRepairPrompt,
  buildScriptReportSynthesisSystemPrompt,
  buildScriptReportSynthesisUserPrompt,
  validateScriptReportSynthesis,
  type ScriptReportSynthesis,
} from '@/lib/interview/script-report/synthesis';
import { toSampleAnswerParagraphs } from '@/lib/interview/auto-structure/normalize';

const SYNTHESIS_TIMEOUT_MS = 22_000;
/** Stale generating claim — another request may take over. */
const GENERATING_STALE_MS = 90_000;
/** How long a concurrent waiter polls for the claim owner to finish. */
const WAIT_FOR_CLAIM_MS = 55_000;
const WAIT_POLL_MS = 750;

const dimensionStoredSchema = z.object({
  score: z.number(),
  note: z.string().optional(),
});

type EvalRow = {
  turn_index: number;
  question: string;
  transcript: string;
  question_type: 'technical' | 'behavioral';
  overall: number | string | null;
  dimensions: unknown;
  prompt_version: string;
  score_suspect: boolean | null;
  status: string;
  raw_model_output: string | null;
};

type TurnRow = {
  turn_index: number;
  structured_answer: unknown;
};

export type ScriptReportStatus =
  | 'generating'
  | 'ready'
  | 'partial'
  | 'insufficient_data'
  | 'failed';

export type ScriptInterviewReportRecord = {
  id: string;
  interview_id: string;
  overall: number | null;
  dimension_averages: Record<DimensionKey, number> | null;
  score_band: string | null;
  placement_signal: string | null;
  scored_answer_count: number;
  prompt_versions: string[];
  per_question: PerQuestionReportRow[];
  synthesis: ScriptReportSynthesis | null;
  synthesis_model: string | null;
  synthesis_prompt_version: string | null;
  status: ScriptReportStatus;
  generated_at: string;
  updated_at?: string;
};

const TERMINAL_STATUSES = new Set<ScriptReportStatus>([
  'ready',
  'partial',
  'insufficient_data',
  'failed',
]);

function parseOneLineSummary(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const first = raw.split('\n---RETRY---\n')[0] ?? raw;
    const start = first.indexOf('{');
    const end = first.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    const parsed = JSON.parse(first.slice(start, end + 1)) as { one_line_summary?: unknown };
    return typeof parsed.one_line_summary === 'string' ? parsed.one_line_summary : null;
  } catch {
    return null;
  }
}

function extractModelAnswerLines(structured: unknown): string[] {
  if (!structured || typeof structured !== 'object') return [];
  const coaching = (structured as { coaching_reference?: { restructured_example?: unknown } })
    .coaching_reference;
  const lines = coaching?.restructured_example;
  if (!Array.isArray(lines)) return [];
  return toSampleAnswerParagraphs(
    lines.filter((l): l is string => typeof l === 'string'),
  ).slice(0, 6);
}

function parseDimensions(
  raw: unknown,
): Record<DimensionKey, { score: number; note?: string }> | null {
  if (!raw || typeof raw !== 'object') return null;
  const out = {} as Record<DimensionKey, { score: number; note?: string }>;
  for (const key of DIMENSION_KEYS) {
    const parsed = dimensionStoredSchema.safeParse((raw as Record<string, unknown>)[key]);
    if (!parsed.success) return null;
    out[key] = parsed.data;
  }
  return out;
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

function mapRow(existing: Record<string, unknown>): ScriptInterviewReportRecord {
  const synthesis = (existing.synthesis as (ScriptReportSynthesis & {
    meta?: { synthesis_version?: string };
  }) | null) ?? null;
  const metaVersion = synthesis?.meta?.synthesis_version ?? null;

  return {
    id: String(existing.id),
    interview_id: String(existing.interview_id),
    overall: existing.overall == null ? null : Number(existing.overall),
    dimension_averages: (existing.dimension_averages as Record<DimensionKey, number> | null) ?? null,
    score_band: (existing.score_band as string | null) ?? null,
    placement_signal: (existing.placement_signal as string | null) ?? null,
    scored_answer_count: Number(existing.scored_answer_count ?? 0),
    prompt_versions: (existing.prompt_versions as string[]) ?? [],
    per_question: (existing.per_question ?? []) as PerQuestionReportRow[],
    synthesis,
    synthesis_model: (existing.synthesis_model as string | null) ?? null,
    synthesis_prompt_version:
      (existing.synthesis_prompt_version as string | null) ?? metaVersion,
    status: existing.status as ScriptReportStatus,
    generated_at: String(existing.generated_at ?? new Date().toISOString()),
    updated_at: existing.updated_at ? String(existing.updated_at) : undefined,
  };
}

const SELECT_COLS =
  'id, interview_id, overall, dimension_averages, score_band, placement_signal, scored_answer_count, prompt_versions, per_question, synthesis, synthesis_model, synthesis_prompt_version, status, generated_at, updated_at';

const SELECT_COLS_LEGACY =
  'id, interview_id, overall, dimension_averages, score_band, placement_signal, scored_answer_count, prompt_versions, per_question, synthesis, synthesis_model, status, generated_at, updated_at';

function isMissingSynthVersionColumn(error: { message?: string } | null | undefined): boolean {
  return Boolean(error?.message?.includes('synthesis_prompt_version'));
}

async function fetchReportRow(
  serviceClient: SupabaseClient,
  interviewId: string,
): Promise<ScriptInterviewReportRecord | null> {
  const primary = await serviceClient
    .from('script_interview_reports')
    .select(SELECT_COLS)
    .eq('interview_id', interviewId)
    .maybeSingle();

  if (!primary.error && primary.data) return mapRow(primary.data);

  if (isMissingSynthVersionColumn(primary.error)) {
    const legacy = await serviceClient
      .from('script_interview_reports')
      .select(SELECT_COLS_LEGACY)
      .eq('interview_id', interviewId)
      .maybeSingle();
    return legacy.data ? mapRow(legacy.data) : null;
  }

  return null;
}

async function upsertReportRow(
  serviceClient: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }> {
  const first = await serviceClient
    .from('script_interview_reports')
    .upsert(payload, { onConflict: 'interview_id' })
    .select(SELECT_COLS)
    .single();

  if (!first.error) return { data: first.data as Record<string, unknown>, error: null };

  if (isMissingSynthVersionColumn(first.error)) {
    console.warn(
      '[script-report] synthesis_prompt_version column missing — apply migration 20260717000004; version still stored in synthesis.meta.synthesis_version',
    );
    const { synthesis_prompt_version: _drop, ...rest } = payload;
    const retry = await serviceClient
      .from('script_interview_reports')
      .upsert(rest, { onConflict: 'interview_id' })
      .select(SELECT_COLS_LEGACY)
      .single();
    return {
      data: (retry.data as Record<string, unknown> | null) ?? null,
      error: retry.error,
    };
  }

  return { data: (first.data as Record<string, unknown> | null) ?? null, error: first.error };
}

function isGeneratingFresh(row: ScriptInterviewReportRecord): boolean {
  if (row.status !== 'generating') return false;
  const ts = Date.parse(row.updated_at ?? row.generated_at);
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts < GENERATING_STALE_MS;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Wait for another claim owner's generation to finish.
 * Returns the terminal row, or null if still generating after timeout.
 */
export async function waitForReportReady(
  serviceClient: SupabaseClient,
  interviewId: string,
  timeoutMs = WAIT_FOR_CLAIM_MS,
): Promise<ScriptInterviewReportRecord | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await fetchReportRow(serviceClient, interviewId);
    if (row && TERMINAL_STATUSES.has(row.status)) return row;
    await sleep(WAIT_POLL_MS);
  }
  return fetchReportRow(serviceClient, interviewId);
}

/**
 * Try to claim generation. Returns:
 * - claimed: true → this caller must generate
 * - claimed: false + report terminal → return that report
 * - claimed: false + pending → wait for owner
 */
export async function claimReportGeneration(args: {
  serviceClient: SupabaseClient;
  interviewId: string;
  userId: string;
  forceRegenerate?: boolean;
}): Promise<
  | { claimed: true }
  | { claimed: false; pending: true }
  | { claimed: false; pending: false; report: ScriptInterviewReportRecord }
> {
  const { serviceClient, interviewId, userId, forceRegenerate = false } = args;

  if (!forceRegenerate) {
    const existing = await fetchReportRow(serviceClient, interviewId);
    if (existing) {
      if (TERMINAL_STATUSES.has(existing.status)) {
        return { claimed: false, pending: false, report: existing };
      }
      if (isGeneratingFresh(existing)) {
        return { claimed: false, pending: true };
      }
      // Stale generating — take over below.
    }
  }

  const claimPayload = {
    interview_id: interviewId,
    user_id: userId,
    status: 'generating' as const,
    scored_answer_count: 0,
    prompt_versions: [] as string[],
    overall: null,
    dimension_averages: null,
    score_band: null,
    placement_signal: null,
    per_question: [],
    synthesis: null,
    synthesis_model: null,
    synthesis_prompt_version: null,
    synthesis_raw: null,
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (forceRegenerate) {
    const { error: upsertError } = await serviceClient
      .from('script_interview_reports')
      .upsert(claimPayload, { onConflict: 'interview_id' });
    if (upsertError) {
      if (isMissingSynthVersionColumn(upsertError)) {
        const { synthesis_prompt_version: _drop, ...rest } = claimPayload;
        const retry = await serviceClient
          .from('script_interview_reports')
          .upsert(rest, { onConflict: 'interview_id' });
        if (!retry.error) return { claimed: true };
      }
      console.error('[script-report] force claim upsert failed:', upsertError);
      // Proceed without claim — better a dual call than a hard fail on View Report.
      return { claimed: true };
    }
    return { claimed: true };
  }

  const { error: insertError } = await serviceClient
    .from('script_interview_reports')
    .insert(claimPayload);

  if (!insertError) {
    return { claimed: true };
  }

  // Unique conflict — someone else has a row.
  const existing = await fetchReportRow(serviceClient, interviewId);
  if (!existing) {
    return { claimed: true };
  }
  if (TERMINAL_STATUSES.has(existing.status)) {
    return { claimed: false, pending: false, report: existing };
  }
  if (isGeneratingFresh(existing)) {
    return { claimed: false, pending: true };
  }

  // Stale generating: atomic take-over.
  const { data: taken, error: takeError } = await serviceClient
    .from('script_interview_reports')
    .update({
      status: 'generating',
      updated_at: new Date().toISOString(),
      user_id: userId,
    })
    .eq('interview_id', interviewId)
    .eq('status', 'generating')
    .select('id')
    .maybeSingle();

  if (takeError) {
    console.warn('[script-report] stale claim take-over failed:', takeError);
  }
  if (taken) {
    return { claimed: true };
  }

  // Lost race to another take-over.
  return { claimed: false, pending: true };
}

/** Raised when in-route monthly LLM cost reserve denies report synthesis. */
export class ScriptLlmCostGuardError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ScriptLlmCostGuardError';
    this.status = status;
    this.code = code;
  }
}

/** Test/prod hook: force synthesis LLM path to fail → deterministic fallback. */
export function shouldForceSynthesisFailure(): boolean {
  return process.env.SCRIPT_REPORT_FORCE_SYNTHESIS_FAIL === '1';
}

async function runSynthesis(args: {
  targetRole: string;
  scriptType: string | null;
  aggregate: Extract<AggregatedScriptReport, { kind: 'scored' }>;
  interviewId?: string;
  userId?: string;
}): Promise<{
  synthesis: ScriptReportSynthesis;
  model: string | null;
  usedLlm: boolean;
  raw: string | null;
  coercions: string[];
}> {
  if (shouldForceSynthesisFailure()) {
    console.warn('[script-report] SCRIPT_REPORT_FORCE_SYNTHESIS_FAIL=1 — using deterministic fallback');
    return {
      synthesis: buildDeterministicSynthesis(args.aggregate),
      model: null,
      usedLlm: false,
      raw: null,
      coercions: [],
    };
  }

  const missingModelAnswerTurnIndexes = args.aggregate.perQuestion
    .filter((q) => q.modelAnswerLines.length === 0)
    .map((q) => q.turnIndex);

  const systemPrompt = buildScriptReportSynthesisSystemPrompt();
  const userPrompt = buildScriptReportSynthesisUserPrompt({
    ...args,
    missingModelAnswerTurnIndexes,
  });

  const rawOutputs: string[] = [];
  let lastErrors: string[] = [];
  let modelUsed: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
    if (attempt === 1) {
      messages.push(
        { role: 'assistant', content: rawOutputs[0] ?? '' },
        { role: 'user', content: buildScriptReportSynthesisRepairPrompt(lastErrors) },
      );
    }

    try {
      const completion = await completeInterviewChat({
        messages,
        temperature: 0.3,
        operation: 'script_report_synthesis',
        jsonMode: true,
        signal: AbortSignal.timeout(SYNTHESIS_TIMEOUT_MS),
        interviewId: args.interviewId,
        userId: args.userId,
      });
      modelUsed = completion.model;
      rawOutputs.push(completion.content);
      const parsed = parseLlmJson(completion.content);
      const validated = validateScriptReportSynthesis(parsed);
      if (validated.ok) {
        return {
          synthesis: validated.value,
          model: modelUsed,
          usedLlm: true,
          raw: completion.content,
          coercions: validated.coercions,
        };
      }
      lastErrors = validated.errors;
      console.warn(
        `[script-report] synthesis validation failed (attempt=${attempt + 1}): ${validated.errors.join('; ')} | coercions=${validated.coercions.join(',') || 'none'} | rawPreview=${completion.content.slice(0, 400).replace(/\s+/g, ' ')}`,
      );
    } catch (err) {
      console.error('[script-report] synthesis LLM error:', err);
      break;
    }
  }

  return {
    synthesis: buildDeterministicSynthesis(args.aggregate),
    model: modelUsed,
    usedLlm: false,
    raw: rawOutputs.join('\n---RETRY---\n') || null,
    coercions: [],
  };
}

function mergeModelAnswers(
  aggregate: Extract<AggregatedScriptReport, { kind: 'scored' }>,
  synthesis: ScriptReportSynthesis,
): PerQuestionReportRow[] {
  const fillByTurn = new Map(
    (synthesis.model_answer_fillins ?? []).map((f) => [f.turn_index, f.lines]),
  );
  return aggregate.perQuestion.map((q) => {
    if (q.modelAnswerLines.length > 0) return q;
    const fill = fillByTurn.get(q.turnIndex);
    if (!fill?.length) return q;
    return { ...q, modelAnswerLines: toSampleAnswerParagraphs(fill).slice(0, 6) };
  });
}

async function buildAndPersistReport(args: {
  serviceClient: SupabaseClient;
  interviewId: string;
  userId: string;
  role: string | null;
  scriptType: string | null;
}): Promise<ScriptInterviewReportRecord> {
  const { serviceClient, interviewId, userId, role, scriptType } = args;

  const [{ data: evals, error: evalError }, { data: turns, error: turnError }] = await Promise.all([
    serviceClient
      .from('answer_evaluations')
      .select(
        'turn_index, question, transcript, question_type, overall, dimensions, prompt_version, score_suspect, status, raw_model_output',
      )
      .eq('interview_id', interviewId)
      .eq('status', 'scored')
      .order('turn_index', { ascending: true }),
    serviceClient
      .from('script_turns')
      .select('turn_index, structured_answer')
      .eq('interview_id', interviewId),
  ]);

  if (evalError || turnError) {
    console.error('[script-report] eval/turn load failed:', evalError ?? turnError);
    const failedPayload = {
      interview_id: interviewId,
      user_id: userId,
      status: 'failed' as const,
      scored_answer_count: 0,
      overall: null,
      dimension_averages: null,
      score_band: null,
      placement_signal: null,
      per_question: [],
      synthesis: null,
      updated_at: new Date().toISOString(),
    };
    await serviceClient
      .from('script_interview_reports')
      .upsert(failedPayload, { onConflict: 'interview_id' });
    return {
      id: 'failed',
      interview_id: interviewId,
      overall: null,
      dimension_averages: null,
      score_band: null,
      placement_signal: null,
      scored_answer_count: 0,
      prompt_versions: [],
      per_question: [],
      synthesis: null,
      synthesis_model: null,
      synthesis_prompt_version: null,
      status: 'failed',
      generated_at: new Date().toISOString(),
    };
  }

  const turnByIndex = new Map<number, TurnRow>(
    ((turns ?? []) as TurnRow[]).map((t) => [t.turn_index, t]),
  );

  const scoredInputs: ScoredAnswerInput[] = [];
  for (const row of (evals ?? []) as EvalRow[]) {
    const dims = parseDimensions(row.dimensions);
    if (!dims || row.overall == null) continue;
    const turn = turnByIndex.get(row.turn_index);
    scoredInputs.push({
      turnIndex: row.turn_index,
      question: row.question,
      transcript: row.transcript,
      questionType: row.question_type,
      overall: Number(row.overall),
      dimensions: dims,
      promptVersion: row.prompt_version,
      scoreSuspect: Boolean(row.score_suspect),
      oneLineSummary: parseOneLineSummary(row.raw_model_output),
      modelAnswerLines: extractModelAnswerLines(turn?.structured_answer),
    });
  }

  const aggregate = aggregateScriptAnswers(scoredInputs);

  if (aggregate.kind === 'insufficient_data') {
    const upsertPayload = {
      interview_id: interviewId,
      user_id: userId,
      prompt_versions: [] as string[],
      scored_answer_count: 0,
      status: 'insufficient_data' as const,
      overall: null,
      dimension_averages: null,
      score_band: null,
      placement_signal: null,
      per_question: [],
      synthesis: null,
      synthesis_model: null,
      synthesis_prompt_version: null,
      synthesis_raw: null,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: saved } = await upsertReportRow(serviceClient, upsertPayload);

    if (saved) return mapRow(saved);
    return {
      id: 'ephemeral',
      interview_id: interviewId,
      overall: null,
      dimension_averages: null,
      score_band: null,
      placement_signal: null,
      scored_answer_count: 0,
      prompt_versions: [],
      per_question: [],
      synthesis: null,
      synthesis_model: null,
      synthesis_prompt_version: null,
      status: 'insufficient_data',
      generated_at: new Date().toISOString(),
    };
  }

  const { data: userProfile } = await serviceClient
    .from('users')
    .select('plan_tier')
    .eq('id', userId)
    .maybeSingle();
  const planTier = (userProfile?.plan_tier as string | undefined) ?? 'free';
  const costReserve = await reserveScriptLlmCost(userId, planTier, 'report');
  if (!costReserve.ok) {
    const body = (await costReserve.response.clone().json()) as {
      error?: string;
      code?: string;
    };
    const guardErr = new ScriptLlmCostGuardError(
      costReserve.response.status,
      body.error ?? 'LLM cost guard denied',
      body.code,
    );
    const failedPayload = {
      interview_id: interviewId,
      user_id: userId,
      status: 'failed' as const,
      scored_answer_count: aggregate.scoredAnswerCount,
      overall: null,
      dimension_averages: null,
      score_band: null,
      placement_signal: null,
      per_question: [],
      synthesis: null,
      updated_at: new Date().toISOString(),
    };
    await serviceClient
      .from('script_interview_reports')
      .upsert(failedPayload, { onConflict: 'interview_id' });
    throw guardErr;
  }

  let costCommitted = false;
  let synthesis: ScriptReportSynthesis;
  let model: string | null;
  let usedLlm: boolean;
  let raw: string | null;
  let coercions: string[];
  try {
    const synthResult = await runSynthesis({
      targetRole: role ?? '',
      scriptType,
      aggregate,
      interviewId,
      userId,
    });
    synthesis = synthResult.synthesis;
    model = synthResult.model;
    usedLlm = synthResult.usedLlm;
    raw = synthResult.raw;
    coercions = synthResult.coercions;
    // Keep reservation if the provider was reached (usedLlm or any raw output).
    // Unknown / force-fail with no provider call → release.
    if (usedLlm || Boolean(raw)) {
      costCommitted = true;
    }
  } finally {
    if (!costCommitted) {
      await costReserve.reservation.release();
    }
  }

  const perQuestion = mergeModelAnswers(aggregate, synthesis);
  const status: ScriptReportStatus = usedLlm ? 'ready' : 'partial';

  const synthesisWithMeta = {
    ...synthesis,
    meta: {
      synthesis_version: SCRIPT_REPORT_SYNTHESIS_VERSION,
      used_llm: usedLlm,
      limited_data: aggregate.limitedData,
      weakest_dimensions: aggregate.weakestDimensions,
      normalizer_coercions: coercions,
    },
  };

  const upsertPayload = {
    interview_id: interviewId,
    user_id: userId,
    prompt_versions: aggregate.promptVersions,
    scored_answer_count: aggregate.scoredAnswerCount,
    status,
    overall: aggregate.overall,
    dimension_averages: aggregate.dimensionAverages,
    score_band: aggregate.scoreBand,
    placement_signal: aggregate.placementSignal,
    per_question: perQuestion,
    synthesis: synthesisWithMeta,
    synthesis_model: model,
    synthesis_prompt_version: SCRIPT_REPORT_SYNTHESIS_VERSION,
    synthesis_raw: raw,
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error: saveError } = await upsertReportRow(serviceClient, upsertPayload);

  if (saveError || !saved) {
    console.error('[script-report] upsert failed:', saveError);
    return {
      id: 'ephemeral',
      interview_id: interviewId,
      overall: aggregate.overall,
      dimension_averages: aggregate.dimensionAverages,
      score_band: aggregate.scoreBand,
      placement_signal: aggregate.placementSignal,
      scored_answer_count: aggregate.scoredAnswerCount,
      prompt_versions: aggregate.promptVersions,
      per_question: perQuestion,
      synthesis: synthesisWithMeta as ScriptReportSynthesis,
      synthesis_model: model,
      synthesis_prompt_version: SCRIPT_REPORT_SYNTHESIS_VERSION,
      status,
      generated_at: new Date().toISOString(),
    };
  }

  return mapRow(saved);
}

export async function loadOrGenerateScriptReport(args: {
  serviceClient: SupabaseClient;
  interviewId: string;
  userId: string;
  forceRegenerate?: boolean;
  /**
   * When true, do not queue an owed completion email after the report is ready.
   * Required when the caller is trySendScriptCompletionEmail (avoids recurse).
   */
  skipOwedCompletionEmail?: boolean;
}): Promise<
  | { ok: true; report: ScriptInterviewReportRecord; created: boolean }
  | { ok: false; error: string; status: number; code?: string }
> {
  const {
    serviceClient,
    interviewId,
    userId,
    forceRegenerate = false,
    skipOwedCompletionEmail = false,
  } = args;

  const { data: interview, error: interviewError } = await serviceClient
    .from('interviews')
    .select('id, user_id, status, engine, script_type, role, completed_at')
    .eq('id', interviewId)
    .eq('user_id', userId)
    .maybeSingle<{
      id: string;
      user_id: string;
      status: string;
      engine: string;
      script_type: string | null;
      role: string | null;
      completed_at: string | null;
    }>();

  if (interviewError) {
    console.error('[script-report] interview load failed:', interviewError);
    return { ok: false, error: 'Failed to load interview', status: 500 };
  }
  if (!interview) {
    return { ok: false, error: 'Interview not found', status: 404 };
  }
  if (interview.engine !== 'v2.1') {
    return { ok: false, error: 'Not a v2.1 script interview', status: 404 };
  }
  if (interview.status !== 'completed') {
    return { ok: false, error: 'Interview not completed', status: 409 };
  }

  const claim = await claimReportGeneration({
    serviceClient,
    interviewId,
    userId,
    forceRegenerate,
  });

  if (!claim.claimed) {
    if (!claim.pending) {
      // Sticky insufficient_data (or empty terminal) after scores land later —
      // regenerate once so the owed-completion-email hook can fire.
      if (
        !forceRegenerate &&
        (claim.report.status === 'insufficient_data' ||
          claim.report.scored_answer_count === 0 ||
          claim.report.overall == null)
      ) {
        const { count: scoredNow, error: scoredErr } = await serviceClient
          .from('answer_evaluations')
          .select('id', { count: 'exact', head: true })
          .eq('interview_id', interviewId)
          .eq('status', 'scored');
        if (!scoredErr && (scoredNow ?? 0) > 0) {
          console.info('[script-report] regenerating sticky report after scores arrived', {
            interviewId,
            priorStatus: claim.report.status,
            scoredNow,
          });
          return loadOrGenerateScriptReport({
            ...args,
            forceRegenerate: true,
          });
        }
      }
      maybeQueueOwedCompletionEmail({
        skipOwedCompletionEmail,
        serviceClient,
        interviewId,
        userId,
        report: claim.report,
      });
      return { ok: true, created: false, report: claim.report };
    }
    const waited = await waitForReportReady(serviceClient, interviewId);
    if (waited && TERMINAL_STATUSES.has(waited.status)) {
      maybeQueueOwedCompletionEmail({
        skipOwedCompletionEmail,
        serviceClient,
        interviewId,
        userId,
        report: waited,
      });
      return { ok: true, created: false, report: waited };
    }
    // Timed out still generating — surface generating so UI can retry.
    return {
      ok: true,
      created: false,
      report:
        waited ??
        ({
          id: 'pending',
          interview_id: interviewId,
          overall: null,
          dimension_averages: null,
          score_band: null,
          placement_signal: null,
          scored_answer_count: 0,
          prompt_versions: [],
          per_question: [],
          synthesis: null,
          synthesis_model: null,
          synthesis_prompt_version: null,
          status: 'generating',
          generated_at: new Date().toISOString(),
        } satisfies ScriptInterviewReportRecord),
    };
  }

  let report: ScriptInterviewReportRecord;
  try {
    report = await buildAndPersistReport({
      serviceClient,
      interviewId,
      userId,
      role: interview.role,
      scriptType: interview.script_type,
    });
  } catch (err) {
    if (err instanceof ScriptLlmCostGuardError) {
      return {
        ok: false,
        error: err.message,
        status: err.status,
        code: err.code,
      };
    }
    throw err;
  }

  maybeQueueOwedCompletionEmail({
    skipOwedCompletionEmail,
    serviceClient,
    interviewId,
    userId,
    report,
  });

  return { ok: true, created: true, report };
}

function maybeQueueOwedCompletionEmail(args: {
  skipOwedCompletionEmail: boolean;
  serviceClient: SupabaseClient;
  interviewId: string;
  userId: string;
  report: ScriptInterviewReportRecord;
}): void {
  if (args.skipOwedCompletionEmail) return;
  // Lazy import avoids a circular init cycle:
  // generate → owed-email → trySend → generate
  void import('@/lib/email/lifecycle/send-owed-script-completion-email').then(
    ({ queueOwedScriptCompletionEmailIfReportReady }) => {
      queueOwedScriptCompletionEmailIfReportReady({
        serviceClient: args.serviceClient,
        interviewId: args.interviewId,
        userId: args.userId,
        report: args.report,
      });
    },
  );
}
