import { z } from 'zod';
import { completeInterviewChat } from '@/lib/ai/interview-completion';
import { getTokenBudget } from '@/lib/ai/token-budget';
import { withOperationDeadline } from '@/lib/ai/timeout-policy';
import { clampInputForOperation } from '@/lib/ai/context-hygiene';
import { parseJsonObject } from '@/lib/ai/response-contract';
import type { QuestionRubric, DimensionScores, DetailedAnalysis, ScoreJustification } from '@/types/app.types';
import type { AnswerStyle } from '@/lib/settings/client-preferences';
import { recordProviderOutcome } from '@/lib/ai/provider-intelligence';
import { emitAiTelemetry } from '@/lib/observability/ai-telemetry';

export type EvaluationProvider = 'openrouter' | 'openai' | 'mistral';

export interface EvaluateAnswerInput {
  questionText: string;
  rubric: QuestionRubric;
  answerText: string;
  /** Settings preference — calibrates structure/length expectations in scoring. */
  answerStyle?: AnswerStyle;
}

export interface EvaluationResult {
  overall_score: number;
  dimension_scores: DimensionScores;
  feedback_text: string;
  score_justification: ScoreJustification;
  detailed_analysis: DetailedAnalysis;
  provider: EvaluationProvider;
}

const WEIGHTS: Record<keyof DimensionScores, number> = {
  communication_clarity: 0.2,
  technical_depth: 0.25,
  answer_structure: 0.2,
  confidence: 0.15,
  relevance: 0.2,
};

function computeWeightedScore(dims: DimensionScores): number {
  return (
    dims.communication_clarity * WEIGHTS.communication_clarity +
    dims.technical_depth * WEIGHTS.technical_depth +
    dims.answer_structure * WEIGHTS.answer_structure +
    dims.confidence * WEIGHTS.confidence +
    dims.relevance * WEIGHTS.relevance
  );
}

function clamp(score: number): number {
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

function normalizeScoreJustification(raw: unknown): ScoreJustification | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const why =
    typeof o.why_this_score === 'string' ? o.why_this_score.replace(/\s+/g, ' ').trim() : '';
  if (!why) return null;

  const pickTwo = (key: string): [string, string] => {
    const arr = Array.isArray(o[key]) ? o[key] : [];
    const strs = (arr as unknown[])
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const fallbackB =
      strs.length > 0 ? 'Extend the strongest thread with metrics or clearer trade-offs.' : '—';
    const a = strs[0] ?? 'Ground feedback in specifics from your answer.';
    const b = strs[1] ?? strs[0] ?? fallbackB;
    return [a, b];
  };

  const [sa, sb] = pickTwo('key_strengths');
  const [ia, ib] = pickTwo('improvement_areas');

  return {
    why_this_score: why,
    key_strengths: [sa, sb],
    improvement_areas: [ia, ib],
  };
}

/** Coerce "8", 8, "8.5", " 7 " → number; null when genuinely unparseable. */
function coerceNumber(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const n = parseFloat(val.trim());
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

/**
 * Self-healing coercion: AI models routinely emit numeric strings, omit optional
 * arrays, or wrap dimension scores loosely. Rather than rejecting usable output
 * (which silently degrades the whole interview), coerce + default + log fixes.
 * Returns null ONLY when the response is structurally unusable (no dimensions at all).
 */
function coerceEvaluation(
  data: unknown,
  source: string,
): Omit<EvaluationResult, 'provider'> | null {
  if (!data || typeof data !== 'object') {
    console.error(`[JSON_PARSE][${source}] ✗ Not an object — unusable`);
    return null;
  }
  const d = data as Record<string, unknown>;
  const fixes: string[] = [];

  const dimsRaw = (d.dimension_scores ?? {}) as Record<string, unknown>;
  const dimFields: (keyof DimensionScores)[] = [
    'communication_clarity',
    'technical_depth',
    'answer_structure',
    'confidence',
    'relevance',
  ];

  let presentDims = 0;
  const dims = {} as DimensionScores;
  for (const f of dimFields) {
    const n = coerceNumber(dimsRaw[f]);
    if (n === null) {
      dims[f] = 5; // neutral default keeps the evaluation usable
      fixes.push(`dimension_scores.${f}→default(5)`);
    } else {
      if (typeof dimsRaw[f] !== 'number') fixes.push(`dimension_scores.${f}:string→num`);
      dims[f] = n;
      presentDims++;
    }
  }

  // No usable dimension at all → genuinely unusable, let caller fall back.
  if (presentDims === 0) {
    console.error(`[JSON_PARSE][${source}] ✗ Zero usable dimension scores — unusable`);
    return null;
  }

  const overallRaw = coerceNumber(d.overall_score);
  const overall_score = overallRaw ?? computeWeightedScore(dims);
  if (overallRaw === null) fixes.push('overall_score→computed-from-dims');
  else if (typeof d.overall_score !== 'number') fixes.push('overall_score:string→num');

  const feedback_text =
    typeof d.feedback_text === 'string' && d.feedback_text.trim()
      ? d.feedback_text.trim()
      : 'Your answer was recorded. Focus on adding specific examples and measurable outcomes.';
  if (feedback_text !== d.feedback_text) fixes.push('feedback_text→default');

  // score_justification is reconstructable from feedback if missing/partial.
  let scoreJustification = normalizeScoreJustification(d.score_justification);
  if (!scoreJustification) {
    scoreJustification = normalizeScoreJustification({
      why_this_score: feedback_text,
      key_strengths: coerceStringArray(
        (d.detailed_analysis as Record<string, unknown> | undefined)?.strengths,
      ),
      improvement_areas: coerceStringArray(
        (d.detailed_analysis as Record<string, unknown> | undefined)?.improvements,
      ),
    });
    fixes.push('score_justification→reconstructed');
  }
  if (!scoreJustification) {
    // normalizeScoreJustification still failed (empty why) — synthesize minimal valid.
    scoreJustification = {
      why_this_score: feedback_text,
      key_strengths: [
        'Engaged with the question.',
        'Provided a relevant response.',
      ],
      improvement_areas: [
        'Add concrete, specific examples.',
        'Quantify outcomes where possible.',
      ],
    };
    fixes.push('score_justification→synthesized');
  }

  const analysisRaw = (d.detailed_analysis ?? {}) as Record<string, unknown>;
  const rawHint = analysisRaw.model_answer_hint;
  const model_answer_hint =
    typeof rawHint === 'string' && rawHint.trim() ? rawHint.trim() : '';
  if (!model_answer_hint) {
    console.warn(
      `[evaluate-answer][${source}] model_answer_hint missing or empty — PDF will show fallback message`,
      { rawHint },
    );
    fixes.push('model_answer_hint→empty(fallback-will-show)');
  }
  const detailed_analysis: DetailedAnalysis = {
    strengths: coerceStringArray(analysisRaw.strengths),
    improvements: coerceStringArray(analysisRaw.improvements),
    model_answer_hint,
    keywords_missing: coerceStringArray(analysisRaw.keywords_missing),
    score_justification: scoreJustification,
  };

  if (fixes.length > 0) {
    console.warn(
      `[evaluate-answer][coerce][${source}] auto-healed ${fixes.length} field(s): ${fixes.join(', ')}`,
    );
    emitAiTelemetry({
      event:           'ai_json_repair',
      operation:       'answer_evaluation',
      provider:        source.startsWith('mistral') ? 'mistral' : source === 'openai' ? 'openai' : 'openrouter',
      model:           'unknown',
      fields_repaired: fixes.length,
      repair_actions:  fixes.join(',').slice(0, 300),
    });
  }

  return {
    overall_score,
    dimension_scores: dims,
    feedback_text,
    score_justification: scoreJustification,
    detailed_analysis,
  };
}

// Zod schema for fast-path validation — if AI output satisfies this exactly, skip coercion
const EvaluationZodSchema = z.object({
  overall_score: z.number().min(1).max(10),
  dimension_scores: z.object({
    communication_clarity: z.number().min(1).max(10),
    technical_depth: z.number().min(1).max(10),
    answer_structure: z.number().min(1).max(10),
    confidence: z.number().min(1).max(10),
    relevance: z.number().min(1).max(10),
  }),
  feedback_text: z.string().min(1),
  score_justification: z.object({
    why_this_score: z.string().min(1),
    key_strengths: z.array(z.string()),
    improvement_areas: z.array(z.string()),
  }),
  detailed_analysis: z.object({
    strengths: z.array(z.string()),
    improvements: z.array(z.string()),
    model_answer_hint: z.string(),
    keywords_missing: z.array(z.string()),
  }),
});

function answerStyleInstruction(style: AnswerStyle | undefined): string {
  if (!style) return '';
  const lines: Record<AnswerStyle, string> = {
    concise:
      'The candidate prefers concise answers: reward clear, direct responses; do not penalize brevity if the question is fully addressed.',
    balanced:
      'The candidate prefers balanced answers: expect brief structure (context → points → takeaway) without excessive length.',
    detailed:
      'The candidate prefers detailed answers: reward substantive depth and examples; only penalize if rambling or off-topic.',
  };
  return `\nCandidate answer-length preference (from their settings): ${style}. ${lines[style]}\n`;
}

function buildPrompt(
  questionText: string,
  rubric: QuestionRubric,
  answerText: string,
  answerStyle?: AnswerStyle,
): string {
  return (
    `You are an expert interview evaluator. Score the following answer strictly and fairly.\n\n` +
    `Question: ${questionText}\n` +
    `Rubric: ${JSON.stringify(rubric)}\n` +
    `Candidate's Answer: ${answerText}\n` +
    answerStyleInstruction(answerStyle) +
    `\n` +
    `Score each dimension from 1–10 (1=very poor, 10=excellent).\n` +
    `Be strict. A score of 7+ means genuinely good. Do not inflate scores.\n` +
    `Cultural context: this is an Indian campus-placement candidate. Hinglish ` +
    `(English–Hindi code-switching) is normal and must NOT lower communication_clarity ` +
    `or any score unless it genuinely impairs comprehension of the answer.\n\n` +
    `Return ONLY valid JSON, no markdown, no explanation:\n` +
    `{\n` +
    `  "overall_score": number (weighted average),\n` +
    `  "dimension_scores": {\n` +
    `    "communication_clarity": number,\n` +
    `    "technical_depth": number,\n` +
    `    "answer_structure": number,\n` +
    `    "confidence": number,\n` +
    `    "relevance": number\n` +
    `  },\n` +
    `  "feedback_text": string (2–3 sentences. QUOTE or paraphrase the candidate's actual words, name the specific gap, and show a concrete stronger phrasing. No generic "lacks clarity" filler),\n` +
    `  "score_justification": {\n` +
    `    "why_this_score": string (2–3 sentences explaining why the overall score fits THIS answer; reference concrete content from the answer; do NOT reveal scoring formulas, rubric weights, dimension percentages, or how numbers are combined),\n` +
    `    "key_strengths": string[] (exactly 2 items: specific things done well in this answer),\n` +
    `    "improvement_areas": string[] (exactly 2 items: specific actionable improvements for this answer)\n` +
    `  },\n` +
    `  "detailed_analysis": {\n` +
    `    "strengths": string[],\n` +
    `    "improvements": string[],\n` +
    `    "model_answer_hint": string (REQUIRED — 3–4 bullet points using • showing what a strong answer includes: core method/structure expected, evidence or metrics needed, ownership language, one example phrasing; must NEVER be empty or generic),\n` +
    `    "keywords_missing": string[]\n` +
    `  }\n` +
    `}`
  );
}

function normalizeResult(
  parsed: Omit<EvaluationResult, 'provider'>,
  provider: EvaluationProvider,
): EvaluationResult {
  const dims: DimensionScores = {
    communication_clarity: clamp(parsed.dimension_scores.communication_clarity),
    technical_depth: clamp(parsed.dimension_scores.technical_depth),
    answer_structure: clamp(parsed.dimension_scores.answer_structure),
    confidence: clamp(parsed.dimension_scores.confidence),
    relevance: clamp(parsed.dimension_scores.relevance),
  };

  const overallScore = clamp(computeWeightedScore(dims));
  const scoreJustification = normalizeScoreJustification(parsed.score_justification);
  if (!scoreJustification) {
    throw new Error('score_justification normalization failed');
  }

  return {
    overall_score: overallScore,
    dimension_scores: dims,
    feedback_text: parsed.feedback_text,
    score_justification: scoreJustification,
    detailed_analysis: {
      strengths: parsed.detailed_analysis.strengths,
      improvements: parsed.detailed_analysis.improvements,
      model_answer_hint: parsed.detailed_analysis.model_answer_hint,
      keywords_missing: parsed.detailed_analysis.keywords_missing,
      score_justification: scoreJustification,
    },
    provider,
  };
}

function tryParseResponse(
  content: string,
  source: string,
): Omit<EvaluationResult, 'provider'> | null {
  const pr = parseJsonObject(content);
  if (!pr.ok) {
    console.error(`[JSON_PARSE][${source}] ✗ ${pr.error}`, pr.rawPreview?.slice(0, 200));
    return null;
  }
  let parsed: unknown = pr.value;
  if (pr.repairedVia !== 'direct') {
    console.log(`[JSON_PARSE][${source}] ✓ Recovered JSON via ${pr.repairedVia}`);
  }

  // Fast path: perfect schema match → skip coercion entirely (eliminates Auto-healed log noise)
  const zodResult = EvaluationZodSchema.safeParse(parsed);
  if (zodResult.success) {
    const d = zodResult.data;
    const scoreJustification = normalizeScoreJustification(d.score_justification);
    if (scoreJustification) {
      return {
        overall_score: d.overall_score,
        dimension_scores: d.dimension_scores,
        feedback_text: d.feedback_text,
        score_justification: scoreJustification,
        detailed_analysis: { ...d.detailed_analysis, score_justification: scoreJustification },
      };
    }
  }

  // Self-healing coercion replaces strict validation: only genuinely unusable
  // structures return null (→ retry/fallback). Minor format issues are repaired.
  return coerceEvaluation(parsed, source);
}

const EVALUATOR_SYSTEM_PROMPT = `You are an experienced interviewer writing post-interview feedback — not a rubric robot filling in a template.

FEEDBACK QUALITY RULES (non-negotiable):
- Be SPECIFIC to what THIS candidate said. Quote or paraphrase their actual words in every feedback field.
- Be ACTIONABLE: show what a stronger version of their answer would look like — don't just label the gap.
- NEVER use generic filler on its own: banned phrases include "lacks clarity", "needs more structure", "be more specific", "improve communication", "be more confident", "provide more examples".
- feedback_text should read like a real interviewer speaking to the candidate, not like a grading rubric.

WRONG (banned, generic):
  "The answer lacks clarity and structure. You should provide specific examples to support your points."

RIGHT (specific, quoted, shows what better looks like):
  "You said 'I used MongoDB for flexibility' — but which schema decision did that flexibility enable? Naming it, e.g. 'I embedded order items to avoid a join on the read path', would show real depth here."

Apply this standard to: feedback_text, score_justification.why_this_score, and detailed_analysis.improvements.

MODEL ANSWER HINT — 3–4 bullets (•): concept tested, evidence/metrics, ownership language, one strong phrasing line for this question.

CRITICAL: ONLY valid JSON — no markdown fences or prose outside the object.

Required structure:
{
  "overall_score": <number 1-10>,
  "dimension_scores": {
    "communication_clarity": <number 1-10>,
    "technical_depth": <number 1-10>,
    "answer_structure": <number 1-10>,
    "confidence": <number 1-10>,
    "relevance": <number 1-10>
  },
  "feedback_text": "<2-3 sentences, recruiter-tone, specific to what they said, actionable>",
  "score_justification": {
    "why_this_score": "<2-3 sentences referencing concrete content from their answer; no rubric formula language>",
    "key_strengths": ["<specific strength from this answer>", "<specific strength from this answer>"],
    "improvement_areas": ["<specific actionable improvement for this answer>", "<specific actionable improvement for this answer>"]
  },
  "detailed_analysis": {
    "strengths": ["<string>"],
    "improvements": ["<string>"],
    "model_answer_hint": "<REQUIRED: 3–4 bullet points using • showing what a strong answer includes for this specific question. Must NEVER be empty or a generic restatement of the question.>",
    "keywords_missing": ["<string>"]
  }
}

Scoring: 7+ means genuinely good. Be strict. Do not inflate. Indian candidates often answer in Hinglish (English–Hindi code-switching) — treat this as normal; never penalize it unless it genuinely impairs comprehension. OUTPUT ONLY THE JSON OBJECT.`;

async function evaluateWithPrimaryChain(
  prompt: string,
  signal: AbortSignal,
): Promise<EvaluationResult> {
  const messages = [
    { role: 'system' as const, content: EVALUATOR_SYSTEM_PROMPT },
    { role: 'user' as const, content: prompt },
  ];

  const t0 = Date.now();
  const result = await completeInterviewChat({
    messages,
    temperature: 0.3,
    maxTokens:   getTokenBudget('answer_evaluation'),
    operation:   'answer_evaluation',
    jsonMode:    true,
    signal,
  });
  const parsed = tryParseResponse(result.content, 'openrouter');
  recordProviderOutcome({
    provider:       'openrouter',
    operation:      'answer_evaluation',
    latencyMs:      Date.now() - t0,
    success:        parsed !== null,
    timeout:        false,
    quotaExhausted: false,
    jsonValid:      parsed !== null,
  });
  if (!parsed) {
    throw new Error('Failed to parse evaluation response from OpenRouter');
  }
  return normalizeResult(parsed, 'openrouter');
}

export async function evaluateAnswer({
  questionText,
  rubric,
  answerText,
  answerStyle,
}: EvaluateAnswerInput): Promise<EvaluationResult> {
  return withOperationDeadline('answer_evaluation', async (signal) => {
    const boundedAnswer = clampInputForOperation(answerText, 'answer_evaluation');
    const prompt = buildPrompt(questionText, rubric, boundedAnswer, answerStyle);
    return evaluateWithPrimaryChain(prompt, signal);
  });
}
