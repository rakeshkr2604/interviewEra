/**
 * Reproduce script_report_synthesis validation failure with raw output dump.
 * Usage: npx tsx scripts/reproduce-script-report-synthesis.mts
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

config({ path: join(process.cwd(), '.env.local') });

async function loadMod<T extends Record<string, unknown>>(path: string): Promise<T> {
  const ns = await import(path);
  return ((ns as { default?: T }).default ?? ns) as T;
}

const OUT = join(process.cwd(), '.voice-verify-out', 'synthesis-repro');
mkdirSync(OUT, { recursive: true });

const ai = await loadMod<{
  completeInterviewChat: (opts: Record<string, unknown>) => Promise<{ content: string; model: string }>;
}>('../src/lib/ai/interview-completion.ts');

const aggregateMod = await loadMod<{
  aggregateScriptAnswers: (a: unknown[]) => {
    kind: string;
    overall?: number;
    scoredAnswerCount?: number;
    dimensionAverages?: Record<string, number>;
    scoreBand?: string;
    placementSignal?: string;
    promptVersions?: string[];
    weakestDimensions?: string[];
    perQuestion?: unknown[];
    limitedData?: boolean;
  };
  DIMENSION_KEYS?: string[];
}>('../src/lib/interview/script-report/aggregate.ts');

const rubric = await loadMod<{ DIMENSION_KEYS: string[] }>(
  '../src/lib/interview/answer-score/rubric.ts',
);

const synth = await loadMod<{
  buildScriptReportSynthesisSystemPrompt: () => string;
  buildScriptReportSynthesisUserPrompt: (a: Record<string, unknown>) => string;
  buildScriptReportSynthesisRepairPrompt: (errors: string[]) => string;
  validateScriptReportSynthesis: (
    raw: unknown,
  ) => { ok: true; value: unknown } | { ok: false; errors: string[] };
}>('../src/lib/interview/script-report/synthesis.ts');

function dims(partial: Record<string, number>) {
  const out: Record<string, { score: number; note: string }> = {};
  for (const k of rubric.DIMENSION_KEYS) {
    out[k] = { score: partial[k] ?? 7, note: `${k} note from live-like sample` };
  }
  return out;
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

const answers = [
  {
    turnIndex: 0,
    question: 'Tell me about a time you handled conflict on a team.',
    transcript:
      'In my college project, two teammates disagreed on the API design. I scheduled a short sync, listed tradeoffs, and we chose REST with clear owners. We shipped on time and the conflict did not recur.',
    questionType: 'behavioral',
    overall: 9,
    dimensions: dims({
      relevance: 10,
      content_accuracy: 10,
      communication_clarity: 10,
      structure: 7,
      specificity: 7,
    }),
    promptVersion: 'score-v1.2',
    scoreSuspect: false,
    oneLineSummary: 'Strong conflict story with concrete resolution.',
    modelAnswerLines: ['Situation: ...', 'Task: ...', 'Action: ...', 'Result: ...'],
  },
  {
    turnIndex: 1,
    question: 'Walk me through a project you are proud of.',
    transcript:
      'I built a campus placement tracker with Next.js and Postgres. I owned auth, role-based dashboards, and reduced report generation time from minutes to under ten seconds by caching aggregates.',
    questionType: 'behavioral',
    overall: 7.3,
    dimensions: dims({
      relevance: 10,
      content_accuracy: 7,
      communication_clarity: 7,
      structure: 5,
      specificity: 7,
    }),
    promptVersion: 'score-v1.2',
    scoreSuspect: false,
    modelAnswerLines: [],
  },
  {
    turnIndex: 2,
    question: 'How do you prioritize when you have multiple deadlines?',
    transcript:
      'I map deadlines against impact and dependencies, confirm with stakeholders, then time-box deep work. Last semester I delivered three submissions by cutting scope on the lowest-impact task first.',
    questionType: 'behavioral',
    overall: 8.1,
    dimensions: dims({
      relevance: 10,
      content_accuracy: 10,
      communication_clarity: 7,
      structure: 7,
      specificity: 5,
    }),
    promptVersion: 'score-v1.2',
    scoreSuspect: false,
    modelAnswerLines: [],
  },
];

const aggregate = aggregateMod.aggregateScriptAnswers(answers);
if (aggregate.kind !== 'scored') throw new Error('expected scored');

const systemPrompt = synth.buildScriptReportSynthesisSystemPrompt();
const userPrompt = synth.buildScriptReportSynthesisUserPrompt({
  targetRole: 'Software Engineer',
  scriptType: 'SCRIPT_H',
  aggregate,
  missingModelAnswerTurnIndexes: [1, 2],
});

writeFileSync(join(OUT, 'prompts.json'), JSON.stringify({ systemPrompt, userPrompt }, null, 2));

const attempts: Array<{ raw: string; parsed: unknown; errors: string[] | null; model: string }> = [];

for (let attempt = 0; attempt < 2; attempt++) {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
  if (attempt === 1) {
    messages.push(
      { role: 'assistant', content: attempts[0]!.raw },
      {
        role: 'user',
        content: synth.buildScriptReportSynthesisRepairPrompt(attempts[0]!.errors ?? ['unknown']),
      },
    );
  }

  const completion = await ai.completeInterviewChat({
    messages,
    temperature: 0.3,
    operation: 'script_report_synthesis',
    jsonMode: true,
    signal: AbortSignal.timeout(25_000),
  });

  let parsed: unknown = null;
  let errors: string[] | null = null;
  try {
    parsed = parseLlmJson(completion.content);
    const validated = synth.validateScriptReportSynthesis(parsed);
    errors = validated.ok ? null : validated.errors;
  } catch (e) {
    errors = [String(e)];
  }

  attempts.push({ raw: completion.content, parsed, errors, model: completion.model });
  writeFileSync(join(OUT, `attempt-${attempt + 1}-raw.json`), completion.content);
  writeFileSync(
    join(OUT, `attempt-${attempt + 1}-meta.json`),
    JSON.stringify(
      {
        model: completion.model,
        errors,
        hiring_signals_typeof:
          parsed && typeof parsed === 'object'
            ? Array.isArray((parsed as { hiring_signals?: unknown }).hiring_signals)
              ? `array(len=${(parsed as { hiring_signals: unknown[] }).hiring_signals.length})`
              : typeof (parsed as { hiring_signals?: unknown }).hiring_signals
            : null,
        roadmap_typeof:
          parsed && typeof parsed === 'object'
            ? Array.isArray((parsed as { roadmap_30_day?: unknown }).roadmap_30_day)
              ? `array(len=${(parsed as { roadmap_30_day: unknown[] }).roadmap_30_day.length})`
              : typeof (parsed as { roadmap_30_day?: unknown }).roadmap_30_day
            : null,
        hiring_signals_sample:
          parsed && typeof parsed === 'object'
            ? (parsed as { hiring_signals?: unknown }).hiring_signals
            : null,
        roadmap_sample:
          parsed && typeof parsed === 'object'
            ? (parsed as { roadmap_30_day?: unknown }).roadmap_30_day
            : null,
      },
      null,
      2,
    ),
  );

  console.log(`\n=== ATTEMPT ${attempt + 1} ===`);
  console.log('model:', completion.model);
  console.log('errors:', errors);
  console.log('raw:\n', completion.content);
  if (!errors) {
    console.log('VALIDATED OK');
    break;
  }
}

writeFileSync(join(OUT, 'summary.json'), JSON.stringify(attempts.map((a) => ({
  errors: a.errors,
  model: a.model,
  raw: a.raw,
})), null, 2));

// Also try loading evals from the original interview if table exists
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const { data: evals } = await admin
  .from('answer_evaluations')
  .select('turn_index, question, transcript, question_type, overall, dimensions, prompt_version, score_suspect')
  .eq('interview_id', 'cfdd8337-0537-4312-bccc-d2decb22453c')
  .eq('status', 'scored');
writeFileSync(join(OUT, 'original-interview-evals.json'), JSON.stringify(evals, null, 2));
console.log('\nOriginal interview scored rows:', evals?.length ?? 0);
