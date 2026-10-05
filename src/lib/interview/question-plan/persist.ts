import type { SupabaseClient } from '@supabase/supabase-js';
import type { QuestionCategory, QuestionRubric } from '@/types/app.types';
import { findCoreDuplicate } from './duplicate';
import { emergencyCoreQuestion, nextFallbackQuestion } from './fallback';
import type {
  CoreQuestionType,
  PlannedCoreQuestion,
  QuestionGrounding,
  QuestionPlanContext,
  QuestionPlanMarker,
  QuestionPlanRowStatus,
  QuestionPlanSource,
} from './types';

export class QuestionPlanSchemaUnavailable extends Error {
  constructor() {
    super('questions plan columns are not available');
    this.name = 'QuestionPlanSchemaUnavailable';
  }
}

function isSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  return /plan_status|question_type|grounding/i.test(error.message ?? '');
}

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '23505' || /duplicate key|unique constraint/i.test(error.message ?? '');
}

function asRubric(raw: unknown): QuestionRubric {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const keywords = Array.isArray(row.ideal_keywords)
    ? row.ideal_keywords.filter((item): item is string => typeof item === 'string')
    : ['specific'];
  return {
    ideal_keywords: keywords.length > 0 ? keywords : ['specific'],
    ideal_structure:
      typeof row.ideal_structure === 'string' && row.ideal_structure.trim()
        ? row.ideal_structure
        : 'Context, what you did, and the outcome.',
    red_flags: Array.isArray(row.red_flags)
      ? row.red_flags.filter((item): item is string => typeof item === 'string')
      : ['vague'],
  };
}

function asGrounding(raw: unknown): QuestionGrounding {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    resume: row.resume === true,
    project: row.project === true,
    jd: row.jd === true,
    role: row.role === true,
    personalizationReason:
      typeof row.personalization_reason === 'string' ? row.personalization_reason : '',
    noveltyScore: typeof row.novelty_score === 'number' ? row.novelty_score : 0,
  };
}

function asStatus(raw: unknown): QuestionPlanRowStatus | null {
  if (raw === 'planned' || raw === 'asked' || raw === 'skipped') return raw;
  return null;
}

function asSource(raw: unknown): QuestionPlanSource {
  if (
    raw === 'llm_plan' ||
    raw === 'resume_fallback' ||
    raw === 'emergency_fallback' ||
    raw === 'replacement'
  ) {
    return raw;
  }
  return 'llm_plan';
}

function asType(raw: unknown, category: QuestionCategory): CoreQuestionType {
  if (raw === 'technical' || raw === 'behavioral') return raw;
  return category === 'technical' ? 'technical' : 'behavioral';
}

interface QuestionRow {
  id: string;
  order_index: number;
  question_text: string;
  rubric: unknown;
  category: string;
  question_type: string | null;
  difficulty: string | null;
  source: string | null;
  plan_status: string | null;
  grounding: unknown;
}

function toPlanned(row: QuestionRow): PlannedCoreQuestion | null {
  const status = asStatus(row.plan_status);
  if (!status) return null;
  const category: QuestionCategory =
    row.category === 'behavioral' || row.category === 'situational' || row.category === 'technical'
      ? row.category
      : 'technical';
  const difficulty =
    row.difficulty === 'easy' || row.difficulty === 'medium' || row.difficulty === 'hard'
      ? row.difficulty
      : 'medium';
  return {
    id: row.id,
    orderIndex: row.order_index,
    questionText: row.question_text,
    questionType: asType(row.question_type, category),
    category,
    difficulty,
    source: asSource(row.source),
    planStatus: status,
    grounding: asGrounding(row.grounding),
    rubric: asRubric(row.rubric),
  };
}

export async function loadQuestionPlan(
  client: SupabaseClient,
  interviewId: string,
): Promise<PlannedCoreQuestion[]> {
  const { data, error } = await client
    .from('questions')
    .select(
      'id, order_index, question_text, rubric, category, question_type, difficulty, source, plan_status, grounding',
    )
    .eq('interview_id', interviewId)
    .not('plan_status', 'is', null)
    .order('order_index', { ascending: true });

  if (error) {
    if (isSchemaError(error)) throw new QuestionPlanSchemaUnavailable();
    throw new Error(`question plan load failed: ${error.message}`);
  }

  return ((data ?? []) as QuestionRow[])
    .map(toPlanned)
    .filter((row): row is PlannedCoreQuestion => row !== null);
}

export async function persistQuestionPlan(
  client: SupabaseClient,
  interviewId: string,
  plan: readonly PlannedCoreQuestion[],
): Promise<PlannedCoreQuestion[]> {
  if (plan.length === 0) return [];
  const rows = plan.map((question) => ({
    interview_id: interviewId,
    order_index: question.orderIndex,
    question_text: question.questionText,
    rubric: question.rubric,
    category: question.category,
    question_type: question.questionType,
    difficulty: question.difficulty,
    source: question.source,
    plan_status: 'planned' as const,
    grounding: {
      resume: question.grounding.resume,
      project: question.grounding.project,
      jd: question.grounding.jd,
      role: question.grounding.role,
      personalization_reason: question.grounding.personalizationReason,
      novelty_score: question.grounding.noveltyScore,
    },
  }));

  const { error } = await client.from('questions').insert(rows);
  if (error) {
    if (isSchemaError(error)) throw new QuestionPlanSchemaUnavailable();
    if (isUniqueViolation(error)) return loadQuestionPlan(client, interviewId);
    throw new Error(`question plan insert failed: ${error.message}`);
  }
  return loadQuestionPlan(client, interviewId);
}

export async function markQuestionPlanRows(
  client: SupabaseClient,
  updates: readonly { id: string; status: 'asked' | 'skipped' }[],
): Promise<void> {
  for (const update of updates) {
    if (!update.id) continue;
    const { error } = await client
      .from('questions')
      .update({ plan_status: update.status })
      .eq('id', update.id)
      .eq('plan_status', 'planned');
    if (error && !isSchemaError(error)) {
      console.error('[question-plan] status update failed', {
        id: update.id,
        status: update.status,
        message: error.message,
      });
    }
  }
}

export async function setQuestionPlanStatus(
  client: SupabaseClient,
  interviewId: string,
  status: QuestionPlanMarker,
): Promise<boolean> {
  const { data, error } = await client
    .from('interviews')
    .select('session_context')
    .eq('id', interviewId)
    .maybeSingle();
  if (error || !data) {
    console.error('[question-plan] session marker read failed', {
      interviewId,
      message: error?.message ?? 'missing interview',
    });
    return false;
  }
  const current =
    data.session_context && typeof data.session_context === 'object' && !Array.isArray(data.session_context)
      ? (data.session_context as Record<string, unknown>)
      : {};
  if (current.questionPlanStatus === status) return true;
  const { error: updateError } = await client
    .from('interviews')
    .update({ session_context: { ...current, questionPlanStatus: status } })
    .eq('id', interviewId);
  if (updateError) {
    console.error('[question-plan] session marker write failed', {
      interviewId,
      message: updateError.message,
    });
    return false;
  }
  return true;
}

function questionTextFromOutput(llmOutput: unknown): string | null {
  if (!llmOutput || typeof llmOutput !== 'object') return null;
  const row = llmOutput as Record<string, unknown>;
  if (row.is_follow_up === true) return null;
  const text = typeof row.display_question === 'string' ? row.display_question.trim() : '';
  return text || null;
}

export function isIncompleteUnaskedPlan(
  existing: readonly PlannedCoreQuestion[],
  required: number,
): boolean {
  return (
    existing.length > 0 &&
    existing.length < required &&
    existing.every((question) => question.planStatus === 'planned')
  );
}

export async function loadRecentCoreQuestionTexts(
  client: SupabaseClient,
  opts: { interviewId: string; userId: string },
): Promise<{ recent: string[]; userHistory: string[]; reserved: string[] }> {
  const { data: turns, error } = await client
    .from('script_turns')
    .select('interview_id, llm_output')
    .eq('phase', 'core')
    .eq('is_question', true)
    .order('created_at', { ascending: false })
    .limit(160);

  if (error) {
    console.error('[question-plan] recent question lookup failed', { message: error.message });
    return { recent: [], userHistory: [], reserved: [] };
  }

  const reserved = await loadReservedPlanTexts(client, opts.interviewId);

  const recent: string[] = [];
  for (const turn of turns ?? []) {
    if (turn.interview_id === opts.interviewId) continue;
    const text = questionTextFromOutput(turn.llm_output);
    if (text) recent.push(text);
  }

  const { data: priorInterviews, error: priorError } = await client
    .from('interviews')
    .select('id')
    .eq('user_id', opts.userId)
    .eq('engine', 'v2.1')
    .neq('id', opts.interviewId)
    .order('created_at', { ascending: false })
    .limit(6);

  if (priorError || !priorInterviews || priorInterviews.length === 0) {
    return { recent: recent.slice(0, 120), userHistory: [], reserved };
  }

  const ids = priorInterviews.map((row) => row.id as string);
  const { data: priorTurns, error: priorTurnError } = await client
    .from('script_turns')
    .select('llm_output')
    .in('interview_id', ids)
    .eq('phase', 'core')
    .eq('is_question', true)
    .order('created_at', { ascending: false })
    .limit(40);

  if (priorTurnError) return { recent: recent.slice(0, 120), userHistory: [], reserved };

  const userHistory: string[] = [];
  for (const turn of priorTurns ?? []) {
    const text = questionTextFromOutput(turn.llm_output);
    if (text) userHistory.push(text);
  }
  return { recent: recent.slice(0, 120), userHistory, reserved };
}

async function loadReservedPlanTexts(client: SupabaseClient, interviewId: string): Promise<string[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: interviews, error } = await client
    .from('interviews')
    .select('id')
    .eq('engine', 'v2.1')
    .neq('id', interviewId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error || !interviews || interviews.length === 0) return [];
  const ids = interviews.map((row) => row.id as string);
  const { data, error: planError } = await client
    .from('questions')
    .select('question_text')
    .in('interview_id', ids)
    .eq('plan_status', 'planned')
    .limit(80);
  if (planError || !data) return [];
  return data
    .map((row) => (typeof row.question_text === 'string' ? row.question_text.trim() : ''))
    .filter(Boolean);
}

/**
 * If an earlier interview already reserved the same core, replace our still-planned
 * row with a non-duplicate fallback. The earlier interview id keeps its text.
 * A simultaneous insert that commits after this read can still overlap.
 */
export async function rewriteEarlierReservations(
  client: SupabaseClient,
  interviewId: string,
  context: QuestionPlanContext,
): Promise<PlannedCoreQuestion[]> {
  const plan = await loadQuestionPlan(client, interviewId);
  const { data: self } = await client
    .from('interviews')
    .select('created_at')
    .eq('id', interviewId)
    .maybeSingle();
  const createdAt = typeof self?.created_at === 'string' ? self.created_at : new Date().toISOString();
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: earlier } = await client
    .from('interviews')
    .select('id')
    .eq('engine', 'v2.1')
    .neq('id', interviewId)
    .gte('created_at', since)
    .lt('created_at', createdAt)
    .limit(20);
  const ids = (earlier ?? []).map((row) => row.id as string);
  if (ids.length === 0) return plan;
  const { data: reservedRows } = await client
    .from('questions')
    .select('question_text')
    .in('interview_id', ids)
    .in('plan_status', ['planned', 'asked'])
    .limit(80);
  const blocked = (reservedRows ?? [])
    .map((row) => (typeof row.question_text === 'string' ? row.question_text.trim() : ''))
    .filter(Boolean);
  if (blocked.length === 0) return plan;

  let changed = false;
  for (const question of plan) {
    if (question.planStatus !== 'planned' || !question.id) continue;
    if (!findCoreDuplicate(question.questionText, blocked).duplicate) continue;
    const fallback = nextFallbackQuestion({
      context,
      questionType: question.questionType,
      slot: question.orderIndex,
      blocked,
    });
    const emergency = fallback
      ? null
      : emergencyCoreQuestion({
          role: context.role,
          questionType: question.questionType,
          blocked,
        });
    const replacement = fallback?.text ?? emergency;
    if (!replacement || findCoreDuplicate(replacement, blocked).duplicate) continue;
    const { error } = await client
      .from('questions')
      .update({ question_text: replacement, source: 'replacement' })
      .eq('id', question.id)
      .eq('plan_status', 'planned');
    if (!error) {
      blocked.push(replacement);
      changed = true;
    }
  }
  return changed ? loadQuestionPlan(client, interviewId) : plan;
}
