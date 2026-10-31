/**
 * Choose the final N core questions from a larger pool.
 * Order is deterministic: novelty, then normalized text. No random selection.
 */

import type { ScriptType } from '@/lib/ai/scripts/script-loader';
import { nextScriptMCoreQuestionType } from '@/lib/ai/scripts/script-m-progression';
import { normalizeInterviewMode, validateQuestionAgainstMode } from '@/lib/interview/interview-mode';
import { findCoreDuplicate, normalizeCoreQuestion } from './duplicate';
import { nextFallbackQuestion } from './fallback';
import { isUnsuitableHrQuestion } from './hr-question-guard';
import { scoreQuestionNovelty } from './novelty';
import type {
  CoreQuestionType,
  PlanLogEvent,
  PlannedCoreQuestion,
  PoolQuestion,
  QuestionPlanContext,
} from './types';

const MIN_RUBRIC = {
  ideal_keywords: ['specific', 'relevant'],
  ideal_structure: 'Context, what you did, and the outcome.',
  red_flags: ['vague', 'off-topic'],
} as const;

export interface AssembleQuestionPlanInput {
  candidates: readonly PoolQuestion[];
  required: number;
  scriptType: ScriptType;
  difficulty: 'easy' | 'medium' | 'hard';
  interviewMode: string;
  context: QuestionPlanContext;
  recentQuestions?: readonly string[];
  userHistory?: readonly string[];
  /** Other interviews' planned-but-unasked cores. */
  reservedQuestions?: readonly string[];
  /** Questions a previous attempt already rejected. A retry must not bring them back. */
  rejected?: readonly string[];
  /** Continue a short unasked plan without restarting SCRIPT_M alternation. */
  orderOffset?: number;
}

export interface AssembledQuestionPlan {
  questions: PlannedCoreQuestion[];
  events: PlanLogEvent[];
  duplicateFilterMs: number;
  noveltyMs: number;
}

export function slotTypeForIndex(scriptType: ScriptType, index: number): CoreQuestionType {
  if (scriptType === 'SCRIPT_T') return 'technical';
  if (scriptType === 'SCRIPT_H') return 'behavioral';
  return index % 2 === 0 ? 'technical' : 'behavioral';
}

export function nextRequiredCoreType(
  scriptType: ScriptType,
  lastQuestionType: CoreQuestionType | null | undefined,
): CoreQuestionType {
  if (scriptType === 'SCRIPT_T') return 'technical';
  if (scriptType === 'SCRIPT_H') return 'behavioral';
  return nextScriptMCoreQuestionType(lastQuestionType);
}

interface RankedCandidate extends PoolQuestion {
  novelty: number;
  recentHits: number;
  reservedHits: number;
  resume: boolean;
  project: boolean;
  jd: boolean;
  role: boolean;
}

function rejectionEvent(
  kind: 'exact' | 'lexical' | 'same_topic',
  score: number,
  questionType: CoreQuestionType,
  category: PoolQuestion['category'],
): PlanLogEvent {
  return {
    event: 'question_rejected_duplicate',
    questionType,
    category,
    similarityScore: score,
    rejectionReason: kind,
  };
}

export function assembleQuestionPlan(input: AssembleQuestionPlanInput): AssembledQuestionPlan {
  const events: PlanLogEvent[] = [];
  const mode = normalizeInterviewMode(input.interviewMode);
  const recent = input.recentQuestions ?? [];
  const history = input.userHistory ?? [];
  const reserved = input.reservedQuestions ?? [];
  const rejected = input.rejected ?? [];
  const required = Math.max(1, input.required);
  const orderOffset = input.orderOffset ?? 0;
  const tieKey = profileTieKey(input.context);

  const ranked: RankedCandidate[] = [];
  const accepted: PoolQuestion[] = [];
  const filterStarted = Date.now();
  for (const candidate of input.candidates) {
    const text = candidate.questionText.trim();
    if (!text) continue;
    if (!validateQuestionAgainstMode(candidate.category, mode)) continue;
    if (candidate.questionType === 'behavioral' && isUnsuitableHrQuestion(text)) {
      events.push({
        event: 'question_rejected_low_novelty',
        questionType: candidate.questionType,
        category: candidate.category,
        rejectionReason: 'hr_unsuitable',
      });
      continue;
    }
    const againstRejected = findCoreDuplicate(text, rejected);
    if (againstRejected.duplicate && againstRejected.kind) {
      events.push(rejectionEvent(againstRejected.kind, againstRejected.score, candidate.questionType, candidate.category));
      continue;
    }
    accepted.push({ ...candidate, questionText: text });
  }
  const duplicateFilterMs = Date.now() - filterStarted;
  const noveltyStarted = Date.now();
  for (const candidate of accepted) {
    const novelty = scoreQuestionNovelty({
      questionText: candidate.questionText,
      context: input.context,
      recentQuestions: recent,
      userHistory: history,
      reservedQuestions: reserved,
    });
    ranked.push({
      ...candidate,
      questionText: candidate.questionText,
      novelty: novelty.score,
      recentHits: novelty.recentHits,
      reservedHits: novelty.reservedHits,
      resume: novelty.resume,
      project: novelty.project,
      jd: novelty.jd,
      role: novelty.role,
    });
  }
  const noveltyMs = Date.now() - noveltyStarted;

  ranked.sort((a, b) => {
    if (b.novelty !== a.novelty) return b.novelty - a.novelty;
    const tie = textTie(a.questionText, tieKey) - textTie(b.questionText, tieKey);
    if (tie !== 0) return tie;
    return normalizeCoreQuestion(a.questionText).localeCompare(normalizeCoreQuestion(b.questionText));
  });

  const pool: RankedCandidate[] = [];
  for (const candidate of ranked) {
    const duplicate = findCoreDuplicate(
      candidate.questionText,
      pool.map((kept) => kept.questionText),
    );
    if (duplicate.duplicate && duplicate.kind) {
      events.push(rejectionEvent(duplicate.kind, duplicate.score, candidate.questionType, candidate.category));
      continue;
    }
    pool.push(candidate);
  }

  const selected: PlannedCoreQuestion[] = [];
  const used: string[] = [...rejected];

  for (let index = 0; index < required; index += 1) {
    const questionType = slotTypeForIndex(input.scriptType, index + orderOffset);
    const eligible = pool.filter(
      (candidate) =>
        candidate.questionType === questionType &&
        !findCoreDuplicate(candidate.questionText, used).duplicate,
    );
    const best = eligible[0];
    if (best) {
      const crowded = eligible.find(
        (candidate) =>
          candidate !== best &&
          (candidate.recentHits >= 2 || candidate.reservedHits >= 1) &&
          best.novelty > candidate.novelty,
      );
      if (crowded) {
        events.push({
          event: 'question_rejected_low_novelty',
          questionNumber: index + 1,
          questionType,
          category: crowded.category,
          source: crowded.source,
          similarityScore: crowded.novelty,
          rejectionReason: 'recent_generic_lower_priority',
        });
      }
      used.push(best.questionText);
      selected.push(toPlanned(best, index + orderOffset, input.difficulty));
      continue;
    }

    const fallback = nextFallbackQuestion({
      context: input.context,
      questionType,
      slot: index + orderOffset,
      blocked: used,
    });
    if (!fallback) continue;
    events.push({
      event: 'question_plan_fallback',
      questionNumber: index + 1,
      questionType,
      category: questionType === 'technical' ? 'technical' : 'behavioral',
      source: fallback.personalized ? 'resume_fallback' : 'emergency_fallback',
      rejectionReason: 'pool_missing_slot',
    });
    used.push(fallback.text);
    selected.push(
      toPlanned(
        {
          questionText: fallback.text,
          questionType,
          category: questionType === 'technical' ? 'technical' : 'behavioral',
          groundingKind: fallback.personalized ? 'resume' : 'role',
          personalizationReason: fallback.personalized ? 'candidate_context' : 'role_only',
          source: fallback.personalized ? 'resume_fallback' : 'emergency_fallback',
          novelty: 0,
          recentHits: 0,
          reservedHits: 0,
          resume: fallback.personalized,
          project: false,
          jd: Boolean(input.context.jobDescription?.trim()) && fallback.text.includes('"'),
          role: true,
        },
        index + orderOffset,
        input.difficulty,
      ),
    );
  }

  events.unshift({
    event: 'question_plan_generated',
    questionNumber: selected.length,
    rejectionReason: `pool=${input.candidates.length}`,
  });

  return { questions: selected, events, duplicateFilterMs, noveltyMs };
}

function profileTieKey(context: QuestionPlanContext): number {
  const material = [context.role, ...context.skills, ...context.projects, context.jobDescription ?? '']
    .join('\n')
    .toLowerCase();
  let hash = 2_166_136_261;
  for (let i = 0; i < material.length; i += 1) {
    hash ^= material.charCodeAt(i);
    hash = Math.imul(hash, 1_677_7619);
  }
  return hash >>> 0;
}

function textTie(text: string, key: number): number {
  const norm = normalizeCoreQuestion(text);
  let hash = 2_166_136_261;
  for (let i = 0; i < norm.length; i += 1) {
    hash ^= norm.charCodeAt(i);
    hash = Math.imul(hash, 1_677_7619);
  }
  return ((hash >>> 0) ^ key) >>> 0;
}

function toPlanned(
  candidate: RankedCandidate,
  orderIndex: number,
  difficulty: 'easy' | 'medium' | 'hard',
): PlannedCoreQuestion {
  return {
    orderIndex,
    questionText: candidate.questionText,
    questionType: candidate.questionType,
    category: candidate.category,
    difficulty,
    source: candidate.source,
    planStatus: 'planned',
    grounding: {
      resume: candidate.resume,
      project: candidate.project,
      jd: candidate.jd,
      role: candidate.role,
      personalizationReason: candidate.personalizationReason.slice(0, 120),
      noveltyScore: candidate.novelty,
    },
    rubric: {
      ideal_keywords: [...MIN_RUBRIC.ideal_keywords],
      ideal_structure: MIN_RUBRIC.ideal_structure,
      red_flags: [...MIN_RUBRIC.red_flags],
    },
  };
}

export function pickNextPlannedCore(opts: {
  plan: readonly PlannedCoreQuestion[];
  scriptType: ScriptType;
  lastQuestionType: CoreQuestionType | null | undefined;
  alreadyAsked: readonly string[];
}): { selected: PlannedCoreQuestion | null; skipped: PlannedCoreQuestion[]; events: PlanLogEvent[] } {
  const required = nextRequiredCoreType(opts.scriptType, opts.lastQuestionType);
  const events: PlanLogEvent[] = [];
  const skipped: PlannedCoreQuestion[] = [];
  const asked = [...opts.alreadyAsked];

  const pending = opts.plan
    .filter((question) => question.planStatus === 'planned')
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex);

  for (const question of pending) {
    if (question.questionType !== required) continue;
    const duplicate = findCoreDuplicate(question.questionText, asked);
    if (duplicate.duplicate && duplicate.kind) {
      skipped.push(question);
      events.push({
        ...rejectionEvent(duplicate.kind, duplicate.score, question.questionType, question.category),
        questionNumber: question.orderIndex + 1,
        source: question.source,
      });
      continue;
    }
    events.push({
      event: 'question_selected',
      questionNumber: question.orderIndex + 1,
      questionType: question.questionType,
      category: question.category,
      source: question.source,
    });
    return { selected: question, skipped, events };
  }

  return { selected: null, skipped, events };
}
