import { completeInterviewChat } from '@/lib/ai/interview-completion';
import { getTokenBudget } from '@/lib/ai/token-budget';
import { getContextLimits } from '@/lib/ai/operation-registry';
import { clampText } from '@/lib/ai/context-hygiene';
import { parseJsonObject } from '@/lib/ai/response-contract';
import { withOperationDeadline } from '@/lib/ai/timeout-policy';
import type { ParsedResume, Question } from '@/types/app.types';
import type { InterviewGoal } from '@/types/onboarding.types';
import { getInterviewerById, type InterviewerId } from '@/lib/config/interviewers';
import {
  modeGenerationRules,
  normalizeInterviewMode,
  partitionByMode,
} from '@/lib/interview/interview-mode';
import { getTierConfig, getUserProgress } from '@/lib/retention';
import type { TierPromptModifiers, UserTierId } from '@/lib/retention';

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
      return (
        `Goal: Fresher placement — prioritize fundamentals and concrete projects from the resume; ` +
        `avoid system architecture or large-scale design questions; keep scenarios internship/placement appropriate.`
      );
    case 'job_switch':
      return (
        `Goal: Job switch — emphasize transferable skills, motivations for change, stack fit, ` +
        `and how past wins apply to the target role.`
      );
    case 'promotion_prep':
      return (
        `Goal: Promotion prep — emphasize leadership, ownership, stakeholder decisions, ` +
        `and justified trade-offs for senior scope.`
      );
    case 'general_practice':
    default:
      return `Goal: General practice — balanced tone without biasing toward one career stage.`;
  }
}

function seniorityRules(experienceYears: number): string {
  if (experienceYears <= 0) {
    return (
      `Seniority: 0 years — conceptual clarity, definitions, and explain-your-project depth only; ` +
      `no expectation of production war stories or large-scale architecture.`
    );
  }
  if (experienceYears <= 3) {
    return (
      `Seniority: 1–3 years — applied scenarios, debugging, ownership of features, ` +
      `and realistic team workflows; moderate depth.`
    );
  }
  return (
    `Seniority: 4+ years — architectural choices, trade-offs, scale/reliability, ` +
    `mentorship, and stakeholder judgment where relevant to the role.`
  );
}

function difficultyRules(difficulty: 'easy' | 'medium' | 'hard'): string {
  switch (difficulty) {
    case 'easy':
      return `Difficulty: Easy — favor definitions, straightforward scenarios, and foundational reasoning.`;
    case 'hard':
      return `Difficulty: Hard — include edge cases, trade-offs, and failure modes where appropriate to mode and seniority.`;
    case 'medium':
    default:
      return `Difficulty: Medium — balanced application-level scenarios with some depth.`;
  }
}

// Strict mode rules live in lib/interview/interview-mode.ts (single source of
// truth shared with the post-generation validator + follow-up lock).

function interviewerPersonaRules(interviewerId: InterviewerId): string {
  const iv = getInterviewerById(interviewerId);
  if (!iv) return '';
  if (iv.id === 'priya') {
    return (
      `Interviewer persona: Priya (Senior Recruiter) — warm, rapport-building openers, HR-lean phrasing, ` +
      `professional but supportive framing in how questions are written.`
    );
  }
  return (
    `Interviewer persona: Arjun (Technical Lead) — direct, concise questions with technical pressure; ` +
    `minimal hand-holding; expect precise reasoning in the prompts.`
  );
}

function buildResumeSummary(resume: ParsedResume, role: string): string {
  const skills = resume.skills.slice(0, 15).join(', ');
  const exp = resume.experience
    .map((e) => `${e.role} at ${e.company} (${e.duration})`)
    .join('; ');
  const projects = resume.projects
    .map((p) => {
      const tech = p.tech_stack.slice(0, 4).join(', ');
      const desc = p.description.trim();
      const short = desc.length > 140 ? `${desc.slice(0, 137)}…` : desc;
      return `${p.name}${tech ? ` [${tech}]` : ''}${short ? `: ${short}` : ''}`;
    })
    .join(' | ');
  const education = resume.education
    .slice(0, 3)
    .map((e) => `${e.degree} at ${e.institution} (${e.year})`)
    .join('; ');
  return (
    `Name: ${resume.name}. Target role: ${role}. Skills: ${skills}.` +
    (exp ? ` Experience: ${exp}.` : '') +
    (projects ? ` Projects: ${projects}.` : '') +
    (education ? ` Education: ${education}.` : '')
  );
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

function getTierSpecificGuidance(tier: UserTierId): string {
  switch (tier) {
    case 1:
      return (
        `- Lean on basic behavioral questions and resume-rooted prompts.\n` +
        `- Keep technical asks fundamental; test communication and basic problem-solving.`
      );
    case 2:
      return (
        `- Go deeper on technical reasoning and follow-up probes.\n` +
        `- Introduce light system-design thinking and advanced problem-solving.`
      );
    case 3:
      return (
        `- Include service-company patterns (TCS/Infosys/Wipro style) where relevant.\n` +
        `- Ask about scalability, trade-offs, multi-part scenarios, and production realities.`
      );
    case 4:
      return (
        `- Use panel-style prompts with multiple angles and stress framing.\n` +
        `- Weave in cross-functional, leadership, and ownership considerations.`
      );
    default:
      return '';
  }
}

function tierCalibrationBlock(
  tier: UserTierId,
  modifiers: TierPromptModifiers | null,
): string {
  const difficultyHint = modifiers?.difficulty?.trim();
  const types = modifiers?.question_types?.filter((t) => typeof t === 'string' && t.length > 0);
  const lines = [`Retention tier: Tier ${tier} — calibrate difficulty accordingly.`];
  if (difficultyHint) lines.push(`Tier difficulty band: ${difficultyHint}.`);
  if (types && types.length > 0) lines.push(`Tier question types to favor: ${types.join(', ')}.`);
  const guidance = getTierSpecificGuidance(tier);
  if (guidance) lines.push(guidance);
  return lines.join('\n');
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

/**
 * Single-attempt completion in plain text mode. The historic json_object→plain
 * same-model retry inside interview-completion is bypassed by passing
 * `jsonMode: false` — we rely on `parseJsonObject` (which handles fenced and
 * dirty output via brace-matching) to extract the JSON from a plain response.
 *
 * The AbortSignal threads through provider fetches so the operation-level
 * deadline aborts in-flight HTTP requests instead of waiting them out.
 */
async function callOpenAI(prompt: string, signal: AbortSignal): Promise<string> {
  const { content } = await completeInterviewChat({
    messages:  [{ role: 'user', content: prompt }],
    temperature: 0.7,
    maxTokens:   getTokenBudget('question_generation'),
    operation:   'question_generation',
    jsonMode:    false,
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
  const resumeSummary = buildResumeSummary(parsedResume, role);
  const jdCap = getContextLimits('question_generation').maxInputChars;
  const trimmedJd = jobDescription?.trim();
  const jdSnippet = trimmedJd ? clampText(trimmedJd, jdCap) : undefined;
  const jdBlock = jdSnippet
    ? `\nEmployer job description (align competencies and scenarios with this posting; do not paste it verbatim into questions):\n${jdSnippet}\n`
    : '';

  // Tier calibration uses `userTier` if the route has already fetched it,
  // otherwise falls back to a single getUserProgress lookup. Either way we
  // never hit user_progress twice on the same start request.
  const tierBlock = await resolveTierCalibration(userId, userTier);

  const calibration =
    [
      goalToneRules(goal),
      seniorityRules(experienceYears),
      difficultyRules(difficulty),
      modeGenerationRules(canonicalMode),
      interviewerPersonaRules(interviewerId),
      tierBlock,
    ]
      .filter((s) => s.length > 0)
      .join('\n');

  const prompt =
    `You are an expert interviewer at a top Indian tech company.\n` +
    `Generate exactly ${questionCount} interview questions for a ${role} position.\n` +
    `The candidate's profile: ${resumeSummary}${jdBlock}\n` +
    `${calibration}\n\n` +
    `Rules:\n` +
    `- Questions must reference concrete skills, employers, projects, or education from the profile when applicable.\n` +
    `- No repetitive or overlapping questions.\n` +
    `- Each question must include a rubric suitable for evaluation.\n\n` +
    `Return ONLY valid JSON:\n` +
    `{\n` +
    `  "questions": [{\n` +
    `    "order": number,\n` +
    `    "question_text": string,\n` +
    `    "category": "technical" | "behavioral" | "situational",\n` +
    `    "rubric": {\n` +
    `      "ideal_keywords": string[],\n` +
    `      "ideal_structure": string,\n` +
    `      "red_flags": string[]\n` +
    `    }\n` +
    `  }]\n` +
    `}`;

  // Up to 2 LLM attempts when parse/coercion/mode-filter leaves too few questions.
  const MAX_ATTEMPTS = 2;
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
          const content = await callOpenAI(prompt, signal);

          if (!content || content.trim().length === 0) {
            throw new QuestionGenerationError(
              'Failed to generate questions: AI returned empty response. Please try again.',
            );
          }

          const parseResult = parseJsonObject(content);
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

          const enforced = pool
            .slice(0, questionCount)
            .map((q, idx) => ({ ...q, order: idx }));

          if (enforced.length < questionCount) {
            throw new QuestionGenerationError(
              `Only ${enforced.length} questions generated (need ${questionCount})`,
            );
          }

          console.log(
            `[generate-questions] completed in ${Date.now() - t0}ms ` +
            `(attempt=${attempt}, ${enforced.length} questions, mode=${canonicalMode})`,
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
