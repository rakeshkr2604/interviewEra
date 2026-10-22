/**
 * Canonical per-question report rows for v2.1 script interviews.
 *
 * Follow-ups live on script_turns (is_follow_up in llm_output). They share
 * answer_evaluations with core questions. This module attaches parent/child
 * metadata and builds the display list without changing session score math.
 */

import { turnIsFollowUp } from '@/lib/ai/scripts/turn-authority';
import {
  isUsableCandidateAnswer,
  questionTextFromTurn,
} from '@/lib/ai/scripts/follow-up-context';
import { DIMENSION_KEYS, type DimensionKey } from '@/lib/interview/answer-score/rubric';
import { toSampleAnswerParagraphs } from '@/lib/interview/auto-structure/normalize';
import type { PerQuestionReportRow, ScoredAnswerInput } from '@/lib/interview/script-report/aggregate';
import { reportSummaryForAnswer } from '@/lib/interview/answer-quality';

export type EvaluationAvailability = 'scored' | 'unavailable';

export type ScriptTurnForReport = {
  turn_index: number;
  phase: string;
  is_question: boolean;
  llm_output: unknown;
  answer_text?: string | null;
  question_type?: 'technical' | 'behavioral' | null;
  structured_answer?: unknown;
};

export type EvalRowForReport = {
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

export type AnnotatedCoreTurn = {
  turn: ScriptTurnForReport;
  isFollowUp: boolean;
  parentTurnIndex: number | null;
  coreSequence: number;
  followUpSequence: number | null;
};

export type CoreQuestionGroup = {
  core: PerQuestionReportRow;
  followUps: PerQuestionReportRow[];
};

const dimensionStoredSchemaShape = (raw: unknown): raw is { score: number; note?: string } => {
  if (!raw || typeof raw !== 'object') return false;
  return typeof (raw as { score?: unknown }).score === 'number';
};

export function parseStoredDimensions(
  raw: unknown,
): Record<DimensionKey, { score: number; note?: string }> | null {
  if (!raw || typeof raw !== 'object') return null;
  const out = {} as Record<DimensionKey, { score: number; note?: string }>;
  for (const key of DIMENSION_KEYS) {
    const cell = (raw as Record<string, unknown>)[key];
    if (!dimensionStoredSchemaShape(cell)) return null;
    out[key] = {
      score: cell.score,
      ...(typeof cell.note === 'string' ? { note: cell.note } : {}),
    };
  }
  return out;
}

export function extractModelAnswerLines(structured: unknown): string[] {
  if (!structured || typeof structured !== 'object') return [];
  const coaching = (structured as { coaching_reference?: { restructured_example?: unknown } })
    .coaching_reference;
  const lines = coaching?.restructured_example;
  if (!Array.isArray(lines)) return [];
  return toSampleAnswerParagraphs(
    lines.filter((l): l is string => typeof l === 'string'),
  ).slice(0, 6);
}

export function parseOneLineSummary(raw: string | null): string | null {
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

/** Core + adaptive follow-up question turns only (phase=core, is_question). */
export function isCorePhaseQuestionTurn(turn: ScriptTurnForReport): boolean {
  return turn.phase === 'core' && turn.is_question === true;
}

/**
 * Walk chronological turns and attach parent core + sequence numbers.
 * Follow-ups nest under the most recent non-follow-up core; orphan FUs
 * (no prior core) keep parentTurnIndex null and still appear in order.
 */
export function annotateCoreFollowUpHierarchy(
  turns: ScriptTurnForReport[],
): AnnotatedCoreTurn[] {
  const sorted = [...turns]
    .filter(isCorePhaseQuestionTurn)
    .sort((a, b) => a.turn_index - b.turn_index);

  let currentParent: number | null = null;
  let coreSequence = 0;
  let followUpSequence = 0;
  const out: AnnotatedCoreTurn[] = [];

  for (const turn of sorted) {
    const isFollowUp = turnIsFollowUp(turn.llm_output);
    if (!isFollowUp) {
      coreSequence += 1;
      followUpSequence = 0;
      currentParent = turn.turn_index;
      out.push({
        turn,
        isFollowUp: false,
        parentTurnIndex: null,
        coreSequence,
        followUpSequence: null,
      });
      continue;
    }
    followUpSequence += 1;
    out.push({
      turn,
      isFollowUp: true,
      parentTurnIndex: currentParent,
      coreSequence: currentParent == null ? coreSequence : coreSequence,
      followUpSequence,
    });
  }

  return out;
}

function hasReportableAnswer(
  turn: ScriptTurnForReport,
  evalByTurn: Map<number, EvalRowForReport>,
): boolean {
  const ev = evalByTurn.get(turn.turn_index);
  if (ev && ev.status === 'scored' && ev.overall != null) return true;
  return isUsableCandidateAnswer(turn.answer_text);
}

/**
 * Build scored inputs for session aggregation (score math unchanged).
 * Only status=scored rows with valid dimensions participate.
 */
export function buildScoredAnswerInputs(
  annotated: AnnotatedCoreTurn[],
  evals: EvalRowForReport[],
): ScoredAnswerInput[] {
  const evalByTurn = new Map(evals.map((e) => [e.turn_index, e]));
  const scored: ScoredAnswerInput[] = [];

  for (const row of annotated) {
    const ev = evalByTurn.get(row.turn.turn_index);
    if (!ev || ev.status !== 'scored' || ev.overall == null) continue;
    const dims = parseStoredDimensions(ev.dimensions);
    if (!dims) continue;

    scored.push({
      turnIndex: row.turn.turn_index,
      question: ev.question || questionTextFromTurn(row.turn) || 'Question',
      transcript: ev.transcript,
      questionType: ev.question_type,
      overall: Number(ev.overall),
      dimensions: dims,
      promptVersion: ev.prompt_version,
      scoreSuspect: Boolean(ev.score_suspect),
      oneLineSummary: parseOneLineSummary(ev.raw_model_output),
      modelAnswerLines: extractModelAnswerLines(row.turn.structured_answer),
      isFollowUp: row.isFollowUp,
      parentTurnIndex: row.parentTurnIndex,
      coreSequence: row.coreSequence,
      followUpSequence: row.followUpSequence,
    });
  }

  return scored;
}

/**
 * Full display list: every answered core/follow-up turn, scored or not.
 * Unscored answers get evaluationStatus='unavailable' — never fabricate scores.
 */
export function buildPerQuestionReportRows(
  annotated: AnnotatedCoreTurn[],
  evals: EvalRowForReport[],
): PerQuestionReportRow[] {
  const evalByTurn = new Map(evals.map((e) => [e.turn_index, e]));
  const rows: PerQuestionReportRow[] = [];

  for (const ann of annotated) {
    if (!hasReportableAnswer(ann.turn, evalByTurn)) continue;

    const ev = evalByTurn.get(ann.turn.turn_index);
    const dims = ev ? parseStoredDimensions(ev.dimensions) : null;
    const scored =
      Boolean(ev) &&
      ev!.status === 'scored' &&
      ev!.overall != null &&
      dims != null;

    const question =
      (ev?.question?.trim() || questionTextFromTurn(ann.turn) || 'Question').trim();
    const transcript = (
      (ev?.transcript?.trim() || ann.turn.answer_text || '') as string
    ).trim();

    const questionType: 'technical' | 'behavioral' =
      ev?.question_type ??
      (ann.turn.question_type === 'behavioral' ? 'behavioral' : 'technical');

    const honesty = reportSummaryForAnswer({
      transcript,
      question,
      modelOneLineSummary: ev ? parseOneLineSummary(ev.raw_model_output) : null,
    });

    if (scored && dims && ev) {
      const weakKey = [...DIMENSION_KEYS].sort(
        (x, y) => dims[x].score - dims[y].score,
      )[0]!;
      const weak = dims[weakKey];
      rows.push({
        turnIndex: ann.turn.turn_index,
        question,
        questionType,
        overall: Number(ev.overall),
        dimensions: dims,
        transcript,
        scoreSuspect: Boolean(ev.score_suspect) || honesty.scoreSuspectHint,
        oneLineSummary: honesty.oneLineSummary,
        modelAnswerLines: extractModelAnswerLines(ann.turn.structured_answer),
        focusNote: weak?.note?.trim() || null,
        evaluationStatus: 'scored',
        isFollowUp: ann.isFollowUp,
        parentTurnIndex: ann.parentTurnIndex,
        coreSequence: ann.coreSequence,
        followUpSequence: ann.followUpSequence,
        answerQualityKind: honesty.kind,
      });
      continue;
    }

    rows.push({
      turnIndex: ann.turn.turn_index,
      question,
      questionType,
      overall: null,
      dimensions: null,
      transcript,
      scoreSuspect: honesty.scoreSuspectHint,
      oneLineSummary: honesty.oneLineSummary,
      modelAnswerLines: extractModelAnswerLines(ann.turn.structured_answer),
      focusNote: null,
      evaluationStatus: 'unavailable',
      isFollowUp: ann.isFollowUp,
      parentTurnIndex: ann.parentTurnIndex,
      coreSequence: ann.coreSequence,
      followUpSequence: ann.followUpSequence,
      answerQualityKind: honesty.kind,
    });
  }

  return rows;
}

/** Normalize legacy cached rows that predate follow-up metadata. */
export function normalizePerQuestionRow(raw: unknown): PerQuestionReportRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.turnIndex !== 'number' || typeof r.question !== 'string') return null;
  if (typeof r.transcript !== 'string') return null;

  const questionType =
    r.questionType === 'behavioral' || r.questionType === 'technical'
      ? r.questionType
      : 'technical';

  const overallRaw =
    r.overall == null || r.overall === '' ? null : Number(r.overall);
  const overall =
    overallRaw != null && Number.isFinite(overallRaw) ? overallRaw : null;
  const dimensions =
    r.dimensions == null ? null : parseStoredDimensions(r.dimensions);
  const hasScore = overall != null && dimensions != null;
  const evaluationStatus: EvaluationAvailability =
    r.evaluationStatus === 'unavailable' || !hasScore ? 'unavailable' : 'scored';

  return {
    turnIndex: r.turnIndex,
    question: r.question,
    questionType,
    overall,
    dimensions,
    transcript: r.transcript,
    scoreSuspect: Boolean(r.scoreSuspect),
    oneLineSummary: typeof r.oneLineSummary === 'string' ? r.oneLineSummary : null,
    modelAnswerLines: Array.isArray(r.modelAnswerLines)
      ? r.modelAnswerLines.filter((l): l is string => typeof l === 'string')
      : [],
    focusNote: typeof r.focusNote === 'string' ? r.focusNote : null,
    evaluationStatus,
    isFollowUp: r.isFollowUp === true,
    parentTurnIndex:
      typeof r.parentTurnIndex === 'number' ? r.parentTurnIndex : null,
    coreSequence: typeof r.coreSequence === 'number' ? r.coreSequence : undefined,
    followUpSequence:
      typeof r.followUpSequence === 'number' ? r.followUpSequence : null,
    answerQualityKind:
      typeof r.answerQualityKind === 'string' ? r.answerQualityKind : undefined,
  };
}

/**
 * Group chronological per-question rows under their parent core.
 * Orphan follow-ups (missing parent) become their own top-level group.
 */
export function groupPerQuestionByCore(
  rows: PerQuestionReportRow[],
): CoreQuestionGroup[] {
  const sorted = [...rows].sort((a, b) => a.turnIndex - b.turnIndex);
  const groups: CoreQuestionGroup[] = [];
  const groupByCoreTurn = new Map<number, CoreQuestionGroup>();

  for (const row of sorted) {
    const isFollowUp = row.isFollowUp === true;
    if (!isFollowUp) {
      const group: CoreQuestionGroup = { core: row, followUps: [] };
      groups.push(group);
      groupByCoreTurn.set(row.turnIndex, group);
      continue;
    }

    const parent = row.parentTurnIndex;
    const parentGroup = parent != null ? groupByCoreTurn.get(parent) : undefined;
    if (parentGroup) {
      parentGroup.followUps.push(row);
      continue;
    }
    // Orphan follow-up — keep visible rather than drop.
    groups.push({ core: row, followUps: [] });
  }

  return groups;
}

export function countFollowUpsInRows(rows: PerQuestionReportRow[]): number {
  return rows.filter((r) => r.isFollowUp === true).length;
}

export function countCoresInRows(rows: PerQuestionReportRow[]): number {
  return rows.filter((r) => r.isFollowUp !== true).length;
}

/**
 * True when script_turns has answered follow-ups that are absent from the
 * cached per_question payload (or payload lacks follow-up flags entirely).
 */
export function reportLacksFollowUpCoverage(args: {
  perQuestion: PerQuestionReportRow[];
  turns: ScriptTurnForReport[];
  evals: EvalRowForReport[];
}): boolean {
  const annotated = annotateCoreFollowUpHierarchy(args.turns);
  const expected = buildPerQuestionReportRows(annotated, args.evals);
  const expectedFu = expected.filter((r) => r.isFollowUp);
  if (expectedFu.length === 0) return false;

  const byTurn = new Map(args.perQuestion.map((r) => [r.turnIndex, r]));
  for (const fu of expectedFu) {
    const existing = byTurn.get(fu.turnIndex);
    if (!existing) return true;
    if (existing.isFollowUp !== true) return true;
  }
  return false;
}
