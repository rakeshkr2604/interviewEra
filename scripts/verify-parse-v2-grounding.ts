/**
 * Forced-theme conflict question must reference a real project from parse-v2 output.
 *   npx tsx scripts/verify-parse-v2-grounding.ts
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

config({ path: resolve(process.cwd(), '.env.local') });

import { extractText } from '../src/lib/pdf/parser';
import { assertPdfPageLimit } from '../src/lib/pdf/page-count';
import { parseResumeGracefully } from '../src/lib/resume/graceful-parse';
import { buildScriptResumeSummary } from '../src/lib/interview/question-gen-input';
import { getScript } from '../src/lib/ai/scripts/script-loader';
import {
  buildRuntimeContext,
  experienceYearsToLevel,
} from '../src/lib/ai/scripts/runtime-context';
import { completeInterviewChat } from '../src/lib/ai/interview-completion';
import { validateTurnOutput } from '../src/lib/ai/scripts/turn-validator';

async function main() {
  if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error('Missing OPENROUTER_API_KEY in .env.local');
    process.exit(1);
  }

  const pdfPath = resolve(process.cwd(), 'tests/fixtures/pdf/Rakesh_Kumar_Resume.pdf');
  const bytes = new Uint8Array(readFileSync(pdfPath));
  await assertPdfPageLimit(bytes, 10);
  const text = await extractText(bytes, { source: 'verify-parse-v2-grounding' });

  process.env.RESUME_PARSE_FORCE_AI = '1';
  const parsed = await parseResumeGracefully(text);
  const projectNames = (parsed.data.projects ?? []).map((p) => p.name).filter(Boolean);
  const resumeSummary = buildScriptResumeSummary(parsed.data, parsed.data.target_role || 'Full-Stack Developer');

  if (projectNames.length === 0 || !/InterviewEra|SkillBridge/i.test(projectNames.join(' '))) {
    console.error('parse-v2 did not extract expected projects', projectNames);
    process.exit(1);
  }

  const runtimeContext = buildRuntimeContext({
    candidate_name: 'Rakesh',
    target_role: parsed.data.target_role || 'Full-Stack Developer',
    experience_level: experienceYearsToLevel(0),
    interview_goal: 'fresher_placement',
    company_name: 'Not specified',
    company_type: 'unknown',
    difficulty: 'easy',
    resume_summary: resumeSummary,
    job_description: 'Not provided',
    question_pool: 'Not available',
    current_phase: 'core',
    question_number: 1,
    total_questions: 4,
    skips_used: 0,
    max_skips: 2,
    last_answer: 'I am ready for the first question.',
    multilingual_detected: false,
    is_returning_user: false,
    self_intro_enabled: false,
    current_turn_index: 3,
  });

  const systemPrompt =
    getScript('SCRIPT_H') + '\n\n## RUNTIME CONTEXT\n\n```\n' + runtimeContext + '\n```';

  const completion = await completeInterviewChat({
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content:
          'Generate the NEXT core behavioral question now. Prefer a conflict/disagreement theme. Return JSON only.',
      },
    ],
    temperature: 0.4,
    operation: 'script_turn_generation',
    jsonMode: true,
    signal: AbortSignal.timeout(45_000),
  });

  let raw: unknown;
  try {
    raw = JSON.parse(completion.content);
  } catch {
    const start = completion.content.indexOf('{');
    const end = completion.content.lastIndexOf('}');
    raw = JSON.parse(completion.content.slice(start, end + 1));
  }
  const turn = validateTurnOutput(raw, 'SCRIPT_H');
  const question = `${turn.speech}\n${turn.display_question ?? ''}`;
  const grounded = /InterviewEra|SkillBridge/i.test(question);

  const report = {
    ok: grounded,
    projectNames,
    resumeSummary,
    speech: turn.speech,
    display_question: turn.display_question,
    at: new Date().toISOString(),
  };

  const outDir = resolve(process.cwd(), '.verify-out', 'parse-v2-grounding');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!grounded) {
    console.error('[verify-parse-v2-grounding] FAIL — question did not reference project name');
    process.exit(1);
  }
  console.log('[verify-parse-v2-grounding] ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
