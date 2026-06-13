/**
 * Full InterviewEra voice verification with authenticated session.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../.voice-verify-out');
const BASE = process.env.APP_URL || 'http://localhost:3000';

function loadEnv() {
  const raw = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
  return Object.fromEntries(
    raw
      .split(/\n/)
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i), l.slice(i + 1)];
      }),
  );
}

async function getMagicLink(env, email) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      email,
      options: { redirectTo: `${BASE}/auth/callback` },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`generate_link failed: ${JSON.stringify(json)}`);
  return json.action_link || json.properties?.action_link;
}

async function getFirstUserEmail(env) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const json = await res.json();
  const email = json.users?.[0]?.email;
  if (!email) throw new Error('No users in Supabase');
  return email;
}

async function startInterview(page, interviewId) {
  const res = await page.request.post(`${BASE}/api/interview/start`, {
    data: {
      interviewId,
      role: 'Software Engineer',
      difficulty: 'medium',
      questionCount: 4,
    },
  });
  return { status: res.status(), body: await res.text() };
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const env = loadEnv();
const logs = [];

const browser = await chromium.launch({
  headless: false,
  channel: 'chrome',
  args: ['--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});

const context = await browser.newContext({ permissions: ['microphone'] });
const page = await context.newPage();

page.on('console', (msg) => {
  const t = msg.text();
  if (
    t.includes('[STT_INPUT_TRACE]') ||
    t.includes('[speech]') ||
    t.includes('web_speech_stalled') ||
    t.includes('switch_to_deepgram') ||
    t.includes('level_meter_started') ||
    t.includes('[mic-flow]')
  ) {
    logs.push({ ts: Date.now(), text: t });
  }
});

try {
  const email = process.env.VERIFY_USER_EMAIL || 'kanakranjan062@gmail.com';
  const magicLink = await getMagicLink(env, email);
  await page.goto(magicLink, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2000);

  // Navigate to dashboard and find or create interview
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  if (page.url().includes('/login')) {
    throw new Error('Magic link auth failed — still on login');
  }

  const sessionId =
    process.env.INTERVIEW_SESSION_ID ||
    'cb4b5f0b-0c54-43b8-a70a-3b4518a054d3';
  const sessionUrl = `${BASE}/interview/session/${sessionId}`;
  await page.goto(sessionUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Startup recovery if prepare/questions failed
  for (let i = 0; i < 6; i++) {
    const body = await page.locator('body').innerText();
    if (body.includes('Your Answer') || body.includes('Tap here to start microphone')) break;
    const reconnect = page.getByRole('button', { name: /reconnect|retry/i }).first();
    if (await reconnect.count()) {
      await reconnect.click({ timeout: 3000 }).catch(() => {});
      logs.push({ ts: Date.now(), text: '[AUTO] startup reconnect/retry clicked' });
      await page.waitForTimeout(8000);
      continue;
    }
    await page.waitForTimeout(3000);
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT_DIR, 'interview-loaded.png'), fullPage: true });

  // Advance to candidate_answering if needed — click through avatar/audio unlock
  for (let i = 0; i < 8; i++) {
    const body = await page.locator('body').innerText();
    if (body.includes('Your Answer') || body.includes('Tap here to start microphone')) break;

    const unlock = page.getByRole('button', { name: /enable audio|continue|tap to/i }).first();
    if (await unlock.count()) {
      await unlock.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(2000);
      continue;
    }
    const cont = page.getByRole('button', { name: /continue without audio|skip/i }).first();
    if (await cont.count()) {
      await cont.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(2000);
      continue;
    }
    await page.waitForTimeout(2000);
  }

  await page.waitForTimeout(2000);

  await page.waitForTimeout(8000);

  // Click mic — multiple selectors for session UI
  const micCandidates = [
    page.getByRole('button', { name: /tap here to start microphone/i }),
    page.getByRole('button', { name: /click mic to enable/i }),
    page.locator('button').filter({ hasText: /mic|listening|getting ready/i }).first(),
  ];
  for (const micBtn of micCandidates) {
    if (await micBtn.count()) {
      await micBtn.click({ timeout: 5000 }).catch(() => {});
      logs.push({ ts: Date.now(), text: '[AUTO] mic button clicked' });
      break;
    }
  }

  const speakPs = `$s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak('I use the OpenAI API with Python backends for geospatial data analysis and feature extraction');`;
  spawn('powershell', ['-NoProfile', '-Command', speakPs], { detached: true, stdio: 'ignore' }).unref();

  await page.waitForTimeout(8000);

  const pageText = await page.locator('body').innerText();
  const transcriptBox = page.locator('div.whitespace-pre-wrap, textarea').first();
  const transcript = (await transcriptBox.textContent().catch(() => ''))?.trim() ?? '';

  await page.screenshot({ path: path.join(OUT_DIR, 'interview-after-mic.png'), fullPage: true });

  const traceEvents = logs
    .map((l) => l.text)
    .flatMap((t) => {
      const m = t.match(/\[STT_INPUT_TRACE\] (\w+)/);
      return m ? [m[1]] : [];
    });

  const levelMeterStarted = logs.some((l) => l.text.includes('level_meter_started'));
  const noSpeechLines = logs.filter((l) => /no-speech|benign_error.*no-speech/.test(l.text));
  const deepgramSwitch = logs.filter((l) => /switch_to_deepgram|web_speech_stalled/.test(l.text));

  const flags = {
    onaudiostart: traceEvents.includes('onaudiostart'),
    onsoundstart: traceEvents.includes('onsoundstart'),
    onspeechstart: traceEvents.includes('onspeechstart'),
    onresult: traceEvents.includes('onresult'),
  };

  const inAnswering = pageText.includes('Your Answer');
  const pass =
    inAnswering &&
    flags.onaudiostart &&
    flags.onresult &&
    transcript.length > 10 &&
    !levelMeterStarted &&
    noSpeechLines.length === 0 &&
    deepgramSwitch.length === 0;

  const out = {
    verdict: pass ? 'PASS' : 'FAIL',
    url: page.url(),
    inAnswering,
    flags,
    traceEventSequence: traceEvents,
    levelMeterStarted,
    transcriptLen: transcript.length,
    transcriptPreview: transcript.slice(0, 240),
    noSpeechCount: noSpeechLines.length,
    deepgramFallbackTriggered: deepgramSwitch.length > 0,
    logs,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'interview-result.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(pass ? 0 : 1);
} catch (err) {
  const out = { verdict: 'FAIL', error: err instanceof Error ? err.message : String(err), logs };
  fs.writeFileSync(path.join(OUT_DIR, 'interview-result.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
