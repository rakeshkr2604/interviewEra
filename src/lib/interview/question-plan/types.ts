import type { QuestionCategory, QuestionRubric } from '@/types/app.types';

/** Core slot type. Situational prompts use category situational and type behavioral. */
export type CoreQuestionType = 'technical' | 'behavioral';

export type QuestionPlanSource =
  | 'llm_plan'
  | 'resume_fallback'
  | 'emergency_fallback'
  | 'replacement';

export type QuestionPlanRowStatus = 'planned' | 'asked' | 'skipped';

/** Session marker. Absent on interviews created before the plan existed. */
export type QuestionPlanMarker = 'pending' | 'ready';

/**
 * Candidate pool size relative to the interview's core-question count.
 * 2N keeps one extra generation inside the question-plan token budget
 * while still leaving room to drop duplicates before the final N.
 */
export const QUESTION_PLAN_POOL_MULTIPLIER = 2;

export interface QuestionGrounding {
  resume: boolean;
  project: boolean;
  jd: boolean;
  role: boolean;
  personalizationReason: string;
  noveltyScore: number;
}

export interface PlannedCoreQuestion {
  id?: string;
  orderIndex: number;
  questionText: string;
  questionType: CoreQuestionType;
  category: QuestionCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  source: QuestionPlanSource;
  planStatus: QuestionPlanRowStatus;
  grounding: QuestionGrounding;
  rubric: QuestionRubric;
}

export interface PoolQuestion {
  questionText: string;
  category: QuestionCategory;
  questionType: CoreQuestionType;
  groundingKind: 'project' | 'resume' | 'jd' | 'role' | 'general';
  personalizationReason: string;
  source: QuestionPlanSource;
}

export interface QuestionPlanContext {
  role: string;
  skills: string[];
  projects: string[];
  jobDescription?: string;
}

export interface PlanTimings {
  poolMs: number;
  llmMs: number;
  duplicateFilterMs: number;
  noveltyMs: number;
  persistMs: number;
  totalMs: number;
}

export interface PlanLogEvent {
  event:
    | 'question_plan_generated'
    | 'question_plan_persisted'
    | 'question_selected'
    | 'question_rejected_duplicate'
    | 'question_rejected_low_novelty'
    | 'question_plan_fallback'
    | 'question_plan_generation_failed';
  questionNumber?: number;
  questionType?: CoreQuestionType | null;
  category?: QuestionCategory | null;
  source?: QuestionPlanSource | null;
  planStatus?: QuestionPlanRowStatus | null;
  similarityScore?: number;
  rejectionReason?: string;
  latencyMs?: number;
  timings?: PlanTimings;
}
