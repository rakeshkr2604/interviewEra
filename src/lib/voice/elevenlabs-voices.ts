import type { InterviewerId } from '@/lib/config/interviewers';

/** ElevenLabs voice library IDs for on-screen interviewers. */
export const ELEVENLABS_VOICE_IDS = {
  /** Priya — Sia: Sharp, Clear and Confident */
  priya: 'W7iR5kTNHozpIl2Jqq15',
  /** Arjun — Sagar: Real, Conversational E-Learning */
  arjun: 'Qc0h5B5Mqs8oaH4sFZ9X',
} as const satisfies Record<InterviewerId, string>;

/** Gender keys used by /api/tts and ProsodicTTS (maps to interviewer voices). */
export const ELEVENLABS_VOICE_BY_GENDER = {
  female: ELEVENLABS_VOICE_IDS.priya,
  male: ELEVENLABS_VOICE_IDS.arjun,
} as const;

export type ElevenLabsGenderVoice = keyof typeof ELEVENLABS_VOICE_BY_GENDER;

/** Previous default voices — ignore if still set in env (Vercel/local). */
export const LEGACY_ELEVENLABS_VOICE_IDS = new Set([
  'pFZP5JQG7iQjIQuC4Bku',
  '1qEiC6qsybMkmnNbush0',
]);

function readTrimmedEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

function normalizeEnvVoiceId(
  raw: string | undefined,
  fallback: string,
  label: string,
): string {
  if (!raw) return fallback;
  if (LEGACY_ELEVENLABS_VOICE_IDS.has(raw)) {
    console.warn(
      `[TTS] Ignoring legacy ElevenLabs voice ID for ${label} (${raw}); using ${fallback}`,
    );
    return fallback;
  }
  return raw;
}

/** Resolve ElevenLabs voice ID from interviewer id or gender key. */
export function resolveElevenLabsVoiceId(
  key: InterviewerId | ElevenLabsGenderVoice | string | undefined,
): string {
  const normalized = (key ?? 'priya').toLowerCase();

  if (normalized === 'priya' || normalized === 'female') {
    return normalizeEnvVoiceId(
      readTrimmedEnv(
        'ELEVENLABS_VOICE_PRIYA_ID',
        'ELEVENLABS_VOICE_FEMALE_ID',
        'ELEVENLABS_VOICE_ID_FEMALE',
      ),
      ELEVENLABS_VOICE_IDS.priya,
      'priya',
    );
  }

  if (normalized === 'arjun' || normalized === 'male') {
    return normalizeEnvVoiceId(
      readTrimmedEnv(
        'ELEVENLABS_VOICE_ARJUN_ID',
        'ELEVENLABS_VOICE_MALE_ID',
        'ELEVENLABS_VOICE_ID_MALE',
      ),
      ELEVENLABS_VOICE_IDS.arjun,
      'arjun',
    );
  }

  return ELEVENLABS_VOICE_IDS.priya;
}

export function resolveElevenLabsModelId(): string {
  return (
    readTrimmedEnv(
      'ELEVENLABS_MODEL_ID',
      'ELEVENLABS_MODEL_PRIMARY',
    ) ?? 'eleven_flash_v2_5'
  );
}
