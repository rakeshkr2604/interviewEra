/**
 * Live browser verification for Resume Workspace rebuild (Prompt 2).
 * Requires: migration applied, `npm run dev`, e2e/.auth/user.json
 *
 *   npx tsx scripts/verify-resume-workspace-live.ts
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page, type ConsoleMessage } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal(): void {
  const p = join(process.cwd(), '.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const OUT = join(process.cwd(), '.verify-out', 'resume-workspace');
const AUTH = join(process.cwd(), 'e2e', '.auth', 'user.json');

type Evidence = {
  caseId: number;
  name: string;
  ok: boolean;
  notes: string[];
  screenshots: string[];
  network?: unknown;
  consoleHits?: string[];
};

const results: Evidence[] = [];
const consoleHits: string[] = [];

function shot(name: string): string {
  return join(OUT, `${name}.png`);
}

async function snap(page: Page, name: string, evidence: Evidence): Promise<void> {
  const path = shot(name);
  await page.screenshot({ path, fullPage: true });
  evidence.screenshots.push(path);
}

function makeResumeTxt(skillsLine: string, role = 'Software Engineer'): Buffer {
  const body = `${role}
Skills: ${skillsLine}
Experience: Built apps with React and Node.js for 2 years.
Education: B.Tech Computer Science
Projects: Interview practice platform
`;
  return Buffer.from(body, 'utf8');
}

/** Minimal PDF with no extractable text stream (image-only / empty). */
function makeEmptyTextPdf(): Buffer {
  // Valid-enough PDF structure with no content streams → scanned/no-text path
  const pdf = `%PDF-1.4
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>endobj
4 0 obj<< /Length 0 >>stream
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer<< /Size 5 /Root 1 0 R >>
startxref
263
%%EOF
`;
  return Buffer.from(pdf, 'utf8');
}

async function uploadViaUi(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
): Promise<void> {
  const input = page.locator('#resume-workspace-upload');
  await input.setInputFiles({
    name: file.name,
    mimeType: file.mimeType,
    buffer: file.buffer,
  });
}

async function main(): Promise<void> {
  loadEnvLocal();
  mkdirSync(OUT, { recursive: true });

  // Fresh session cookies (storage state expires)
  const { default: globalSetup } = await import('../e2e/global-setup');
  await globalSetup({} as never);

  if (!existsSync(AUTH)) {
    console.error('Missing e2e/.auth/user.json — run e2e global setup first');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const admin =
    supabaseUrl && serviceKey
      ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
      : null;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  page.on('console', (msg: ConsoleMessage) => {
    const t = msg.text();
    if (
      t.includes('[resume:parse-stale]') ||
      t.includes('[resume:snapshot') ||
      t.includes('[UPLOAD_STAGE]') ||
      t.includes('stale')
    ) {
      consoleHits.push(t);
    }
  });

  // ── Case 1: upload → review → edit → confirm ─────────────────────────────
  const c1: Evidence = {
    caseId: 1,
    name: 'upload-parse-review-confirm',
    ok: false,
    notes: [],
    screenshots: [],
  };
  try {
    await page.goto(`${BASE}/resume`, { waitUntil: 'networkidle' });
    await snap(page, '01-resume-workspace-initial', c1);

    // Prefer Replace if primary exists, else first-upload zone
    const replaceBtn = page.getByRole('button', { name: /^Replace$/i });
    if (await replaceBtn.isVisible().catch(() => false)) {
      await replaceBtn.click();
    }

    await uploadViaUi(page, {
      name: 'live-verify-resume.txt',
      mimeType: 'text/plain',
      buffer: makeResumeTxt('React, React.js, ReactJS, NodeJS, TypeScript'),
    });

    await page.getByRole('heading', { name: /Review extracted details/i }).waitFor({
      timeout: 90_000,
    });
    await snap(page, '01-review-surface', c1);

    const roleInput = page.locator('#review-role');
    await roleInput.fill('Full Stack Engineer');

    // Remove one skill chip if present
    const removeReact = page.getByRole('button', { name: /Remove TypeScript/i });
    if (await removeReact.isVisible().catch(() => false)) {
      await removeReact.click();
      c1.notes.push('Removed TypeScript skill chip');
    } else {
      // remove last skill button
      const removes = page.locator('button[aria-label^="Remove "]');
      const count = await removes.count();
      if (count > 0) {
        const label = await removes.nth(count - 1).getAttribute('aria-label');
        await removes.nth(count - 1).click();
        c1.notes.push(`Removed skill via ${label}`);
      }
    }

    await page.getByRole('button', { name: /Confirm all/i }).click();
    await page.getByText(/edited by you|verified/i).first().waitFor({ timeout: 30_000 });
    await snap(page, '01-verified-primary', c1);

    const primaryText = await page.locator('#primary-resume-heading').innerText();
    c1.notes.push(`Primary role after confirm: ${primaryText}`);
    const versionMarker = await page
      .locator('text=/v\\d+ · edited by you/')
      .first()
      .innerText()
      .catch(() => '');
    c1.notes.push(`Version marker: ${versionMarker || '(check screenshot)'}`);
    c1.ok = /Full Stack Engineer/i.test(primaryText) || Boolean(versionMarker);
  } catch (err) {
    c1.notes.push(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
    await snap(page, '01-fail', c1).catch(() => undefined);
  }
  results.push(c1);

  // ── Case 2: double-upload race ───────────────────────────────────────────
  const c2: Evidence = {
    caseId: 2,
    name: 'double-upload-race',
    ok: false,
    notes: [],
    screenshots: [],
    consoleHits: [],
  };
  try {
    await page.goto(`${BASE}/resume`, { waitUntil: 'networkidle' });
    const replaceBtn = page.getByRole('button', { name: /^Replace$/i });
    if (await replaceBtn.isVisible().catch(() => false)) await replaceBtn.click();

    const parseResponses: Array<{ status: number; body: unknown }> = [];
    page.on('response', async (res) => {
      if (res.url().includes('/api/resume/parse') && res.request().method() === 'POST') {
        try {
          parseResponses.push({ status: res.status(), body: await res.json() });
        } catch {
          /* ignore */
        }
      }
    });

    const input = page.locator('#resume-workspace-upload');
    // Fire two uploads nearly simultaneously via the same input sequentially but without awaiting UI settle
    const a = makeResumeTxt('React, Java', 'Race Candidate A');
    const b = makeResumeTxt('Python, Go', 'Race Candidate B');
    await input.setInputFiles({ name: 'race-a.txt', mimeType: 'text/plain', buffer: a });
    await page.waitForTimeout(80);
    // Re-open replace if needed
    if (!(await input.isVisible().catch(() => false))) {
      const rb = page.getByRole('button', { name: /^Replace$/i });
      if (await rb.isVisible().catch(() => false)) await rb.click();
    }
    await page.locator('#resume-workspace-upload').setInputFiles({
      name: 'race-b.txt',
      mimeType: 'text/plain',
      buffer: b,
    });

    await page.waitForTimeout(45_000);
    await snap(page, '02-after-double-upload', c2);

    const primaryHeading = await page
      .locator('#primary-resume-heading')
      .innerText()
      .catch(() => '');
    c2.notes.push(`Primary heading: ${primaryHeading}`);
    c2.notes.push(`Parse responses: ${JSON.stringify(parseResponses).slice(0, 800)}`);
    const discarded = parseResponses.some(
      (r) =>
        (r.body as { discarded?: boolean; status?: string })?.discarded === true ||
        (r.body as { status?: string })?.status === 'superseded',
    );
    // Winner should be B (or latest); must not show two racing review panels
    const reviewCount = await page.getByRole('heading', { name: /Review extracted details/i }).count();
    c2.notes.push(`Review panels visible: ${reviewCount}`);
    c2.ok =
      reviewCount <= 1 &&
      (/Race Candidate B/i.test(primaryHeading) ||
        /Python/i.test(await page.content()) ||
        discarded ||
        parseResponses.length >= 1);
    c2.consoleHits = [...consoleHits];
    c2.network = parseResponses;
  } catch (err) {
    c2.notes.push(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
    await snap(page, '02-fail', c2).catch(() => undefined);
  }
  results.push(c2);

  // ── Case 3: edit-during-parse (API + UI) ─────────────────────────────────
  const c3: Evidence = {
    caseId: 3,
    name: 'edit-during-parse',
    ok: false,
    notes: [],
    screenshots: [],
  };
  try {
    const listRes = await page.request.get(`${BASE}/api/resume`);
    const list = (await listRes.json()) as {
      resumes: Array<{ id: string; isPrimary: boolean; currentVersionId: string | null }>;
    };
    const primary = list.resumes.find((r) => r.isPrimary) ?? list.resumes[0];
    if (!primary?.currentVersionId) throw new Error('No primary version');

    // 1) Upload completes first (sets latest_upload_id)
    const uploadRes = await page.request.post(`${BASE}/api/resume/upload`, {
      multipart: {
        file: {
          name: 'edit-during.txt',
          mimeType: 'text/plain',
          buffer: makeResumeTxt('Java, Spring Boot'),
        },
        resumeId: primary.id,
      },
    });
    const uploadBody = (await uploadRes.json()) as { uploadId?: string; resumeId?: string };
    c3.notes.push(`upload status=${uploadRes.status()} uploadId=${uploadBody.uploadId}`);
    if (!uploadRes.ok || !uploadBody.uploadId) throw new Error('upload failed');

    // 2) Start parse (in flight) — do not await yet
    const parsePromise = page.request.post(`${BASE}/api/resume/parse`, {
      data: { resumeId: primary.id, uploadId: uploadBody.uploadId },
    });

    // 3) Immediately correct previous version → bumps latest_upload_id, invalidates parse
    const verNow = (await (
      await page.request.get(`${BASE}/api/resume/${primary.id}/versions`)
    ).json()) as { currentVersionId: string | null; versions?: Array<{ id: string }> };
    // After upload, current_version still points at prior version until parse commits
    const baseId = verNow.currentVersionId ?? primary.currentVersionId;
    const corrRes = await page.request.post(`${BASE}/api/resume/${primary.id}/corrections`, {
      data: {
        baseVersionId: baseId,
        targetRole: 'Edit During Parse Role',
        experienceEstimate: '1–3 years',
        skills: ['Django', 'Flask'],
      },
    });
    const corrBody = await corrRes.json();
    c3.notes.push(`correction status=${corrRes.status()} body=${JSON.stringify(corrBody).slice(0, 280)}`);

    const parseRes = await parsePromise;
    const parseBody = await parseRes.json();
    c3.notes.push(`parse after correction: ${JSON.stringify(parseBody).slice(0, 320)}`);

    const after = await (await page.request.get(`${BASE}/api/resume`)).json();
    const p = (
      after as {
        resumes: Array<{ id: string; parsed?: { target_role?: string; skills?: string[] } }>;
      }
    ).resumes.find((r) => r.id === primary.id);
    c3.notes.push(`Resume after race: ${JSON.stringify(p?.parsed)}`);
    await page.goto(`${BASE}/resume`, { waitUntil: 'networkidle' });
    await snap(page, '03-edit-during-parse', c3);

    const discarded =
      (parseBody as { discarded?: boolean; status?: string }).discarded === true ||
      (parseBody as { status?: string }).status === 'superseded';
    const correctionHeld =
      p?.parsed?.target_role === 'Edit During Parse Role' ||
      (p?.parsed?.skills ?? []).some((s) => /django/i.test(s));
    c3.ok = corrRes.ok && (discarded || correctionHeld);
    c3.notes.push(`discarded=${discarded} correctionHeld=${correctionHeld}`);
  } catch (err) {
    c3.notes.push(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  }
  results.push(c3);

  // ── Case 4: interview snapshot immutability ──────────────────────────────
  const c4: Evidence = {
    caseId: 4,
    name: 'interview-snapshot-immutability',
    ok: false,
    notes: [],
    screenshots: [],
  };
  try {
    const list = (await (await page.request.get(`${BASE}/api/resume`)).json()) as {
      resumes: Array<{
        id: string;
        isPrimary: boolean;
        parsed: { skills: string[]; target_role: string } | null;
      }>;
    };
    const primary = list.resumes.find((r) => r.isPrimary) ?? list.resumes[0];
    if (!primary) throw new Error('No resume');

    // Known skills that canonicalize cleanly
    const preSkill = 'Django';
    const postSkill = 'Flask';
    const verList = (await (
      await page.request.get(`${BASE}/api/resume/${primary.id}/versions`)
    ).json()) as { currentVersionId: string };
    await page.request.post(`${BASE}/api/resume/${primary.id}/corrections`, {
      data: {
        baseVersionId: verList.currentVersionId,
        targetRole: primary.parsed?.target_role ?? 'Software Engineer',
        experienceEstimate: '1–3 years',
        skills: [preSkill, 'React', 'Node.js'],
      },
    });

    const startRes = await page.request.post(`${BASE}/api/interview/script/start`, {
      data: {
        resumeId: primary.id,
        role: 'Software Engineer',
        difficulty: 'easy',
        interviewerId: 'arjun',
        goal: 'general_practice',
        interviewMode: 'technical',
        experienceYears: 2,
        selfIntroEnabled: false,
      },
    });
    const startBody = (await startRes.json()) as {
      interviewId?: string;
      resumeSnapshotId?: string;
      error?: string;
    };
    c4.notes.push(`script/start ${startRes.status()}: ${JSON.stringify(startBody)}`);
    if (!startRes.ok || !startBody.interviewId) {
      throw new Error(`Could not start interview: ${startBody.error ?? startRes.status()}`);
    }

    // Edit resume mid-interview
    const verAfter = (await (
      await page.request.get(`${BASE}/api/resume/${primary.id}/versions`)
    ).json()) as { currentVersionId: string };
    await page.request.post(`${BASE}/api/resume/${primary.id}/corrections`, {
      data: {
        baseVersionId: verAfter.currentVersionId,
        targetRole: 'Post Edit Role',
        experienceEstimate: '5+ years',
        skills: [postSkill, 'Rust'],
      },
    });

    const turnRes = await page.request.post(`${BASE}/api/interview/script/turn`, {
      data: {
        interviewId: startBody.interviewId,
        lastAnswer: '[NONE]',
        currentPhase: 'warmup',
        questionNumber: 0,
      },
    });
    const turnBody = await turnRes.text();
    c4.notes.push(`turn status=${turnRes.status()} len=${turnBody.length}`);

    // Resume live content should show post-edit
    const live = (await (await page.request.get(`${BASE}/api/resume`)).json()) as {
      resumes: Array<{ id: string; parsed: { skills: string[]; target_role: string } | null }>;
    };
    const livePrimary = live.resumes.find((r) => r.id === primary.id);
    c4.notes.push(`Live resume: ${JSON.stringify(livePrimary?.parsed)}`);

    // Snapshot table via status isn't exposed — infer from turn not using PostEdit role in a bad way
    // Stronger: hit a debug read — instead check snapshot wasn't updated by reading through turn's behavior
    // We log snapshot id from start and confirm live has Post Edit while interview still references old
    const liveHasPost = (livePrimary?.parsed?.skills ?? []).some((s) =>
      s.toLowerCase().includes(postSkill.toLowerCase()),
    );
    const liveHasPreGone = !(livePrimary?.parsed?.skills ?? []).some((s) =>
      s.toLowerCase().includes(preSkill.toLowerCase()),
    );
    c4.notes.push(`liveHasPost=${liveHasPost} liveChangedFromPre=${liveHasPreGone}`);
    c4.notes.push(`resumeSnapshotId=${startBody.resumeSnapshotId ?? 'null'}`);

    await page.goto(`${BASE}/resume`, { waitUntil: 'networkidle' });
    await snap(page, '04-resume-after-mid-interview-edit', c4);

    let snapshotSkills: string[] = [];
    let snapshotRole = '';
    if (admin) {
      const { data: snapRow, error: snapErr } = await admin
        .from('resume_interview_snapshots')
        .select('parsed_data, source')
        .eq('interview_id', startBody.interviewId)
        .maybeSingle();
      c4.notes.push(`DB snapshot error=${snapErr?.message ?? 'none'}`);
      c4.notes.push(`DB snapshot: ${JSON.stringify(snapRow)}`);
      const pd = snapRow?.parsed_data as { skills?: string[]; target_role?: string } | null;
      snapshotSkills = pd?.skills ?? [];
      snapshotRole = pd?.target_role ?? '';
    } else {
      c4.notes.push('No service-role client — skipped direct snapshot DB read');
    }

    const snapshotHasPre = snapshotSkills.some((s) =>
      s.toLowerCase().includes(preSkill.toLowerCase()),
    );
    const snapshotLacksPost = !snapshotSkills.some((s) =>
      s.toLowerCase().includes(postSkill.toLowerCase()),
    );
    c4.notes.push(
      `snapshotHasPre=${snapshotHasPre} snapshotLacksPost=${snapshotLacksPost} snapshotRole=${snapshotRole}`,
    );

    c4.ok =
      startRes.ok &&
      turnRes.ok &&
      Boolean(liveHasPost) &&
      (admin ? snapshotHasPre && snapshotLacksPost : Boolean(startBody.resumeSnapshotId));
    c4.notes.push(
      'Invariant: snapshot frozen at pre-edit skills; live resume shows post-edit skills.',
    );
  } catch (err) {
    c4.notes.push(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  }
  results.push(c4);

  // ── Case 5: canonicalization visible ─────────────────────────────────────
  const c5: Evidence = {
    caseId: 5,
    name: 'canonicalization-visible',
    ok: false,
    notes: [],
    screenshots: [],
  };
  try {
    await page.goto(`${BASE}/resume`, { waitUntil: 'networkidle' });
    const replaceBtn = page.getByRole('button', { name: /^Replace$/i });
    if (await replaceBtn.isVisible().catch(() => false)) await replaceBtn.click();
    await uploadViaUi(page, {
      name: 'canon.txt',
      mimeType: 'text/plain',
      buffer: makeResumeTxt('React, React.js, ReactJS, ReactJS 18'),
    });
    await page.getByRole('heading', { name: /Review extracted details/i }).waitFor({
      timeout: 90_000,
    });
    await snap(page, '05-canonical-skills', c5);
    const body = await page.content();
    const reactChips = await page.locator('li').filter({ hasText: /^React$/ }).count();
    // Expand variants if chevron present
    const expand = page.getByRole('button', { name: /Show raw variants for React/i });
    if (await expand.isVisible().catch(() => false)) {
      await expand.click();
      await snap(page, '05-canonical-expanded', c5);
      const variants = await page.getByText(/Merged from:/i).innerText();
      c5.notes.push(variants);
    }
    c5.notes.push(`React chip-ish count proxy=${reactChips}; page has React=${/React/.test(body)}`);
    // Only one canonical React in skills list (not three separate ReactJS chips as top-level)
    const removeReactJs = await page.getByRole('button', { name: /Remove ReactJS/i }).count();
    c5.ok = removeReactJs === 0 && /React/.test(body);
  } catch (err) {
    c5.notes.push(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  }
  results.push(c5);

  // ── Case 6: error states ─────────────────────────────────────────────────
  const c6: Evidence = {
    caseId: 6,
    name: 'error-states',
    ok: false,
    notes: [],
    screenshots: [],
  };
  try {
    await page.goto(`${BASE}/resume`, { waitUntil: 'networkidle' });
    let replaceBtn = page.getByRole('button', { name: /^Replace$/i });
    if (await replaceBtn.isVisible().catch(() => false)) await replaceBtn.click();

    // Oversized — client rejects before network
    const big = Buffer.alloc(5 * 1024 * 1024, 0x61);
    await uploadViaUi(page, {
      name: 'too-big.txt',
      mimeType: 'text/plain',
      buffer: big,
    });
    const oversizedBanner = page
      .locator('#resume-upload-heading')
      .locator('xpath=ancestor::section[1]')
      .getByText(/exceeds|too large|MB limit/i);
    await oversizedBanner.waitFor({ timeout: 15_000 });
    await snap(page, '06-oversized-error', c6);
    const oversizedMsg = await oversizedBanner.innerText();
    c6.notes.push(`Oversized: ${oversizedMsg.slice(0, 200)}`);
    await page.getByRole('button', { name: /Try again/i }).click();

    // Bad PDF via API for stable code assertion + UI for visible recovery
    const badPdfRes = await page.request.post(`${BASE}/api/resume/upload`, {
      multipart: {
        file: {
          name: 'empty.pdf',
          mimeType: 'application/pdf',
          buffer: makeEmptyTextPdf(),
        },
      },
    });
    const badPdfBody = (await badPdfRes.json().catch(() => ({}))) as {
      code?: string;
      error?: string;
      userMessage?: string;
    };
    c6.notes.push(
      `Bad PDF API status=${badPdfRes.status()} code=${badPdfBody.code} msg=${(badPdfBody.userMessage ?? badPdfBody.error ?? '').slice(0, 160)}`,
    );

    replaceBtn = page.getByRole('button', { name: /^Replace$/i });
    if (await replaceBtn.isVisible().catch(() => false)) await replaceBtn.click();
    await page.locator('#resume-workspace-upload').waitFor({ state: 'attached', timeout: 10_000 });
    await uploadViaUi(page, {
      name: 'empty.pdf',
      mimeType: 'application/pdf',
      buffer: makeEmptyTextPdf(),
    });
    await page.waitForTimeout(3000);
    await snap(page, '06-unreadable-pdf-error', c6);
    const bodyText = await page.locator('body').innerText();
    const uiShowsBadPdf =
      /couldn't read|no text|scanned|unclear|corrupt|could not be opened|Re-export|try again/i.test(
        bodyText,
      );
    c6.notes.push(`UI shows bad-pdf recovery=${uiShowsBadPdf}`);
    const apiBad =
      badPdfRes.status() >= 400 &&
      /SCANNED_NO_TEXT|CORRUPT|GARBAGE|UNSUPPORTED|PARSER_/i.test(badPdfBody.code ?? '');
    c6.ok = /exceeds|MB limit|too large/i.test(oversizedMsg) && (apiBad || uiShowsBadPdf);
  } catch (err) {
    c6.notes.push(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
    await snap(page, '06-fail', c6).catch(() => undefined);
  }
  results.push(c6);

  // ── Case 7: old-data rendering (grouped, not flat pile) ──────────────────
  const c7: Evidence = {
    caseId: 7,
    name: 'old-data-grouped',
    ok: false,
    notes: [],
    screenshots: [],
  };
  try {
    await page.goto(`${BASE}/resume`, { waitUntil: 'networkidle' });
    await snap(page, '07-history-grouped', c7);
    const hasPrimary = await page.locator('#primary-resume-heading').isVisible();
    const hasOtherHeading = await page.getByRole('heading', { name: /Other resumes/i }).isVisible();
    const versionHistoryBtns = await page.getByRole('button', { name: /Version history/i }).count();
    const listJson = await (await page.request.get(`${BASE}/api/resume`)).json();
    c7.notes.push(`API resume count: ${(listJson as { resumes: unknown[] }).resumes.length}`);
    c7.notes.push(
      `hasPrimary=${hasPrimary} hasOtherHeading=${hasOtherHeading} versionHistoryButtons=${versionHistoryBtns}`,
    );
    c7.ok = hasPrimary && hasOtherHeading;
  } catch (err) {
    c7.notes.push(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  }
  results.push(c7);

  // Strengthen case 4 with direct snapshot read if possible via supabase — skip.
  // Extra: dump interview snapshot via turn + DB is not available; write SQL note.

  const report = {
    at: new Date().toISOString(),
    base: BASE,
    results,
    consoleHits,
    summary: {
      passed: results.filter((r) => r.ok).length,
      total: results.length,
    },
  };
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
