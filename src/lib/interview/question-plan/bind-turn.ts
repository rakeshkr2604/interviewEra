/**
 * Server authority for core questions.
 *
 * A new core question is taken from the persisted plan. The model may still
 * produce follow-ups, probes, and bridges. It may not replace the next core.
 * Interviews with no plan (created before this flow) keep model questions,
 * except that an equivalent core is never persisted again.
 */

import type { ScriptType } from '@/lib/ai/scripts/script-loader';
import { canonicalizeTurnSpeech } from '@/lib/ai/scripts/speech-display-question';
import type { ScriptTurnOutput } from '@/lib/ai/scripts/turn-validator';
import { findCoreDuplicate } from './duplicate';
import { emergencyCoreQuestion, nextFallbackQuestion } from './fallback';
import { nextRequiredCoreType, pickNextPlannedCore } from './select';
import type { CoreQuestionType, PlanLogEvent, PlannedCoreQuestion, QuestionPlanContext } from './types';

export interface CoreQuestionBinding {
  turn: ScriptTurnOutput;
  askedId: string | null;
  skippedIds: string[];
  events: PlanLogEvent[];
}

export function isPersistedCoreQuestionTurn(turn: ScriptTurnOutput): boolean {
  return (
    turn.phase === 'core' &&
    turn.is_question === true &&
    turn.is_follow_up !== true &&
    Boolean(turn.display_question?.trim())
  );
}

function withoutCoreQuestion(turn: ScriptTurnOutput): ScriptTurnOutput {
  return {
    ...turn,
    speech: "Thanks. Let's keep going.",
    display_question: null,
    tip: null,
    timer_seconds: 0,
    reading_buffer_seconds: 0,
    auto_submit: false,
    is_question: false,
    is_follow_up: false,
    phase: 'core',
  };
}

function withQuestion(
  turn: ScriptTurnOutput,
  questionText: string,
  questionType: CoreQuestionType,
  difficulty: ScriptTurnOutput['question_difficulty'],
): ScriptTurnOutput {
  return canonicalizeTurnSpeech({
    ...turn,
    display_question: questionText,
    question_type: questionType,
    question_difficulty: difficulty,
    is_question: true,
    is_follow_up: false,
    phase: 'core',
  });
}

export function bindPlannedCoreQuestion(opts: {
  turn: ScriptTurnOutput;
  scriptType: ScriptType;
  lastQuestionType?: CoreQuestionType | null;
  /** null = legacy interview. An array means this interview is on the plan path. */
  plan: readonly PlannedCoreQuestion[] | null;
  alreadyAskedCore: readonly string[];
  context: QuestionPlanContext;
}): CoreQuestionBinding {
  if (!isPersistedCoreQuestionTurn(opts.turn)) {
    return { turn: opts.turn, askedId: null, skippedIds: [], events: [] };
  }

  const proposed = opts.turn.display_question?.trim() ?? '';
  const events: PlanLogEvent[] = [];

  if (opts.plan === null) {
    const duplicate = findCoreDuplicate(proposed, opts.alreadyAskedCore);
    if (!duplicate.duplicate || !duplicate.kind) {
      return { turn: opts.turn, askedId: null, skippedIds: [], events: [] };
    }
    events.push({
      event: 'question_rejected_duplicate',
      questionType: opts.turn.question_type ?? null,
      similarityScore: duplicate.score,
      rejectionReason: duplicate.kind,
      source: 'replacement',
    });
    const questionType: CoreQuestionType =
      opts.scriptType === 'SCRIPT_T'
        ? 'technical'
        : opts.scriptType === 'SCRIPT_H'
          ? 'behavioral'
          : opts.turn.question_type === 'technical' || opts.turn.question_type === 'behavioral'
            ? opts.turn.question_type
            : 'technical';
    const fallback = nextFallbackQuestion({
      context: opts.context,
      questionType,
      slot: opts.alreadyAskedCore.length,
      blocked: opts.alreadyAskedCore,
    });
    const emergency = fallback
      ? null
      : emergencyCoreQuestion({
          role: opts.context.role,
          questionType,
          blocked: opts.alreadyAskedCore,
        });
    const replacement = fallback?.text ?? emergency;
    if (!replacement || findCoreDuplicate(replacement, opts.alreadyAskedCore).duplicate) {
      events.push({
        event: 'question_plan_fallback',
        questionType,
        source: 'emergency_fallback',
        rejectionReason: 'no_replacement',
      });
      return { turn: withoutCoreQuestion(opts.turn), askedId: null, skippedIds: [], events };
    }
    const source = fallback?.personalized ? 'resume_fallback' : 'emergency_fallback';
    events.push({
      event: 'question_plan_fallback',
      questionType,
      source,
      rejectionReason: 'legacy_duplicate_replaced',
    });
    events.push({
      event: 'question_selected',
      questionType,
      source,
    });
    return {
      turn: withQuestion(opts.turn, replacement, questionType, opts.turn.question_difficulty),
      askedId: null,
      skippedIds: [],
      events,
    };
  }

  const picked = pickNextPlannedCore({
    plan: opts.plan,
    scriptType: opts.scriptType,
    lastQuestionType: opts.lastQuestionType,
    alreadyAsked: opts.alreadyAskedCore,
  });
  events.push(...picked.events);

  const proposedDuplicate = findCoreDuplicate(proposed, opts.alreadyAskedCore);
  if (proposedDuplicate.duplicate && proposedDuplicate.kind && proposed.trim() !== picked.selected?.questionText.trim()) {
    events.push({
      event: 'question_rejected_duplicate',
      questionType: opts.turn.question_type ?? null,
      similarityScore: proposedDuplicate.score,
      rejectionReason: 'llm_core_not_from_plan',
      source: 'llm_plan',
    });
  }

  if (picked.selected) {
    return {
      turn: withQuestion(
        opts.turn,
        picked.selected.questionText,
        picked.selected.questionType,
        picked.selected.difficulty,
      ),
      askedId: picked.selected.id ?? null,
      skippedIds: picked.skipped.map((question) => question.id).filter((id): id is string => Boolean(id)),
      events,
    };
  }

  const questionType = nextRequiredCoreType(opts.scriptType, opts.lastQuestionType);
  const blocked = [
    ...opts.alreadyAskedCore,
    ...opts.plan.map((question) => question.questionText),
  ];
  const fallback = nextFallbackQuestion({
    context: opts.context,
    questionType,
    slot: opts.alreadyAskedCore.length + opts.plan.length,
    blocked,
  });
  const emergency = fallback
    ? null
    : emergencyCoreQuestion({
        role: opts.context.role,
        questionType,
        blocked,
      });
  const replacement = fallback?.text ?? emergency;
  const skippedIds = picked.skipped.map((question) => question.id).filter((id): id is string => Boolean(id));
  if (!replacement || findCoreDuplicate(replacement, blocked).duplicate) {
    events.push({
      event: 'question_plan_fallback',
      questionType,
      source: 'emergency_fallback',
      rejectionReason: 'no_replacement',
    });
    return { turn: withoutCoreQuestion(opts.turn), askedId: null, skippedIds, events };
  }
  const source = fallback?.personalized ? 'resume_fallback' : 'emergency_fallback';
  events.push({
    event: 'question_plan_fallback',
    questionType,
    source,
    rejectionReason: 'plan_exhausted',
  });
  events.push({
    event: 'question_selected',
    questionType,
    source,
  });
  return {
    turn: withQuestion(opts.turn, replacement, questionType, opts.turn.question_difficulty),
    askedId: null,
    skippedIds,
    events,
  };
}

export function assignedCoreDirective(questionText: string, questionType: CoreQuestionType): string {
  return `\n\nASSIGNED CORE QUESTION: If this turn is a new core question, set is_follow_up false and display_question to exactly this text. question_type must be "${questionType}". Do not invent a different core question. One short spoken bridge is allowed.\n${questionText}`;
}
