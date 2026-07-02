import { completeInterviewChat } from '@/lib/ai/interview-completion';
import { getTokenBudget } from '@/lib/ai/token-budget';
import {
  buildCompactResumeSummary,
  clampJobDescriptionForQuestions,
} from '@/lib/interview/question-gen-input';
import { parseJsonObject } from '@/lib/ai/response-contract';
import { withOperationDeadline } from '@/lib/ai/timeout-policy';
import type { ParsedResume, Question } from '@/types/app.types';
import type { InterviewGoal } from '@/types/onboarding.types';
import { getInterviewerById, type InterviewerId } from '@/lib/config/interviewers';
import {
  normalizeInterviewMode,
  partitionByMode,
  type InterviewMode,
} from '@/lib/interview/interview-mode';
import { getTierConfig, getUserProgress } from '@/lib/retention';
import type { TierPromptModifiers, UserTierId } from '@/lib/retention';
import { deduplicateQuestions } from '@/lib/interview/deduplicate-questions';

export class QuestionGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionGenerationError';
  }
}

interface GeneratedQuestion {
  order: number;
  question_text: string;
  category: Question['category'];
  rubric: Question['rubric'];
}

export interface GenerateQuestionsResult {
  questions: GeneratedQuestion[];
}

export interface GenerateQuestionsInput {
  parsedResume: ParsedResume;
  role: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount?: number;
  goal: InterviewGoal;
  interviewMode: 'technical' | 'hr_behavioral' | 'mixed';
  experienceYears: number;
  interviewerId: InterviewerId;
  /** Employer JD excerpt — improves role alignment when present */
  jobDescription?: string;
  /**
   * When provided, calibration is sharpened with the user's retention tier.
   * Prefer passing `userTier` directly when the caller already knows it —
   * that avoids a second `getUserProgress` round-trip on the start path.
   */
  userId?: string;
  /**
   * Pre-resolved retention tier (1–4). When set, generateQuestions skips the
   * internal `getUserProgress` lookup. The route already fetches tier for the
   * cache key, so passing it through eliminates the duplicate DB read.
   */
  userTier?: UserTierId;
}

function goalToneRules(goal: InterviewGoal): string {
  switch (goal) {
    case 'fresher_placement':
      return 'goal:fresher';
    case 'job_switch':
      return 'goal:switch';
    case 'promotion_prep':
      return 'goal:promotion';
    default:
      return 'goal:practice';
  }
}

function seniorityRules(experienceYears: number): string {
  if (experienceYears <= 0) return 'yrs:0';
  if (experienceYears <= 3) return 'yrs:1-3';
  return 'yrs:4+';
}

function difficultyRules(difficulty: 'easy' | 'medium' | 'hard'): string {
  return `diff:${difficulty}`;
}

// Strict mode rules live in lib/interview/interview-mode.ts (single source of
// truth shared with the post-generation validator + follow-up lock).

function shortModeRules(mode: InterviewMode): string {
  if (mode === 'technical') return 'mode:tech-only';
  if (mode === 'hr') return 'mode:hr-only';
  return 'mode:mixed';
}

function interviewerPersonaRules(interviewerId: InterviewerId): string {
  const iv = getInterviewerById(interviewerId);
  if (!iv) return '';
  return iv.id === 'priya' ? 'iv:hr' : 'iv:tech';
}

function coerceNumber(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const n = parseInt(val.trim(), 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function coerceStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  }
  if (typeof val === 'string' && val.trim()) return [val.trim()];
  return [];
}

function normalizeCategory(raw: unknown): Question['category'] | null {
  if (typeof raw !== 'string') return null;
  const c = raw.trim().toLowerCase();
  if (c === 'technical' || c === 'tech') return 'technical';
  if (c === 'behavioral' || c === 'behavioural' || c === 'hr') return 'behavioral';
  if (c === 'situational' || c === 'scenario') return 'situational';
  return null;
}

/**
 * Self-healing coercion: models often emit numeric strings, loose categories,
 * or partial rubrics. Repair what we can instead of failing the whole interview start.
 */
function coerceQuestionsResponse(data: unknown): GeneratedQuestion[] | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const rawList = d.questions;
  if (!Array.isArray(rawList) || rawList.length === 0) return null;

  const out: GeneratedQuestion[] = [];
  for (let i = 0; i < rawList.length; i++) {
    const q = rawList[i];
    if (!q || typeof q !== 'object') continue;
    const qObj = q as Record<string, unknown>;
    const questionText =
      typeof qObj.question_text === 'string'
        ? qObj.question_text.trim()
        : typeof qObj.question === 'string'
          ? qObj.question.trim()
          : '';
    if (!questionText) continue;

    const category = normalizeCategory(qObj.category) ?? 'technical';
    const rubricRaw = (qObj.rubric ?? {}) as Record<string, unknown>;
    const idealKeywords = coerceStringArray(rubricRaw.ideal_keywords);
    const idealStructure =
      typeof rubricRaw.ideal_structure === 'string' && rubricRaw.ideal_structure.trim()
        ? rubricRaw.ideal_structure.trim()
        : 'Clear structure with context, approach, and outcome.';
    const redFlags = coerceStringArray(rubricRaw.red_flags);

    out.push({
      order: coerceNumber(qObj.order) ?? i,
      question_text: questionText,
      category,
      rubric: {
        ideal_keywords: idealKeywords.length > 0 ? idealKeywords : ['relevant', 'specific'],
        ideal_structure: idealStructure,
        red_flags: redFlags.length > 0 ? redFlags : ['vague', 'off-topic'],
      },
    });
  }

  return out.length > 0 ? out : null;
}

function tierCalibrationBlock(
  tier: UserTierId,
  modifiers: TierPromptModifiers | null,
): string {
  const difficultyHint = modifiers?.difficulty?.trim();
  const types = modifiers?.question_types?.filter((t) => typeof t === 'string' && t.length > 0);
  const parts = [`Tier${tier}`];
  if (difficultyHint) parts.push(difficultyHint);
  if (types && types.length > 0) parts.push(types.slice(0, 3).join(','));
  return parts.join(' · ');
}

async function resolveTierCalibration(
  userId: string | undefined,
  userTier: UserTierId | undefined,
): Promise<string> {
  let tier: UserTierId;
  if (userTier !== undefined) {
    tier = userTier;
  } else if (userId !== undefined) {
    const progress = await getUserProgress(userId);
    tier = (progress?.current_tier as UserTierId | undefined) ?? 1;
  } else {
    return '';
  }
  const cfg = await getTierConfig(tier);
  const modifiers = (cfg?.prompt_modifiers ?? null) as TierPromptModifiers | null;
  return tierCalibrationBlock(tier, modifiers);
}

async function callOpenAI(prompt: string, signal: AbortSignal): Promise<string> {
  const { content } = await completeInterviewChat({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    maxTokens: getTokenBudget('question_generation'),
    operation: 'question_generation',
    jsonMode: true,
    signal,
  });
  return content;
}

export async function generateQuestions({
  parsedResume,
  role,
  difficulty,
  questionCount = 6,
  goal,
  interviewMode,
  experienceYears,
  interviewerId,
  jobDescription,
  userId,
  userTier,
}: GenerateQuestionsInput): Promise<GenerateQuestionsResult> {
  const t0 = Date.now();
  const canonicalMode = normalizeInterviewMode(interviewMode);
  const resumeSummary = buildCompactResumeSummary(parsedResume, role);
  const jdSnippet = clampJobDescriptionForQuestions(jobDescription);
  const jdBlock = jdSnippet ? `\nJD:${jdSnippet}\n` : '';

  // Tier calibration uses `userTier` if the route has already fetched it,
  // otherwise falls back to a single getUserProgress lookup. Either way we
  // never hit user_progress twice on the same start request.
  const tierBlock = await resolveTierCalibration(userId, userTier);

  const calibration =
    [
      goalToneRules(goal),
      seniorityRules(experienceYears),
      difficultyRules(difficulty),
      shortModeRules(canonicalMode),
      interviewerPersonaRules(interviewerId),
      tierBlock,
    ]
      .filter((s) => s.length > 0)
      .join('\n');

  const prompt =
    `Generate exactly ${questionCount} interview questions for ${role}.\n` +
    `Profile:${resumeSummary}${jdBlock}\n` +
    `Calib:${calibration}\n` +
    `Rules: resume-specific, no duplicates, short rubrics (max 3 keywords, 1-line structure).\n` +
    `JSON only:{"questions":[{"order":0,"question_text":"","category":"technical|behavioral|situational",` +
    `"rubric":{"ideal_keywords":[],"ideal_structure":"","red_flags":[]}}]}`;

  /** Single LLM call — resolve-interview-questions uses deterministic fallback on failure. */
  const MAX_ATTEMPTS = 1;
  let lastError: QuestionGenerationError | null = null;

  try {
    return await withOperationDeadline('question_generation', async (signal) => {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (signal.aborted) {
          throw new QuestionGenerationError(
            'Question generation timed out. Please try again.',
          );
        }

        try {
          const aiStart = Date.now();
          const content = await callOpenAI(prompt, signal);
          const aiMs = Date.now() - aiStart;

          if (!content || content.trim().length === 0) {
            throw new QuestionGenerationError(
              'Failed to generate questions: AI returned empty response. Please try again.',
            );
          }

          const jsonStart = Date.now();
          const parseResult = parseJsonObject(content);
          const jsonMs = Date.now() - jsonStart;
          if (!parseResult.ok) {
            console.error('[generate-questions] JSON parse failed:', {
              attempt,
              error: parseResult.error,
              rawPreview: parseResult.rawPreview,
              contentLength: content.length,
              contentStart: content.slice(0, 200),
            });
            throw new QuestionGenerationError(
              'Failed to parse questions: invalid JSON from AI',
            );
          }

          const coerced = coerceQuestionsResponse(parseResult.value);
          if (!coerced || coerced.length === 0) {
            throw new QuestionGenerationError(
              'Failed to parse questions: AI response missing required fields',
            );
          }

          const { valid, violating } = partitionByMode(coerced, canonicalMode);

          if (violating.length > 0) {
            console.warn(
              `[generate-questions] Mode "${canonicalMode}" violated by ${violating.length}/${coerced.length} ` +
              `questions (categories: ${[...new Set(violating.map((q) => q.category))].join(', ')}).`,
            );
          }

          // Prefer mode-valid questions; if too few, use full set so start never
          // fails when the model returned enough questions with wrong categories.
          let pool = valid;
          if (valid.length < questionCount && coerced.length >= questionCount) {
            console.warn(
              `[generate-questions] Using ${coerced.length} questions despite mode filter (need ${questionCount} for ${canonicalMode})`,
            );
            pool = coerced;
          } else if (valid.length === 0 && coerced.length > 0) {
            pool = coerced;
          }

          const deduped = deduplicateQuestions(pool);
          if (deduped.length < pool.length) {
            console.warn(
              `[generate-questions] Removed ${pool.length - deduped.length} duplicate/near-duplicate questions`,
            );
          }

          const enforced = deduped
            .slice(0, questionCount)
            .map((q, idx) => ({ ...q, order: idx }));

          if (enforced.length < questionCount) {
            throw new QuestionGenerationError(
              `Only ${enforced.length} questions generated (need ${questionCount})`,
            );
          }

          console.info(
            '[question-gen-pipeline]',
            JSON.stringify({
              pipelineMs: Date.now() - t0,
              aiMs,
              jsonMs,
              attempt,
              count: enforced.length,
              mode: canonicalMode,
              promptChars: prompt.length,
            }),
          );

          return { questions: enforced };
        } catch (err) {
          if (err instanceof QuestionGenerationError) {
            lastError = err;
            if (attempt < MAX_ATTEMPTS && !signal.aborted) {
              console.warn(`[generate-questions] Attempt ${attempt} failed, retrying:`, err.message);
              continue;
            }
            throw err;
          }
          throw err;
        }
      }

      throw lastError ?? new QuestionGenerationError('Failed to generate questions. Please try again.');
    });
  } catch (err) {
    if (err instanceof QuestionGenerationError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('deadline') || msg.includes('timeout') || msg.includes('Abort')) {
      throw new QuestionGenerationError('Question generation timed out. Please try again.');
    }
    if (msg.includes('Interview AI completion failed') || msg.includes('OpenRouter unavailable')) {
      throw new QuestionGenerationError('AI service is temporarily unavailable. Please try again shortly.');
    }
    console.error('[generate-questions] Unexpected error:', err);
    throw new QuestionGenerationError('Failed to generate questions. Please try again.');
  }
}
