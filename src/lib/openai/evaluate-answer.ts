import { completeInterviewChat } from '@/lib/ai/interview-completion';
import { callMistralChat } from '@/lib/mistral/client';
import type { QuestionRubric, DimensionScores, DetailedAnalysis, ScoreJustification } from '@/types/app.types';
import type { AnswerStyle } from '@/lib/settings/client-preferences';

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

function extractJSON(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return content.trim();
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

function isValidEvaluation(data: unknown): data is Omit<EvaluationResult, 'provider'> {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  if (typeof d.overall_score !== 'number') return false;
  if (typeof d.feedback_text !== 'string') return false;
  if (normalizeScoreJustification(d.score_justification) === null) return false;

  const dims = d.dimension_scores as Record<string, unknown>;
  if (!dims || typeof dims !== 'object') return false;
  const dimFields: (keyof DimensionScores)[] = [
    'communication_clarity',
    'technical_depth',
    'answer_structure',
    'confidence',
    'relevance',
  ];
  if (!dimFields.every((f) => typeof dims[f] === 'number')) return false;

  const analysis = d.detailed_analysis as Record<string, unknown>;
  if (!analysis || typeof analysis !== 'object') return false;
  if (!Array.isArray(analysis.strengths)) return false;
  if (!Array.isArray(analysis.improvements)) return false;
  if (typeof analysis.model_answer_hint !== 'string') return false;
  if (!Array.isArray(analysis.keywords_missing)) return false;

  return true;
}

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
    `Be strict. A score of 7+ means genuinely good. Do not inflate scores.\n\n` +
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
    `  "feedback_text": string (2–3 sentences, specific and actionable),\n` +
    `  "score_justification": {\n` +
    `    "why_this_score": string (2–3 sentences explaining why the overall score fits THIS answer; reference concrete content from the answer; do NOT reveal scoring formulas, rubric weights, dimension percentages, or how numbers are combined),\n` +
    `    "key_strengths": string[] (exactly 2 items: specific things done well in this answer),\n` +
    `    "improvement_areas": string[] (exactly 2 items: specific actionable improvements for this answer)\n` +
    `  },\n` +
    `  "detailed_analysis": {\n` +
    `    "strengths": string[],\n` +
    `    "improvements": string[],\n` +
    `    "model_answer_hint": string,\n` +
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

function tryParseResponse(content: string): Omit<EvaluationResult, 'provider'> | null {
  try {
    const parsed: unknown = JSON.parse(extractJSON(content));
    if (!isValidEvaluation(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function evaluateWithPrimaryChain(prompt: string): Promise<EvaluationResult> {
  const messages = [{ role: 'user' as const, content: prompt }];

  const first = await completeInterviewChat({
    messages,
    temperature: 0.3,
  });
  let parsed = tryParseResponse(first.content);
  if (!parsed) {
    const second = await completeInterviewChat({
      messages,
      temperature: 0.3,
    });
    parsed = tryParseResponse(second.content);
    if (!parsed) {
      throw new Error(`Failed to parse evaluation after retry (${second.provider})`);
    }
    return normalizeResult(parsed, second.provider);
  }
  return normalizeResult(parsed, first.provider);
}

async function evaluateWithMistral(prompt: string): Promise<EvaluationResult> {
  const content = await callMistralChat(prompt, 0.3);

  const parsed = tryParseResponse(content);
  if (!parsed) {
    const retryContent = await callMistralChat(prompt, 0.3);
    const retryParsed = tryParseResponse(retryContent);
    if (!retryParsed) throw new Error('Failed to parse evaluation from Mistral after retry');
    return normalizeResult(retryParsed, 'mistral');
  }

  return normalizeResult(parsed, 'mistral');
}

export async function evaluateAnswer({
  questionText,
  rubric,
  answerText,
  answerStyle,
}: EvaluateAnswerInput): Promise<EvaluationResult> {
  const prompt = buildPrompt(questionText, rubric, answerText, answerStyle);

  try {
    return await evaluateWithPrimaryChain(prompt);
  } catch (primaryError) {
    console.warn('[AI] Primary interview AI failed, switching to Mistral:', primaryError);

    try {
      return await evaluateWithMistral(prompt);
    } catch (mistralError) {
      console.error('[AI] Primary chain and Mistral evaluation failed:', mistralError);
      throw mistralError;
    }
  }
}
