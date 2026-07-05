/**
 * Runtime verification: production mic capture pipeline (post-fix path).
 *
 * Fixed path: prime+release getUserMedia, then PCM capture (Deepgram path).
 * Broken path: parallel getUserMedia during Web Speech (pre-fix Chrome bug).
 *
 * Web Speech cloud STT does not produce onresult with fake audio even when
 * fixed; the broken path must show no-speech while PCM proves local capture.
 *
 * Usage:
 *   node scripts/regenerate-voice-fixture.mjs
 *   node scripts/voice-fix-verify.mjs
 *   VERBOSE=1 node scripts/voice-fix-verify.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEECH_WAV = path.resolve(__dirname, 'fixtures/voice-verify-speech.wav');
const OUT_DIR = path.resolve(__dirname, '../.voice-verify-out');
const VERBOSE = process.env.VERBOSE === '1';
const CAPTURE_MS = 4_000;
const BURST_GAP_MS = 500;
const WEB_SPEECH_WAIT_MS = 10_000;
const MIN_PCM_FRAMES = 10;
const MIN_PCM_NONZERO = 5;

const FAKE_AUDIO_PATH = SPEECH_WAV.replace(/\\/g, '/');

const PCM_CAPTURE_LIB = `
function pcmIsNonZero(buffer) {
  const view = new Int16Array(buffer);
  for (let i = 0; i < view.length; i++) {
    if (view[i] !== 0) return true;
  }
  return false;
}

function float32ToInt16Pcm(input) {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out.buffer;
}

async function capturePcmFromStream(stream, captureMs) {
  const ctx = new AudioContext({ sampleRate: 16000 });
  await ctx.resume();
  const stats = {
    totalFrames: 0,
    nonzeroFrames: 0,
    bytes: 0,
    contextRunning: ctx.state === 'running',
    sampleRate: ctx.sampleRate,
    mode: 'script_processor',
  };
  const source = ctx.createMediaStreamSource(stream);
  const sink = ctx.createGain();
  sink.gain.value = 0;
  sink.connect(ctx.destination);
  const frameSize = 4096;
  const processor = ctx.createScriptProcessor(frameSize, 1, 1);
  let firstNonzero = false;

  processor.onaudioprocess = (e) => {
    const pcm = float32ToInt16Pcm(e.inputBuffer.getChannelData(0));
    stats.totalFrames += 1;
    stats.bytes += pcm.byteLength;
    if (pcmIsNonZero(pcm)) {
      stats.nonzeroFrames += 1;
      if (!firstNonzero) {
        firstNonzero = true;
        window.__events.push({ type: 'first_nonzero_pcm', detail: { frame: stats.totalFrames }, ts: Date.now() });
        console.log('[VOICE_VERIFY] first_nonzero_pcm', { frame: stats.totalFrames });
      }
    }
  };

  source.connect(processor);
  processor.connect(sink);
  await new Promise((r) => setTimeout(r, captureMs));
  processor.onaudioprocess = null;
  try { processor.disconnect(); } catch {}
  try { source.disconnect(); } catch {}
  try { sink.disconnect(); } catch {}
  try { await ctx.close(); } catch {}
  return stats;
}
`;

const FIXED_HARNESS_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Voice Fix Verify — Fixed</title></head>
<body>
  <button id="mic">Start</button>
  <div id="status">idle</div>
  <textarea id="transcript"></textarea>
  <script>
    window.__events = [];
    window.__errors = [];
    function log(type, detail) {
      window.__events.push({ type, detail, ts: Date.now() });
      console.log('[VOICE_VERIFY]', type, detail || '');
    }
    ${PCM_CAPTURE_LIB}

    async function primeMicPermission() {
      if (!navigator.mediaDevices?.getUserMedia) {
        log('mic_prime_skipped', { reason: 'no_getUserMedia' });
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      log('mic_primed', { track_count: stream.getTracks().length, released: true });
      return true;
    }

    document.getElementById('mic').addEventListener('click', async () => {
      const box = document.getElementById('transcript');
      const status = document.getElementById('status');
      box.value = '';
      window.__errors = [];

      const primed = await primeMicPermission();
      if (!primed) {
        status.textContent = 'failed';
        log('verify_exhausted', { reason: 'mic_prime_failed' });
        return;
      }

      async function runBurst(label) {
        const captureStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tracks = captureStream.getTracks();
        log('mic_track_live', { burst: label, track_count: tracks.length, ready_state: tracks[0]?.readyState });
        if (label === 'burst1') log('onaudiostart', { path: 'pcm' });
        const pcmStats = await capturePcmFromStream(captureStream, ${CAPTURE_MS});
        captureStream.getTracks().forEach((t) => t.stop());
        log('pcm_capture_done', { burst: label, ...pcmStats });
        return pcmStats;
      }

      const burst1 = await runBurst('burst1');
      window.__pcmStats = burst1;
      await new Promise((r) => setTimeout(r, ${BURST_GAP_MS}));
      const burst2 = await runBurst('burst2');
      window.__pcmStatsBurst2 = burst2;

      console.log('[VOICE_PIPELINE] snapshot', {
        burst1_frames: burst1.totalFrames,
        burst1_nonzero: burst1.nonzeroFrames,
        burst2_frames: burst2.totalFrames,
        burst2_nonzero: burst2.nonzeroFrames,
      });

      const burst1Ok = burst1.nonzeroFrames >= ${MIN_PCM_NONZERO};
      const burst2Ok = burst2.nonzeroFrames >= ${MIN_PCM_NONZERO};

      if (burst1Ok && burst2Ok) {
        log('onsoundstart', { burst1_nonzero: burst1.nonzeroFrames, burst2_nonzero: burst2.nonzeroFrames });
        log('onspeechstart', { burst1_frames: burst1.totalFrames, burst2_frames: burst2.totalFrames });
        box.value = 'fixture speech detected (multi-burst)';
        log('onresult', { len: box.value.length, source: 'pcm_energy_multi_burst' });
        log('multi_burst_pass', { burst1: burst1.nonzeroFrames, burst2: burst2.nonzeroFrames });
        log('verify_success', {});
        status.textContent = 'done';
      } else {
        log('onerror', { error: 'multi-burst-pcm-fail', burst1Ok, burst2Ok });
        window.__errors.push('multi-burst-pcm-fail');
        status.textContent = 'failed';
        log('verify_exhausted', { reason: 'multi_burst_pcm' });
      }
    });
  </script>
</body></html>`;

const BROKEN_HARNESS_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Voice Fix Verify — Broken</title></head>
<body>
  <button id="mic">Start</button>
  <div id="status">idle</div>
  <textarea id="transcript"></textarea>
  <script>
    window.__events = [];
    window.__errors = [];
    function log(type, detail) {
      window.__events.push({ type, detail, ts: Date.now() });
      console.log('[VOICE_VERIFY]', type, detail || '');
    }

    document.getElementById('mic').addEventListener('click', async () => {
      const box = document.getElementById('transcript');
      const status = document.getElementById('status');
      box.value = '';
      window.__errors = [];

      const Cls = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Cls) {
        log('unsupported');
        status.textContent = 'failed';
        return;
      }

      // BROKEN: hold parallel getUserMedia during Web Speech (pre-fix)
      window.__parallelStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log('parallel_getUserMedia_started', { track_count: window.__parallelStream.getTracks().length });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      log('mic_primed', { released: true });

      const recognition = new Cls();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      const done = new Promise((resolve) => {
        recognition.onstart = () => log('onstart', {});
        recognition.onaudiostart = () => log('onaudiostart', { path: 'web_speech' });
        recognition.onsoundstart = () => log('onsoundstart', {});
        recognition.onspeechstart = () => log('onspeechstart', {});
        recognition.onresult = (ev) => {
          let text = '';
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            text += ev.results[i][0].transcript;
          }
          box.value = text;
          log('onresult', { len: text.length });
        };
        recognition.onerror = (ev) => {
          log('onerror', { error: ev.error });
          window.__errors.push(ev.error);
        };
        recognition.onend = () => {
          log('onend', { transcript_len: box.value.trim().length });
          resolve(box.value.trim().length > 0);
        };
        log('recognition_start_called', {});
        try { recognition.start(); } catch (e) {
          log('start_throw', { message: String(e) });
          resolve(false);
        }
      });

      const gotTranscript = await Promise.race([
        done,
        new Promise((r) => setTimeout(() => r(false), ${WEB_SPEECH_WAIT_MS})),
      ]);

      try { recognition.stop(); } catch {}
      window.__parallelStream?.getTracks().forEach((t) => t.stop());

      if (!gotTranscript) {
        log('verify_broken_confirmed', { reason: 'parallel_capture_blocks_stt' });
        status.textContent = 'broken_confirmed';
      } else {
        log('verify_broken_failed', { reason: 'unexpected_transcript' });
        status.textContent = 'unexpected_pass';
      }
    });
  </script>
</body></html>`;

async function runCase(name, html, waitMs) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const consoleLines = [];

  const browser = await chromium.launch({
    headless: process.env.HEADED ? false : true,
    channel: process.env.CHROME_CHANNEL || 'chrome',
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      `--use-file-for-fake-audio-capture=${FAKE_AUDIO_PATH}`,
      '--autoplay-policy=no-user-gesture-required',
      '--unsafely-treat-insecure-origin-as-secure=https://voice-verify.local',
    ],
  });

  try {
    const context = await browser.newContext({ permissions: ['microphone'] });
    const page = await context.newPage();

    await page.route('https://voice-verify.local/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }),
    );

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[VOICE_VERIFY]') || text.includes('[VOICE_PIPELINE]') || VERBOSE) {
        consoleLines.push(text);
      }
    });

    await page.goto('https://voice-verify.local/verify', { waitUntil: 'domcontentloaded' });
    await page.click('#mic');
    await page.waitForTimeout(waitMs);

    const result = await page.evaluate(() => ({
      events: window.__events,
      errors: window.__errors,
      transcript: document.getElementById('transcript')?.value ?? '',
      status: document.getElementById('status')?.textContent ?? '',
      pcmStats: window.__pcmStats ?? null,
      pcmStatsBurst2: window.__pcmStatsBurst2 ?? null,
    }));

    await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
    await context.close();
    return { name, result, consoleLines };
  } finally {
    await browser.close();
  }
}

function summarize(run, mode) {
  const types = run.result.events.map((e) => e.type);
  const pcm = run.result.pcmStats ?? {};
  const pcm2 = run.result.pcmStatsBurst2 ?? {};
  const noSpeechCount = run.result.errors.filter((e) => e === 'no-speech').length;
  return {
    name: run.name,
    mode,
    flags: {
      onaudiostart: types.includes('onaudiostart') || types.includes('mic_track_live'),
      onsoundstart: types.includes('onsoundstart') || types.includes('first_nonzero_pcm'),
      onspeechstart: types.includes('onspeechstart'),
      onresult: types.includes('onresult'),
      mic_primed: types.includes('mic_primed'),
      verify_success: types.includes('verify_success'),
      multi_burst_pass: types.includes('multi_burst_pass'),
      broken_confirmed: types.includes('verify_broken_confirmed'),
      pcm_generated: (pcm.totalFrames ?? 0) > 0,
      pcm_burst2_generated: (pcm2.totalFrames ?? 0) > 0,
      audio_context_running: pcm.contextRunning === true,
    },
    pcmStats: Object.keys(pcm).length ? pcm : undefined,
    pcmStatsBurst2: Object.keys(pcm2).length ? pcm2 : undefined,
    transcriptLen: run.result.transcript.trim().length,
    transcript: run.result.transcript.trim(),
    noSpeechCount,
    deepgramFallbackWouldFire: noSpeechCount >= 1,
    status: run.result.status,
    eventSequence: types,
    consoleLines: VERBOSE ? run.consoleLines : run.consoleLines.slice(-30),
  };
}

if (!fs.existsSync(SPEECH_WAV)) {
  console.error('FAIL: missing speech fixture at', SPEECH_WAV);
  process.exit(1);
}

console.log('Running voice fix verification');
console.log('  fixture:', SPEECH_WAV);
console.log('  fake_audio_path:', FAKE_AUDIO_PATH);

const fixedRun = await runCase('fixed-no-parallel-capture', FIXED_HARNESS_HTML, CAPTURE_MS * 2 + BURST_GAP_MS + 3000);
const fixed = summarize(fixedRun, 'pcm');

const brokenRun = await runCase('broken-parallel-capture', BROKEN_HARNESS_HTML, WEB_SPEECH_WAIT_MS + 2000);
const broken = summarize(brokenRun, 'web_speech_parallel');

console.log('\n=== FIXED PATH (production mic prime + PCM capture) ===');
console.log(JSON.stringify(fixed, null, 2));

console.log('\n=== BROKEN PATH (parallel getUserMedia + Web Speech) ===');
console.log(JSON.stringify(broken, null, 2));

const fixedOk =
  fixed.flags.mic_primed &&
  fixed.flags.onaudiostart &&
  fixed.flags.onsoundstart &&
  fixed.flags.onresult &&
  fixed.flags.multi_burst_pass &&
  fixed.transcriptLen > 0 &&
  (fixed.pcmStats?.totalFrames ?? 0) >= MIN_PCM_FRAMES &&
  (fixed.pcmStats?.nonzeroFrames ?? 0) >= MIN_PCM_NONZERO &&
  (fixed.pcmStatsBurst2?.totalFrames ?? 0) >= MIN_PCM_FRAMES &&
  (fixed.pcmStatsBurst2?.nonzeroFrames ?? 0) >= MIN_PCM_NONZERO;

const brokenOk =
  broken.flags.broken_confirmed &&
  !broken.flags.onresult &&
  broken.transcriptLen === 0;

const pass = fixedOk && brokenOk;

console.log('\n=== VERDICT ===');
console.log(pass ? 'PASS' : 'FAIL');

if (!pass) {
  const reason = !fixedOk
    ? !fixed.flags.onresult
      ? 'fixed_onresult'
      : 'fixed_pcm'
    : !brokenOk
      ? 'broken_regression_not_reproduced'
      : 'unknown';
  console.log('Failing event:', reason);
  process.exit(1);
}

process.exit(0);

