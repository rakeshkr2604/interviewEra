import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ELEVENLABS_VOICE_IDS,
  LEGACY_ELEVENLABS_VOICE_IDS,
  resolveElevenLabsVoiceId,
} from './elevenlabs-voices';

describe('resolveElevenLabsVoiceId', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = env;
    vi.restoreAllMocks();
  });

  it('maps priya and female to Sia', () => {
    expect(resolveElevenLabsVoiceId('priya')).toBe(ELEVENLABS_VOICE_IDS.priya);
    expect(resolveElevenLabsVoiceId('female')).toBe(ELEVENLABS_VOICE_IDS.priya);
  });

  it('maps arjun and male to Sagar', () => {
    expect(resolveElevenLabsVoiceId('arjun')).toBe(ELEVENLABS_VOICE_IDS.arjun);
    expect(resolveElevenLabsVoiceId('male')).toBe(ELEVENLABS_VOICE_IDS.arjun);
  });

  it('reads ELEVENLABS_VOICE_ID_FEMALE alias from env', () => {
    process.env.ELEVENLABS_VOICE_ID_FEMALE = 'custom-female-id';
    expect(resolveElevenLabsVoiceId('priya')).toBe('custom-female-id');
  });

  it('ignores legacy voice IDs from env', () => {
    const legacy = [...LEGACY_ELEVENLABS_VOICE_IDS][0];
    process.env.ELEVENLABS_VOICE_FEMALE_ID = legacy;
    expect(resolveElevenLabsVoiceId('priya')).toBe(ELEVENLABS_VOICE_IDS.priya);
    expect(console.warn).toHaveBeenCalled();
  });
});
