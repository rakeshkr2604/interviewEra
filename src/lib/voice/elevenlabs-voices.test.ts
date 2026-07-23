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

  it('maps priya/Meera and female to Sia (female voice id)', () => {
    // Meera (display) = id priya = female = Sia — do not swap with Sagar.
    expect(ELEVENLABS_VOICE_IDS.priya).toBe('W7iR5kTNHozpIl2Jqq15');
    expect(resolveElevenLabsVoiceId('priya')).toBe('W7iR5kTNHozpIl2Jqq15');
    expect(resolveElevenLabsVoiceId('female')).toBe('W7iR5kTNHozpIl2Jqq15');
  });

  it('maps arjun/Rohan and male to Sagar (male voice id)', () => {
    // Rohan (display) = id arjun = male = Sagar — do not swap with Sia.
    expect(ELEVENLABS_VOICE_IDS.arjun).toBe('Qc0h5B5Mqs8oaH4sFZ9X');
    expect(resolveElevenLabsVoiceId('arjun')).toBe('Qc0h5B5Mqs8oaH4sFZ9X');
    expect(resolveElevenLabsVoiceId('male')).toBe('Qc0h5B5Mqs8oaH4sFZ9X');
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
