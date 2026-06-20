/**
 * Client-only interview / audio preferences (localStorage).
 * Keys are versioned strings to avoid collisions.
 */
import type { InterviewerId } from '@/lib/config/interviewers'
import type { InterviewDifficulty } from '@/types/app.types'

export const STORAGE_KEYS = {
  voiceGender: 'ie-voice-preference',
  interviewLanguage: 'ie-interview-language',
  defaultDifficulty: 'ie-default-difficulty',
  answerStyle: 'ie-answer-style',
  ttsRate: 'ie-tts-rate',
  aiVoiceEnabled: 'ie-ai-voice-enabled',
  noiseCancellation: 'ie-noise-cancellation',
  adaptiveFollowUpEnabled: 'ie-adaptive-follow-up-enabled',
  cameraInterviewModeEnabled: 'ie-camera-interview-mode-enabled',
} as const

export type InterviewLanguageCode = 'en' | 'hinglish'

export const INTERVIEW_LANGUAGE_LABELS: Record<InterviewLanguageCode, string> = {
  en: 'English',
  hinglish: 'English + Hindi (Hinglish)',
}

export function readInterviewLanguage(): InterviewLanguageCode {
  if (typeof window === 'undefined') return 'en'
  try {
    const v = localStorage.getItem(STORAGE_KEYS.interviewLanguage)
    if (v === 'en' || v === 'hinglish') return v
    return 'en'
  } catch {
    return 'en'
  }
}

export function writeInterviewLanguage(code: InterviewLanguageCode): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.interviewLanguage, code)
  } catch {
    /* restricted storage */
  }
}

export type AnswerStyle = 'concise' | 'balanced' | 'detailed'

export type VoiceGenderPreference = 'female' | 'male'

/** First-time session default — users can raise via Change / Settings. */
export const DEFAULT_INTERVIEW_DIFFICULTY: InterviewDifficulty = 'easy'

export function readVoiceGender(): VoiceGenderPreference {
  if (typeof window === 'undefined') return 'female'
  const v = localStorage.getItem(STORAGE_KEYS.voiceGender)
  return v === 'male' ? 'male' : 'female'
}

/** Avatar / start-interview default — matches Voice & audio gender selection. */
export function readPreferredInterviewerId(): InterviewerId {
  return readVoiceGender() === 'male' ? 'arjun' : 'priya'
}

export function readTtsRate(): number {
  if (typeof window === 'undefined') return 0.9
  const raw = localStorage.getItem(STORAGE_KEYS.ttsRate)
  const n = raw ? Number.parseFloat(raw) : NaN
  if (!Number.isFinite(n)) return 0.9
  return Math.min(1.15, Math.max(0.75, n))
}

export function readAiVoiceEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const v = localStorage.getItem(STORAGE_KEYS.aiVoiceEnabled)
  if (v === '0' || v === 'false') return false
  return true
}

export function readNoiseCancellationPreferred(): boolean {
  if (typeof window === 'undefined') return true
  const v = localStorage.getItem(STORAGE_KEYS.noiseCancellation)
  if (v === '0' || v === 'false') return false
  return true
}

/** Constraints passed to getUserMedia for speech recognition mic warmup. */
export function getMicAudioConstraints(): MediaStreamConstraints {
  const noise = readNoiseCancellationPreferred()
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: noise,
      autoGainControl: true,
    },
  }
}

export function readDefaultDifficulty(): InterviewDifficulty {
  if (typeof window === 'undefined') return DEFAULT_INTERVIEW_DIFFICULTY
  const v = localStorage.getItem(STORAGE_KEYS.defaultDifficulty)
  if (v === 'easy' || v === 'medium' || v === 'hard') return v
  return DEFAULT_INTERVIEW_DIFFICULTY
}

export function readAnswerStyle(): AnswerStyle {
  if (typeof window === 'undefined') return 'balanced'
  const v = localStorage.getItem(STORAGE_KEYS.answerStyle)
  if (v === 'concise' || v === 'balanced' || v === 'detailed') return v
  return 'balanced'
}

function readBooleanPref(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue
  try {
    const v = localStorage.getItem(key)
    if (v === '0' || v === 'false') return false
    if (v === '1' || v === 'true') return true
    return defaultValue
  } catch {
    return defaultValue
  }
}

export function writeBooleanPref(key: string, enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, enabled ? '1' : '0')
  } catch {
    /* restricted storage */
  }
}

/** Adaptive AI follow-ups after each answer (default on). */
export function readAdaptiveFollowUpEnabled(): boolean {
  return readBooleanPref(STORAGE_KEYS.adaptiveFollowUpEnabled, true)
}

export function writeAdaptiveFollowUpEnabled(enabled: boolean): void {
  writeBooleanPref(STORAGE_KEYS.adaptiveFollowUpEnabled, enabled)
}

/** Selfie camera preview during the answer phase (default on). */
export function readCameraInterviewModeEnabled(): boolean {
  return readBooleanPref(STORAGE_KEYS.cameraInterviewModeEnabled, true)
}

export function writeCameraInterviewModeEnabled(enabled: boolean): void {
  writeBooleanPref(STORAGE_KEYS.cameraInterviewModeEnabled, enabled)
}

/** Session override wins when touched; otherwise use Settings (localStorage). */
export function resolveSessionBooleanPreference(
  settingsValue: boolean,
  draftValue: boolean | undefined,
  touched: boolean | undefined,
): boolean {
  if (touched && draftValue !== undefined) return draftValue
  return settingsValue
}
