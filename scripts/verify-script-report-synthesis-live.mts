/**
 * 3-interview live verification that synthesis used_llm=true with non-fallback narrative.
 * Usage: npx tsx scripts/verify-script-report-synthesis-live.mts
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

config({ path: join(process.cwd(), '.env.local') });

const OUT = join(process.cwd(), '.voice-verify-out', 'synthesis-fix-live');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const evidencePath = join(OUT, 'evidence.jsonl');

function log(msg: string, data?: unknown) {
  const line = JSON.stringify({ t: new Date().toISOString(), msg, data: data ?? null });
  console.log(line);
  appendFileSync(evidencePath, line + '\n');
}

async function loadMod<T extends Record<string, unknown>>(path: string): Promise<T> {
  const ns = await import(path);
  return ((ns as { default?: T }).default ?? ns) as T;
}

function scoreViaLlm(payload: Record<string, unknown>) {
  const argsPath = join(OUT, `score-args-${payload.turnIndex}-${payload.interviewId}.json`);
  writeFileSync(argsPath, JSON.stringify(payload));
  const r = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['tsx', 'scripts/score-one-answer-for-report-verify.mts', argsPath],
    { cwd: process.cwd(), encoding: 'utf8', env: process.env, timeout: 90_000, shell: true },
  );
  const combined = `${r.stdout || ''}\n${r.stderr || ''}`;
  const lines = combined.split('\n').map((l) => l.trim()).filter(Boolean);
  let parsed: { ok?: boolean; overall?: number } | null = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const p = JSON.parse(lines[i]!);
      if (p && typeof p === 'object' && 'ok' in p) {
        parsed = p;
        break;
      }
    } catch {
      /* continue */
    }
  }
  if (r.status !== 0 || !parsed?.ok) {
    throw new Error(`score failed: ${JSON.stringify(parsed)} stderr=${(r.stderr || '').slice(-300)}`);
  }
  return parsed;
}

const FALLBACK_PREFIX = 'Across ';
const FALLBACK_MARKER = 'your weighted session score is';

const ANSWER_SETS = [
  [
    {
      q: 'Tell me about a time you handled conflict on a team.',
      a: 'In my college project, two teammates disagreed on the API design. I scheduled a short sync, listed tradeoffs, and we chose REST with clear owners. We shipped on time and the conflict did not recur.',
    },
    {
      q: 'Walk me through a project you are proud of.',
      a: 'I built a campus placement tracker with Next.js and Postgres. I owned auth, role-based dashboards, and reduced report generation time from minutes to under ten seconds by caching aggregates.',
    },
    {
      q: 'How do you prioritize when you have multiple deadlines?',
      a: 'I map deadlines against impact and dependencies, confirm with stakeholders, then time-box deep work. Last semester I delivered three submissions by cutting scope on the lowest-impact task first.',
    },
  ],
  [
    {
      q: 'Describe a failure and what you learned.',
      a: 'I pushed a feature without load testing and the demo crashed under concurrent logins. I added rate limits, wrote a smoke checklist, and the next demo stayed stable for the full hour.',
    },
    {
      q: 'How do you explain a technical idea to a non-technical stakeholder?',
      a: 'I start with the user pain, use one analogy, then one diagram. For our placement cell I explained caching as a short-term memory so reports do not rebuild every click.',
    },
    {
      q: 'Tell me about leading without authority.',
      a: 'Nobody owned API docs, so I drafted a template, got two teammates to fill their endpoints, and we cut onboarding questions for juniors by roughly half that month.',
    },
  ],
  [
    {
      q: 'Why this role and company type?',
      a: 'I want product-facing backend work where student outcomes matter. Placement tooling is familiar to me and I care about reliable systems more than flashy demos.',
    },
    {
      q: 'What is a technical tradeoff you made recently?',
      a: 'We chose Postgres JSONB over a separate analytics DB for week-one speed. It was slower later for heavy reports, so we added a nightly rollup table instead of rewriting everything.',
    },
    {
      q: 'How do you handle ambiguous requirements?',
      a: 'I write three acceptance examples, confirm them in a ten-minute call, then build the smallest slice that proves the assumption. If wrong, we only throw away a day of work.',
    },
  ],
];

async function main() {
  writeFileSync(evidencePath, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });

  const email = `synth-fix+${Date.now()}@interviewera-mail.test`;
  const password = 'SynthFixLive1!';
  await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({ email, password });
  if (signErr || !signIn.session) throw signErr ?? new Error('signin');
  const userId = signIn.user.id;
  await admin.from('users').upsert({ id: userId, email }, { onConflict: 'id' });

  const { data: resume, error: resumeErr } = await admin
    .from('resumes')
    .insert({
      user_id: userId,
      file_url: 'https://example.com/synth-fix.txt',
      raw_text: 'Candidate resume for synthesis fix verification.',
      parsed_data: { name: 'Synth Fix', skills: ['TS'] },
    })
    .select('id')
    .single();
  if (resumeErr) throw resumeErr;

  const { loadOrGenerateScriptReport } = await loadMod<{
    loadOrGenerateScriptReport: (a: Record<string, unknown>) => Promise<{
      ok: boolean;
      report?: {
        status: string;
        overall: number | null;
        synthesis?: {
          recruiter_assessment?: string;
          behavioral_intelligence?: string;
          meta?: { used_llm?: boolean; synthesis_version?: string };
        } | null;
      };
    }>;
  }>('../src/lib/interview/script-report/generate.ts');

  const results: Array<Record<string, unknown>> = [];

  for (let i = 0; i < 3; i++) {
    const interviewId = randomUUID();
    const answers = ANSWER_SETS[i]!;
    const { error: insErr } = await admin.from('interviews').insert({
      id: interviewId,
      user_id: userId,
      resume_id: resume.id,
      status: 'in_progress',
      engine: 'v2.1',
      script_type: 'SCRIPT_H',
      role: 'Software Engineer',
      difficulty: 'easy',
      interviewer_id: 'priya',
      question_count: 4,
      current_turn_index: 0,
      self_intro_enabled: false,
      skips_used: 0,
      max_skips: 2,
      started_at: new Date().toISOString(),
      session_context: { goal: 'general_practice', interviewMode: 'hr_behavioral', run: i },
    });
    if (insErr) throw insErr;

    for (let t = 0; t < answers.length; t++) {
      const row = answers[t]!;
      await admin.from('script_turns').upsert(
        {
          interview_id: interviewId,
          turn_index: t,
          phase: 'core',
          is_question: true,
          question_type: 'behavioral',
          answer_text: row.a,
          raw_transcript: row.a,
          submitted_as: 'raw',
          structured_answer: {
            coaching_reference: {
              restructured_example: [
                `Situation for Q${t}.`,
                `Task for Q${t}.`,
                `Action for Q${t}.`,
                `Result for Q${t}.`,
              ],
            },
          },
          llm_output: { speech: row.q, is_question: true, question: row.q },
        },
        { onConflict: 'interview_id,turn_index' },
      );
      scoreViaLlm({
        interviewId,
        userId,
        turnIndex: t,
        question: row.q,
        transcript: row.a,
        questionType: 'behavioral',
        targetRole: 'Software Engineer',
      });
    }

    await admin
      .from('interviews')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        performance_bucket: 'average',
      })
      .eq('id', interviewId);

    const gen = await loadOrGenerateScriptReport({
      serviceClient: admin,
      interviewId,
      userId,
      forceRegenerate: true,
    });
    if (!gen.ok || !gen.report) throw new Error(`generate failed run ${i}`);

    const assessment = gen.report.synthesis?.recruiter_assessment ?? '';
    const usedLlm = gen.report.synthesis?.meta?.used_llm === true;
    const looksLikeFallback =
      assessment.startsWith(FALLBACK_PREFIX) && assessment.includes(FALLBACK_MARKER);
    const rowResult = {
      run: i + 1,
      interviewId,
      status: gen.report.status,
      overall: gen.report.overall,
      usedLlm,
      synthesisVersion: gen.report.synthesis?.meta?.synthesis_version ?? null,
      looksLikeFallback,
      assessment,
      behavioral: gen.report.synthesis?.behavioral_intelligence ?? null,
    };
    results.push(rowResult);
    log('RUN_RESULT', rowResult);

    // Browser render check
    const ref = new URL(url).hostname.split('.')[0];
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    await ctx.addCookies([
      {
        name: `sb-${ref}-auth-token`,
        value: encodeURIComponent(JSON.stringify(signIn.session)),
        domain: 'localhost',
        path: '/',
        sameSite: 'Lax',
      },
    ]);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/report/script/${interviewId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await page.waitForTimeout(2500);
    const uiAssessment = await page.locator('[data-testid="script-report-assessment"]').textContent();
    await page.screenshot({ path: join(OUT, `run-${i + 1}-report.png`), fullPage: true });
    log('UI_ASSESSMENT', { run: i + 1, interviewId, uiAssessment });
    await browser.close();

    if (!usedLlm || looksLikeFallback) {
      throw new Error(`Run ${i + 1} still on fallback: usedLlm=${usedLlm} assessment=${assessment.slice(0, 120)}`);
    }
  }

  writeFileSync(join(OUT, 'summary.json'), JSON.stringify(results, null, 2));
  console.log('\nALL 3 RUNS PASSED used_llm=true');
}

main().catch((err) => {
  console.error(err);
  writeFileSync(join(OUT, 'error.txt'), String(err?.stack || err));
  process.exit(1);
});
