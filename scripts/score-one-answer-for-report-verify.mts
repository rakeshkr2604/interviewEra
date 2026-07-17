/**
 * Score one answer using the same LLM + validate + persist path as answer-score API.
 * Usage: npx tsx scripts/score-one-answer-for-report-verify.mts '<json>'
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

config({ path: join(process.cwd(), '.env.local') });

async function loadMod<T extends Record<string, unknown>>(path: string): Promise<T> {
  const ns = await import(path);
  return ((ns as { default?: T }).default ?? ns) as T;
}

function parseLlmJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end > start) return JSON.parse(content.slice(start, end + 1));
    throw new Error('no json');
  }
}

async function main() {
  const arg = process.argv[2] ?? '{}';
  const args = (arg.endsWith('.json')
    ? JSON.parse(readFileSync(arg, 'utf8'))
    : JSON.parse(arg)) as {
    interviewId: string;
    userId: string;
    turnIndex: number;
    question: string;
    transcript: string;
    questionType: 'technical' | 'behavioral';
    targetRole: string;
  };

  const rubric = await loadMod<{
    ANSWER_SCORE_PROMPT_VERSION: string;
    subRubricForQuestionType: (t: 'technical' | 'behavioral') => 'star' | 'logical_flow';
    validateAnswerScoreOutput: (
      raw: unknown,
      expected: 'star' | 'logical_flow',
      opts: Record<string, unknown>,
    ) => { ok: true; value: { dimensions: unknown; overall: number; score_suspect: boolean; suspect_reasons: string[] } } | { ok: false; errors: string[] };
  }>('../src/lib/interview/answer-score/rubric.ts');

  const prompt = await loadMod<{
    buildAnswerScoreSystemPrompt: (t: 'technical' | 'behavioral') => string;
    buildAnswerScoreUserPrompt: (a: Record<string, unknown>) => string;
    buildAnswerScoreRepairPrompt: (errors: string[], expected: 'star' | 'logical_flow') => string;
  }>('../src/lib/interview/answer-score/prompt.ts');

  const ai = await loadMod<{
    completeInterviewChat: (opts: Record<string, unknown>) => Promise<{ content: string; model: string }>;
  }>('../src/lib/ai/interview-completion.ts');

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const expectedSubRubric = rubric.subRubricForQuestionType(args.questionType);
  const systemPrompt = prompt.buildAnswerScoreSystemPrompt(args.questionType);
  const userPrompt = prompt.buildAnswerScoreUserPrompt({
    question: args.question,
    questionType: args.questionType,
    targetRole: args.targetRole,
    transcript: args.transcript,
  });

  const rawOutputs: string[] = [];
  let validated: {
    dimensions: unknown;
    overall: number;
    score_suspect: boolean;
    suspect_reasons: string[];
  } | null = null;
  let modelUsed = 'unknown';
  let lastErrors: string[] = [];

  for (let attempt = 0; attempt < 2 && !validated; attempt++) {
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
    if (attempt === 1) {
      messages.push(
        { role: 'assistant', content: rawOutputs[0] ?? '' },
        { role: 'user', content: prompt.buildAnswerScoreRepairPrompt(lastErrors, expectedSubRubric) },
      );
    }
    const completion = await ai.completeInterviewChat({
      messages,
      temperature: 0.2,
      operation: 'answer_score',
      jsonMode: true,
      signal: AbortSignal.timeout(15_000),
    });
    modelUsed = completion.model;
    rawOutputs.push(completion.content);
    try {
      const parsed = parseLlmJson(completion.content);
      const result = rubric.validateAnswerScoreOutput(parsed, expectedSubRubric, {});
      if (result.ok) validated = result.value;
      else lastErrors = result.errors;
    } catch (e) {
      lastErrors = [String(e)];
    }
  }

  if (!validated) {
    throw new Error(`score failed turn ${args.turnIndex}: ${lastErrors.join('; ')}`);
  }

  const { error } = await admin.from('answer_evaluations').upsert(
    {
      interview_id: args.interviewId,
      turn_index: args.turnIndex,
      user_id: args.userId,
      question: args.question,
      transcript: args.transcript,
      question_type: args.questionType,
      type_source: 'tagged',
      sub_rubric: expectedSubRubric,
      prompt_version: rubric.ANSWER_SCORE_PROMPT_VERSION,
      model: modelUsed,
      raw_model_output: rawOutputs.join('\n---RETRY---\n'),
      dimensions: validated.dimensions,
      overall: validated.overall,
      status: 'scored',
      score_suspect: validated.score_suspect,
      suspect_reasons: validated.suspect_reasons,
    },
    { onConflict: 'interview_id,turn_index' },
  );
  if (error) throw error;
  console.log(JSON.stringify({ ok: true, overall: validated.overall, model: modelUsed }));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e?.message || e) }));
  process.exit(1);
});
