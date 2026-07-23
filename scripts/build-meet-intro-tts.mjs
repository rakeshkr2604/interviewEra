/**
 * Build Meet-interviewer intro MP4s: silent video + ElevenLabs TTS mux.
 * Spoken lines match script/start voice preview copy (role-correct).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SIA = 'W7iR5kTNHozpIl2Jqq15'; // Meera
const SAGAR = 'Qc0h5B5Mqs8oaH4sFZ9X'; // Rohan
const MODEL = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';
const KEY = process.env.ELEVENLABS_API_KEY;

if (!KEY) {
  console.error('Missing ELEVENLABS_API_KEY');
  process.exit(1);
}

/** Exact product preview lines from script/start (cards had no greeting caption). */
const CLIPS = [
  {
    id: 'rohan',
    voiceId: SAGAR,
    line: "Hello! I'm Rohan, your technical interviewer. Let's dive into your experience.",
    videoIn: 'public/assets/rohan-intro.mp4',
  },
  {
    id: 'meera',
    voiceId: SIA,
    line: "Hi! I'm Meera, your AI interviewer. I'll guide you through this session.",
    videoIn: 'public/assets/meera-intro.mp4',
  },
];

const TMP = '.tmp/meet-tts';
fs.mkdirSync(TMP, { recursive: true });

function ff(...args) {
  const r = spawnSync('ffmpeg', ['-y', ...args], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stderr);
    throw new Error(`ffmpeg failed: ${args.join(' ')}`);
  }
}

function probeDuration(file) {
  const r = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file],
    { encoding: 'utf8' },
  );
  return parseFloat(String(r.stdout).trim());
}

function fileSize(p) {
  return fs.statSync(p).size;
}

async function tts(voiceId, text, outMp3) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({ text, model_id: MODEL }),
    },
  );
  if (!res.ok) throw new Error(`TTS ${voiceId}: ${res.status} ${await res.text()}`);
  fs.writeFileSync(outMp3, Buffer.from(await res.arrayBuffer()));
}

for (const clip of CLIPS) {
  const before = fileSize(clip.videoIn);
  const silent = path.join(TMP, `${clip.id}-silent.mp4`);
  const mp3 = path.join(TMP, `${clip.id}-tts.mp3`);
  const aac = path.join(TMP, `${clip.id}-tts.m4a`);
  const out = path.join(TMP, `${clip.id}-muxed.mp4`);

  // Ensure video-only (strip any audio if present)
  ff('-i', clip.videoIn, '-map', '0:v:0', '-c:v', 'copy', '-an', silent);

  await tts(clip.voiceId, clip.line, mp3);
  // Convert TTS to AAC for mp4 mux
  ff('-i', mp3, '-c:a', 'aac', '-b:a', '128k', aac);

  const vDur = probeDuration(silent);
  const aDur = probeDuration(aac);
  console.log(`${clip.id}: video=${vDur.toFixed(2)}s audio=${aDur.toFixed(2)}s before=${before}B`);

  // If audio longer than video, trim audio to video length; else pad with silence via -shortest off and apad
  if (aDur > vDur + 0.05) {
    ff(
      '-i',
      silent,
      '-i',
      aac,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-t',
      String(vDur),
      '-movflags',
      '+faststart',
      out,
    );
  } else {
    // Pad audio with silence to video duration so loops don't click mid-word restart oddly
    ff(
      '-i',
      silent,
      '-i',
      aac,
      '-filter_complex',
      `[1:a]apad=whole_dur=${vDur}[a]`,
      '-map',
      '0:v:0',
      '-map',
      '[a]',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-t',
      String(vDur),
      '-movflags',
      '+faststart',
      out,
    );
  }

  const after = fileSize(out);
  fs.copyFileSync(out, clip.videoIn);
  console.log(
    `${clip.id}: wrote ${clip.videoIn} after=${after}B delta=${after - before}B line=${JSON.stringify(clip.line)}`,
  );
}

console.log('done');
