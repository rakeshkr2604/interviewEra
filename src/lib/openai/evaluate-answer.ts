import openai, { callWithRetry } from './client';
import { callMistralChat } from '@/lib/mistral/client';
import type { QuestionRubric, DimensionScores, DetailedAnalysis } from '@/types/app.types';

export type EvaluationProvider = 'openai' | 'mistral';

export interface EvaluateAnswerInput {
  questionText: string;
  rubric: QuestionRubric;
  answerText: string;
}

export interface EvaluationResult {
  overall_score: number;
  dimension_scores: DimensionScores;
  feedback_text: string;
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

function isValidEvaluation(data: unknown): data is EvaluationResult {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  if (typeof d.overall_score !== 'number') return false;
  if (typeof d.feedback_text !== 'string') return false;

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

function buildPrompt(questionText: string, rubric: QuestionRubric, answerText: string): string {
  return (
    `You are an expert interview evaluator. Score the following answer strictly and fairly.\n\n` +
    `Question: ${questionText}\n` +
    `Rubric: ${JSON.stringify(rubric)}\n` +
    `Candidate's Answer: ${answerText}\n\n` +
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
    `  "detailed_analysis": {\n` +
    `    "strengths": string[],\n` +
    `    "improvements": string[],\n` +
    `    "model_answer_hint": string,\n` +
    `    "keywords_missing": string[]\n` +
    `  }\n` +
    `}`
  );
}

function normalizeResult(parsed: EvaluationResult, provider: EvaluationProvider): EvaluationResult {
  const dims: DimensionScores = {
    communication_clarity: clamp(parsed.dimension_scores.communication_clarity),
    technical_depth: clamp(parsed.dimension_scores.technical_depth),
    answer_structure: clamp(parsed.dimension_scores.answer_structure),
    confidence: clamp(parsed.dimension_scores.confidence),
    relevance: clamp(parsed.dimension_scores.relevance),
  };

  const overallScore = clamp(computeWeightedScore(dims));

  return {
    overall_score: overallScore,
    dimension_scores: dims,
    feedback_text: parsed.feedback_text,
    detailed_analysis: {
      strengths: parsed.detailed_analysis.strengths,
      improvements: parsed.detailed_analysis.improvements,
      model_answer_hint: parsed.detailed_analysis.model_answer_hint,
      keywords_missing: parsed.detailed_analysis.keywords_missing,
    },
    provider,
  };
}

function tryParseResponse(content: string): EvaluationResult | null {
  try {
    const parsed: unknown = JSON.parse(extractJSON(content));
    if (!isValidEvaluation(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function evaluateWithOpenAI(prompt: string): Promise<EvaluationResult> {
  const response = await callWithRetry(() =>
    openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    })
  );
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  let parsed = tryParseResponse(content);
  if (!parsed) {
    const retry = await callWithRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      })
    );
    const retryContent = retry.choices[0]?.message?.content ?? '';
    parsed = tryParseResponse(retryContent);
    if (!parsed) throw new Error('Failed to parse evaluation from OpenAI after retry');
  }

  return normalizeResult(parsed, 'openai');
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
}: EvaluateAnswerInput): Promise<EvaluationResult> {
  const prompt = buildPrompt(questionText, rubric, answerText);

  try {
    return await evaluateWithOpenAI(prompt);
  } catch (openaiError) {
    console.warn('[AI] OpenAI evaluation failed, switching to Mistral:', openaiError);

    try {
      return await evaluateWithMistral(prompt);
    } catch (mistralError) {
      console.error('[AI] Both OpenAI and Mistral evaluation failed:', mistralError);
      throw mistralError;
    }
  }
}
