/**
 * InterviewEra app runtime verification on localhost (headed Chrome, real mic).
 * Captures [STT_INPUT_TRACE], [speech], [VOICE_VERIFY] console lines.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../.voice-verify-out');
const BASE = process.env.APP_URL || 'http://localhost:3000';
const SESSION_PATH = process.env.INTERVIEW_SESSION_URL || '';

fs.mkdirSync(OUT_DIR, { recursive: true });

const logs = [];

async function main() {
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: [
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
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
      t.includes('[mic-flow]')
    ) {
      logs.push({ ts: Date.now(), text: t });
    }
  });

  const target = SESSION_PATH || `${BASE}/dashboard`;
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  const url = page.url();
  await page.screenshot({ path: path.join(OUT_DIR, 'app-initial.png'), fullPage: true });

  if (url.includes('/login')) {
    const out = {
      verdict: 'FAIL',
      reason: 'auth_required',
      url,
      message: 'Set INTERVIEW_SESSION_URL to a logged-in candidate_answering session URL',
      logs,
    };
    fs.writeFileSync(path.join(OUT_DIR, 'app-result.json'), JSON.stringify(out, null, 2));
    console.log(JSON.stringify(out, null, 2));
    await browser.close();
    process.exit(1);
  }

  // Try mic controls on session page
  const micSelectors = [
    'button:has-text("Tap here to start microphone")',
    'button:has-text("Click mic to enable")',
    'button:has-text("Getting ready")',
    'button:has(svg)', // mic toggle in CandidateTranscript header
  ];

  let clicked = false;
  for (const sel of micSelectors) {
    const loc = page.locator(sel).first();
    if (await loc.count()) {
      try {
        await loc.click({ timeout: 3000 });
        clicked = true;
        logs.push({ ts: Date.now(), text: `[AUTO] clicked ${sel}` });
        break;
      } catch {
        /* try next */
      }
    }
  }

  await page.waitForTimeout(8000);

  const transcript = await page.evaluate(() => {
    const el = document.querySelector('[class*="whitespace-pre-wrap"]');
    return el?.textContent?.trim() ?? '';
  }).catch(() => '');

  const debugFlags = await page.evaluate(() => {
    const panel = document.body.innerText;
    return {
      hasSttDebug: panel.includes('STT Input Debug'),
      panelSnippet: panel.slice(0, 500),
    };
  });

  await page.screenshot({ path: path.join(OUT_DIR, 'app-after-speak.png'), fullPage: true });

  const traceEvents = logs
    .map((l) => l.text)
    .flatMap((t) => {
      const m = t.match(/\[STT_INPUT_TRACE\] (\w+)/);
      return m ? [m[1]] : [];
    });

  const noSpeechLines = logs.filter((l) => l.text.includes('no-speech') || l.text.includes('benign_error'));
  const deepgramSwitch = logs.filter((l) => l.text.includes('switch_to_deepgram') || l.text.includes('web_speech_stalled'));

  const flags = {
    onaudiostart: traceEvents.includes('onaudiostart'),
    onsoundstart: traceEvents.includes('onsoundstart'),
    onspeechstart: traceEvents.includes('onspeechstart'),
    onresult: traceEvents.includes('onresult'),
  };

  const pass =
    clicked &&
    flags.onaudiostart &&
    flags.onresult &&
    transcript.length > 20 &&
    noSpeechLines.length === 0 &&
    deepgramSwitch.length === 0;

  const out = {
    verdict: pass ? 'PASS' : 'FAIL',
    url: page.url(),
    clicked,
    flags,
    traceEvents,
    transcriptLen: transcript.length,
    transcriptPreview: transcript.slice(0, 200),
    noSpeechCount: noSpeechLines.length,
    deepgramFallbackTriggered: deepgramSwitch.length > 0,
    debugFlags,
    logs,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'app-result.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
