/**
 * Agent 2 — Silent Evaluator.
 *
 * Runs in the background after each answer, producing a structured AnswerAnalysis
 * that Agent 1 (Interviewer) consumes to decide its next conversational move.
 *
 * AI routing: uses the repo's shared interview chain (OpenRouter → OpenAI gpt-4o-mini,
 * with quota/circuit breaker) and falls back to Mistral on primary failure — the same
 * D3 pattern as evaluate-answer.ts. Per CLAUDE.md this never instantiates a raw OpenAI
 * client and never uses gpt-4o.
 */

import { completeInterviewChat } from '@/lib/ai/interview-completion';
import { callMistralChat } from '@/lib/mistral/client';
import { getTokenBudget } from '@/lib/ai/token-budget';
import type { AnswerAnalysis, FollowUpType, InterviewContext } from '@/lib/interview/types';

const FOLLOWUP_TYPES: readonly FollowUpType[] = [
  'probe_depth',
  'clarify',
  'challenge',
  'acknowledge_move_on',
];

const EVALUATOR_SYSTEM_PROMPT = `You are a silent interview evaluator for Indian campus placement preparation. Your job is to analyze candidate answers and provide structured feedback.

EVALUATION CRITERIA:

1. CONFIDENCE_LEVEL (1-10):
   - 8-10: Clear, assertive, minimal fillers ("um", "like", "you know")
   - 5-7: Moderate hesitation, some filler words
   - 1-4: Very hesitant, excessive fillers, unclear

2. TECHNICAL_DEPTH (1-10):
   - 8-10: Deep technical details, mentions algorithms/data structures/patterns
   - 5-7: Surface-level technical knowledge
   - 1-4: No technical substance, vague descriptions

3. SPECIFICITY (1-10):
   - 8-10: Concrete examples, quantifiable results, specific tools/technologies
   - 5-7: Some details but lacks numbers/metrics
   - 1-4: Extremely vague ("we did this", "it was good")

4. COMMUNICATION_CLARITY (1-10):
   - 8-10: Well-structured (STAR method), logical flow
   - 5-7: Somewhat structured but jumps around
   - 1-4: Disorganized, hard to follow

MISSING_DETAILS - Identify what's absent:
- "metrics" - no quantifiable results
- "timeline" - no time context
- "impact" - no business/team impact mentioned
- "ownership" - uses "we" but not "I"
- "challenges" - no obstacles/problems mentioned
- "learnings" - no reflection on what they learned

RED_FLAGS:
- "passive_voice" - heavy use of "it was done" instead of "I did"
- "no_ownership" - only says "we", never "I"
- "generic_answer" - could apply to any project
- "buzzwords_only" - mentions tools but no real usage
- "defensive" - makes excuses instead of owning results

RECOMMENDED_FOLLOWUP_TYPE:
- "probe_depth": Answer lacks technical detail or specifics
- "clarify": Answer is vague or contradictory
- "challenge": Answer seems too perfect, test their thinking
- "acknowledge_move_on": Strong answer, proceed to next question

OUTPUT FORMAT (strict JSON, no markdown, no explanation):
{
  "confidence_level": <number 1-10>,
  "technical_depth": <number 1-10>,
  "specificity": <number 1-10>,
  "communication_clarity": <number 1-10>,
  "missing_details": ["detail1", "detail2"],
  "strengths": ["strength1", "strength2"],
  "red_flags": ["flag1", "flag2"],
  "recommended_followup_type": "probe_depth" | "clarify" | "challenge" | "acknowledge_move_on",
  "analysis_metadata": {
    "filler_word_count": <number>,
    "uses_star_method": <boolean>,
    "quantifiable_results": <boolean>
  }
}`;

function buildAnalysisPrompt(
  question: string,
  answer: string,
  context: InterviewContext,
  previousAnalyses: AnswerAnalysis[],
): string {
  const trendContext =
    previousAnalyses.length > 0
      ? `\n\nPREVIOUS PERFORMANCE TREND:\n${previousAnalyses
          .slice(-3)
          .map(
            (a, i) =>
              `Answer ${i + 1}: Depth=${a.technical_depth}/10, Specificity=${a.specificity}/10`,
          )
          .join('\n')}`
      : '';

  return `INTERVIEW CONTEXT:
Role: ${context.role}
Difficulty Level: ${context.difficulty}
Focus Areas: ${context.focus_areas.join(', ')}
Interview Style: ${context.interview_style}
${trendContext}

QUESTION ASKED:
"${question}"

CANDIDATE'S ANSWER:
"${answer}"

ANALYZE THIS ANSWER:
Provide a structured JSON analysis following the evaluation criteria. Be strict but fair. Indian candidates often use Hinglish (code-switching between English and Hindi) - this is normal and should not negatively impact scores unless it affects clarity.

IMPORTANT:
- If answer is truly strong (8+/10 in multiple dimensions), recommend "acknowledge_move_on"
- If answer lacks depth/specifics/ownership, recommend appropriate follow-up
- Consider cultural context: Indian students often say "we" for group projects (not always a red flag)

OUTPUT (JSON only, no explanation):`;
}

function extractJSON(content: string, source = 'agent'): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const stripped = fenced ? fenced[1].trim() : content.trim();
  try {
    JSON.parse(stripped);
    return stripped;
  } catch {
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        JSON.parse(jsonMatch[0]);
        console.log(`[JSON_PARSE][${source}] ✓ Extracted JSON via brace-match`);
        return jsonMatch[0];
      } catch { /* fall through */ }
    }
    console.error(`[JSON_PARSE][${source}] ✗ No valid JSON found. First 500 chars:`, stripped.slice(0, 500));
    return stripped;
  }
}

function clampScore(val: unknown): number {
  const n = typeof val === 'number' && Number.isFinite(val) ? val : 5;
  return Math.max(1, Math.min(10, Math.round(n)));
}

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((x): x is string => typeof x === 'string');
}

function normalizeFollowUpType(val: unknown): FollowUpType {
  return FOLLOWUP_TYPES.includes(val as FollowUpType)
    ? (val as FollowUpType)
    : 'acknowledge_move_on';
}

function normalizeMetadata(val: unknown): AnswerAnalysis['analysis_metadata'] {
  if (!val || typeof val !== 'object') return {};
  const o = val as Record<string, unknown>;
  const meta: NonNullable<AnswerAnalysis['analysis_metadata']> = {};
  if (typeof o.filler_word_count === 'number') meta.filler_word_count = o.filler_word_count;
  if (typeof o.response_time_seconds === 'number')
    meta.response_time_seconds = o.response_time_seconds;
  if (typeof o.uses_star_method === 'boolean') meta.uses_star_method = o.uses_star_method;
  if (typeof o.quantifiable_results === 'boolean')
    meta.quantifiable_results = o.quantifiable_results;
  return meta;
}

function validateAnalysis(raw: unknown): AnswerAnalysis {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    confidence_level: clampScore(o.confidence_level),
    technical_depth: clampScore(o.technical_depth),
    specificity: clampScore(o.specificity),
    communication_clarity: clampScore(o.communication_clarity),
    missing_details: toStringArray(o.missing_details),
    strengths: toStringArray(o.strengths),
    red_flags: toStringArray(o.red_flags),
    recommended_followup_type: normalizeFollowUpType(o.recommended_followup_type),
    analysis_metadata: normalizeMetadata(o.analysis_metadata),
  };
}

function getDefaultAnalysis(): AnswerAnalysis {
  return {
    confidence_level: 5,
    technical_depth: 5,
    specificity: 5,
    communication_clarity: 5,
    missing_details: [],
    strengths: [],
    red_flags: [],
    recommended_followup_type: 'acknowledge_move_on',
    analysis_metadata: {},
  };
}

function tryParse(content: string, source = 'agent'): AnswerAnalysis | null {
  try {
    return validateAnalysis(JSON.parse(extractJSON(content, source)));
  } catch {
    return null;
  }
}

export async function analyzeAnswer(
  question: string,
  answer: string,
  context: InterviewContext,
  previousAnalyses: AnswerAnalysis[] = [],
): Promise<AnswerAnalysis> {
  const messages = [
    { role: 'system' as const, content: EVALUATOR_SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: buildAnalysisPrompt(question, answer, context, previousAnalyses),
    },
  ];

  try {
    const { content, provider } = await completeInterviewChat({
      messages,
      temperature: 0.3,
      maxTokens: getTokenBudget('agent_analysis', 'openrouter'),
      operation: 'agent_analysis',
    });
    const parsed = tryParse(content, provider);
    if (parsed) return parsed;
    throw new Error('Primary chain returned unparseable analysis');
  } catch (primaryError) {
    console.warn('[agent-evaluator] Primary chain failed, trying Mistral:', primaryError);
    try {
      const prompt = `${EVALUATOR_SYSTEM_PROMPT}\n\n${buildAnalysisPrompt(
        question,
        answer,
        context,
        previousAnalyses,
      )}`;
      const content = await callMistralChat(prompt, 0.3, getTokenBudget('agent_analysis'));
      const parsed = tryParse(content, 'mistral');
      if (parsed) return parsed;
      throw new Error('Mistral returned unparseable analysis');
    } catch (fallbackError) {
      console.error('[agent-evaluator] All providers failed:', fallbackError);
      // Safe default keeps the interview loop alive — Agent 1 treats this as "move on".
      return getDefaultAnalysis();
    }
  }
}

/** Deterministic local filler-word scan — no AI call. */
export function detectFillerWords(answer: string): {
  count: number;
  words: Array<{ word: string; occurrences: number }>;
} {
  const fillers = [
    'um',
    'uh',
    'like',
    'you know',
    'basically',
    'actually',
    'sort of',
    'kind of',
  ];
  const lowerAnswer = answer.toLowerCase();

  const wordsFound = fillers
    .map((filler) => ({
      word: filler,
      occurrences: (
        lowerAnswer.match(new RegExp(`\\b${filler.replace(/ /g, '\\s+')}\\b`, 'g')) || []
      ).length,
    }))
    .filter((w) => w.occurrences > 0);

  const totalCount = wordsFound.reduce((sum, w) => sum + w.occurrences, 0);

  return { count: totalCount, words: wordsFound };
}
