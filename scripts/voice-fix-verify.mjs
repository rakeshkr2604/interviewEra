/**
 * Runtime verification: Web Speech without parallel getUserMedia (post-fix path).
 * Usage: node scripts/voice-fix-verify.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEECH_WAV = path.resolve(__dirname, 'fixtures/voice-verify-speech.wav');
const OUT_DIR = path.resolve(__dirname, '../.voice-verify-out');

const HARNESS_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Voice Fix Verify</title></head>
<body>
  <button id="mic">Start microphone</button>
  <div id="status">idle</div>
  <textarea id="transcript" rows="6" cols="60" placeholder="transcript"></textarea>
  <script>
    window.__events = [];
    window.__errors = [];
    function log(type, detail) {
      const e = { type, detail, ts: Date.now() };
      window.__events.push(e);
      console.log('[VOICE_VERIFY]', type, detail || '');
    }
    const mic = document.getElementById('mic');
    const status = document.getElementById('status');
    const box = document.getElementById('transcript');
    let recognition = null;
    let finalText = '';
    let interimText = '';

    mic.addEventListener('click', () => {
      const Cls = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Cls) { log('unsupported'); return; }
      if (recognition) { try { recognition.stop(); } catch {} recognition = null; }
      finalText = ''; interimText = ''; box.value = '';
      recognition = new Cls();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onstart = () => { status.textContent = 'starting'; log('onstart'); };
      recognition.onaudiostart = () => { log('onaudiostart'); };
      recognition.onsoundstart = () => { log('onsoundstart'); };
      recognition.onspeechstart = () => { status.textContent = 'active'; log('onspeechstart'); };
      recognition.onresult = (ev) => {
        let fin = '', inter = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (r.isFinal) fin += r[0].transcript; else inter += r[0].transcript;
        }
        if (fin) finalText += fin;
        if (inter) interimText = inter;
        box.value = (finalText + ' ' + interimText).trim();
        log('onresult', { final: !!fin, interim: !!inter, len: box.value.length, text: box.value.slice(0, 120) });
      };
      recognition.onerror = (ev) => { log('onerror', { error: ev.error }); window.__errors.push(ev.error); };
      recognition.onend = () => { log('onend'); };
      // POST-FIX PATH: no parallel getUserMedia / level meter here.
      log('recognition_start_called');
      try { recognition.start(); } catch (err) { log('start_throw', { message: String(err) }); }
    });
  </script>
</body></html>`;

const BROKEN_HARNESS_HTML = HARNESS_HTML.replace(
  '      // POST-FIX PATH: no parallel getUserMedia / level meter here.',
  `      // BROKEN PATH: parallel getUserMedia like old startSttInputLevelMeter()
      navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
        window.__parallelStream = s;
        log('parallel_getUserMedia_started');
      }).catch((e) => log('parallel_getUserMedia_failed', { message: String(e) }));`,
);

async function runCase(name, html) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const events = [];
  const consoleLines = [];

  const browser = await chromium.launch({
    headless: process.env.HEADED ? false : true,
    channel: process.env.CHROME_CHANNEL || 'chrome',
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      `--use-file-for-fake-audio-capture=${SPEECH_WAV}`,
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  try {
    const context = await browser.newContext({
      permissions: ['microphone'],
    });
    const page = await context.newPage();

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[VOICE_VERIFY]')) consoleLines.push(text);
    });

    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.click('#mic');
    await page.waitForTimeout(15000);

    const result = await page.evaluate(() => ({
      events: window.__events,
      errors: window.__errors,
      transcript: document.getElementById('transcript')?.value ?? '',
      status: document.getElementById('status')?.textContent ?? '',
    }));

    await page.screenshot({
      path: path.join(OUT_DIR, `${name}.png`),
      fullPage: true,
    });

    await context.close();
    return { name, result, consoleLines };
  } finally {
    await browser.close();
  }
}

function summarize(run) {
  const types = run.result.events.map((e) => e.type);
  const noSpeechCount = run.result.errors.filter((e) => e === 'no-speech').length;
  return {
    name: run.name,
    flags: {
      onaudiostart: types.includes('onaudiostart'),
      onsoundstart: types.includes('onsoundstart'),
      onspeechstart: types.includes('onspeechstart'),
      onresult: types.includes('onresult'),
    },
    transcriptLen: run.result.transcript.trim().length,
    transcript: run.result.transcript.trim(),
    noSpeechCount,
    deepgramFallbackWouldFire: noSpeechCount >= 4,
    status: run.result.status,
    eventSequence: types,
    consoleLines: run.consoleLines,
  };
}

if (!fs.existsSync(SPEECH_WAV)) {
  console.error('FAIL: missing speech fixture at', SPEECH_WAV);
  process.exit(1);
}

console.log('Running voice fix verification with fixture:', SPEECH_WAV);

const fixedRun = await runCase('fixed-no-parallel-capture', HARNESS_HTML);
const fixed = summarize(fixedRun);

const brokenRun = await runCase('broken-parallel-capture', BROKEN_HARNESS_HTML);
const broken = summarize(brokenRun);

console.log('\n=== FIXED PATH (no parallel getUserMedia) ===');
console.log(JSON.stringify(fixed, null, 2));

console.log('\n=== BROKEN PATH (parallel getUserMedia — pre-fix) ===');
console.log(JSON.stringify(broken, null, 2));

const pass =
  fixed.flags.onaudiostart &&
  fixed.flags.onresult &&
  fixed.transcriptLen > 0 &&
  fixed.noSpeechCount === 0 &&
  !fixed.deepgramFallbackWouldFire;

console.log('\n=== VERDICT ===');
console.log(pass ? 'PASS' : 'FAIL');

if (!pass) {
  console.log('Failing event:', !fixed.flags.onaudiostart ? 'onaudiostart' :
    !fixed.flags.onresult ? 'onresult' :
    fixed.transcriptLen === 0 ? 'empty_transcript' :
    fixed.noSpeechCount > 0 ? 'no-speech loop' : 'unknown');
  process.exit(1);
}

process.exit(0);
