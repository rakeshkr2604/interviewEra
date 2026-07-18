/**
 * Full chain: workspace upload (parse-v2) → verify → script start (snapshot) →
 * core turn → forced-theme question must cite a real project name.
 *
 *   npx tsx scripts/verify-workspace-grounding.ts
 */
import { config } from 'dotenv';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const OUT = join(process.cwd(), '.verify-out', 'workspace-grounding');
const AUTH = join(process.cwd(), 'e2e', '.auth', 'user.json');
const PDF = join(process.cwd(), 'tests/fixtures/pdf/Rakesh_Kumar_Resume.pdf');

async function main() {
  mkdirSync(OUT, { recursive: true });
  const { default: globalSetup } = await import('../e2e/global-setup');
  await globalSetup({} as never);
  if (!existsSync(AUTH) || !existsSync(PDF)) {
    throw new Error('Missing e2e auth or Rakesh fixture PDF');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  // 1) Workspace upload + review confirm
  await page.goto(`${BASE}/resume`, { waitUntil: 'networkidle' });
  const replaceBtn = page.getByRole('button', { name: /^Replace$/i });
  if (await replaceBtn.isVisible().catch(() => false)) {
    await replaceBtn.click();
  }
  const input = page.locator('#resume-workspace-upload');
  await input.waitFor({ state: 'attached', timeout: 15_000 });
  await input.setInputFiles(PDF);
  await page.getByRole('heading', { name: /Review extracted details/i }).waitFor({
    timeout: 120_000,
  });
  await page.screenshot({ path: join(OUT, '01-review.png'), fullPage: true });
  const reviewBody = await page.locator('body').innerText();
  await page.getByRole('button', { name: /Confirm all/i }).click();
  await page.getByText(/edited by you|verified|Primary/i).first().waitFor({ timeout: 30_000 });
  await page.screenshot({ path: join(OUT, '02-verified.png'), fullPage: true });

  // 2) Resolve primary resume id + projects from API
  const listRes = await page.request.get(`${BASE}/api/resume`);
  if (!listRes.ok()) throw new Error(`GET /api/resume ${listRes.status()}`);
  const list = (await listRes.json()) as {
    resumes?: Array<{
      id: string;
      isPrimary?: boolean;
      currentVersionId?: string | null;
      parsed?: { projects?: Array<{ name?: string }>; experience_estimate?: string };
    }>;
  };
  const primary =
    (list.resumes ?? []).find((r) => r.isPrimary) ?? (list.resumes ?? [])[0];
  if (!primary?.id || !primary.currentVersionId) {
    throw new Error('No primary resume with version after workspace upload');
  }

  const verRes = await page.request.get(
    `${BASE}/api/resume/${primary.id}/versions/${primary.currentVersionId}`,
  );
  if (!verRes.ok()) throw new Error(`GET version ${verRes.status()} ${await verRes.text()}`);
  const ver = (await verRes.json()) as {
    version?: { parsed?: { projects?: Array<{ name?: string }> }; parserVersion?: string };
  };
  const projectNames = (ver.version?.parsed?.projects ?? [])
    .map((p) => p.name ?? '')
    .filter(Boolean);
  if (projectNames.length === 0) {
    throw new Error('parse-v2 version has no projects after workspace upload');
  }

  // 3) Start v2.1 script interview (creates resume_interview_snapshots)
  const startRes = await page.request.post(`${BASE}/api/interview/script/start`, {
    data: {
      resumeId: primary.id,
      role: 'Full-Stack Developer',
      difficulty: 'easy',
      interviewerId: 'priya',
      goal: 'fresher_placement',
      interviewMode: 'hr_behavioral',
      experienceYears: 0,
      selfIntroEnabled: false,
    },
  });
  const startBody = (await startRes.json().catch(() => ({}))) as {
    error?: string;
    interviewId?: string;
    id?: string;
  };
  if (!startRes.ok()) {
    throw new Error(`script/start ${startRes.status()} ${JSON.stringify(startBody)}`);
  }
  const interviewId = startBody.interviewId ?? startBody.id;
  if (!interviewId) throw new Error('script/start missing interviewId');

  // Confirm snapshot froze projects
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: snap } = await admin
    .from('resume_interview_snapshots')
    .select('parsed_data, parser_version, source')
    .eq('interview_id', interviewId)
    .maybeSingle();
  const snapProjects = Array.isArray((snap?.parsed_data as { projects?: unknown })?.projects)
    ? ((snap!.parsed_data as { projects: Array<{ name?: string }> }).projects ?? [])
        .map((p) => p.name ?? '')
        .filter(Boolean)
    : [];

  // 4) Core turn — conflict preference (same instruction used in grounding verify)
  const turnRes = await page.request.post(`${BASE}/api/interview/script/turn`, {
    data: {
      interviewId,
      lastAnswer:
        'I am ready. Generate the NEXT core behavioral question now. Prefer a conflict/disagreement theme.',
      currentPhase: 'core',
      questionNumber: 1,
    },
  });
  const turnBody = (await turnRes.json().catch(() => ({}))) as {
    error?: string;
    speech?: string;
    display_question?: string | null;
    turn?: { speech?: string; display_question?: string | null };
  };
  if (!turnRes.ok()) {
    throw new Error(`script/turn ${turnRes.status()} ${JSON.stringify(turnBody)}`);
  }

  const turn = turnBody.turn ?? turnBody;
  const speech = (turn as { speech?: string }).speech ?? '';
  const display = (turn as { display_question?: string | null }).display_question ?? '';
  const question = `${speech}\n${display}`.trim();
  // Match short project name (before " – " / " - ") — LLM cites "InterviewEra", not the full title.
  const nameHints = projectNames.flatMap((n) => {
    const short = n.split(/\s+[–—-]\s+/)[0]?.trim() || n;
    return short.length >= 3 ? [short, n] : [n];
  });
  const grounded = nameHints.some((n) =>
    new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(question),
  );

  const report = {
    ok: grounded && snapProjects.length > 0,
    resumeId: primary.id,
    versionId: primary.currentVersionId,
    parserVersion: ver.version?.parserVersion ?? null,
    projectNames,
    snapshot: {
      parser_version: snap?.parser_version ?? null,
      source: snap?.source ?? null,
      projectNames: snapProjects,
    },
    interviewId,
    speech,
    display_question: display,
    question,
    reviewHadProject: /InterviewEra|SkillBridge/i.test(reviewBody),
    at: new Date().toISOString(),
  };

  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();

  if (!report.ok) {
    console.error('[verify-workspace-grounding] FAIL — question not grounded in project name');
    process.exit(1);
  }
  console.log('[verify-workspace-grounding] ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
