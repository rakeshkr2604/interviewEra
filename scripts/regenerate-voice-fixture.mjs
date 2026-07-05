/**
 * Regenerate voice-verify-speech.wav at 48 kHz mono PCM16 for Chrome
 * --use-file-for-fake-audio-capture (preferred rate).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'fixtures/voice-verify-speech.wav');
const DST = SRC;

function readPcm16(wav) {
  if (wav.toString('ascii', 0, 4) !== 'RIFF') throw new Error('Not RIFF');
  const sampleRate = wav.readUInt32LE(24);
  const numChannels = wav.readUInt16LE(22);
  const bitsPerSample = wav.readUInt16LE(34);
  if (bitsPerSample !== 16) throw new Error(`Expected 16-bit, got ${bitsPerSample}`);
  let offset = 12;
  while (offset < wav.length) {
    const id = wav.toString('ascii', offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    if (id === 'data') {
      const data = wav.subarray(offset + 8, offset + 8 + size);
      const samples = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
      return { sampleRate, numChannels, samples };
    }
    offset += 8 + size;
  }
  throw new Error('No data chunk');
}

function resample(samples, fromRate, toRate) {
  if (fromRate === toRate) return samples;
  const outLen = Math.floor((samples.length * toRate) / fromRate);
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcPos = (i * fromRate) / toRate;
    const idx = Math.floor(srcPos);
    const frac = srcPos - idx;
    const a = samples[idx] ?? 0;
    const b = samples[Math.min(idx + 1, samples.length - 1)] ?? 0;
    out[i] = Math.round(a + (b - a) * frac);
  }
  return out;
}

function writeWav(samples, sampleRate, numChannels = 1) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * numChannels * 2, 28);
  buf.writeUInt16LE(numChannels * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(samples[i], 44 + i * 2);
  }
  return buf;
}

const wav = fs.readFileSync(SRC);
const { sampleRate, numChannels, samples } = readPcm16(wav);
const mono =
  numChannels === 1
    ? samples
    : Int16Array.from({ length: samples.length / numChannels }, (_, i) => samples[i * numChannels]);
const targetRate = 48_000;
const resampled = resample(mono, sampleRate, targetRate);
const out = writeWav(resampled, targetRate, 1);
fs.writeFileSync(DST, out);
console.log(`Wrote ${DST}: ${sampleRate}Hz → ${targetRate}Hz, ${resampled.length} samples (${(resampled.length / targetRate).toFixed(2)}s)`);
