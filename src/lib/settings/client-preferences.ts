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
} as const

export type InterviewLanguageCode = 'en'

/** Display-only id for roadmap language modes (not persisted yet). */
export const UPCOMING_INTERVIEW_LANGUAGE = {
  hinglish: 'hinglish',
} as const

export function readInterviewLanguage(): InterviewLanguageCode {
  if (typeof window === 'undefined') return 'en'
  try {
    const v = localStorage.getItem(STORAGE_KEYS.interviewLanguage)
    if (v === 'en') return 'en'
    return 'en'
  } catch {
    // localStorage can throw in restricted browser modes; keep deterministic fallback.
    return 'en'
  }
}

export type AnswerStyle = 'concise' | 'balanced' | 'detailed'

export type VoiceGenderPreference = 'female' | 'male'

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
  if (typeof window === 'undefined') return 'medium'
  const v = localStorage.getItem(STORAGE_KEYS.defaultDifficulty)
  if (v === 'easy' || v === 'medium' || v === 'hard') return v
  return 'medium'
}

export function readAnswerStyle(): AnswerStyle {
  if (typeof window === 'undefined') return 'balanced'
  const v = localStorage.getItem(STORAGE_KEYS.answerStyle)
  if (v === 'concise' || v === 'balanced' || v === 'detailed') return v
  return 'balanced'
}
