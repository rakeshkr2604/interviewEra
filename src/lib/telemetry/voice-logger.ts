/**
 * Voice usage telemetry — ElevenLabs TTS + Deepgram STT.
 * Fire-and-forget. Never blocks the audio response path.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { calculateTTSCost, calculateSTTCost } from '@/lib/cost/cost-engine';

export interface TTSLogEntry {
  user_id?: string;
  interview_id?: string;
  tts_chars: number;
  tts_model: string;
  tts_voice_id?: string;   // first 8 chars only — do not log full voice ID
  latency_ms?: number;
  auth_ms?: number;
  preflight_ms?: number;
  quota_ms?: number;
  elevenlabs_ttfb_ms?: number;
  success: boolean;
  error_category?: string;
  ip?: string;
  session_id?: string;
}

export interface STTLogEntry {
  user_id?: string;
  interview_id?: string;
  stt_duration_ms: number;
  stt_model: string;
  stt_language?: string;
  success: boolean;
  error_category?: string;
  ip?: string;
  session_id?: string;
}

export async function logTTSCall(entry: TTSLogEntry): Promise<void> {
  try {
    const cost_usd = calculateTTSCost(entry.tts_chars);
    const serviceClient = createServiceClient();
    await serviceClient.from('voice_usage_logs').insert({
      user_id:      entry.user_id ?? null,
      interview_id: entry.interview_id ?? null,
      provider:     'elevenlabs',
      voice_type:   'tts',
      tts_chars:    entry.tts_chars,
      tts_model:    entry.tts_model,
      tts_voice_id: entry.tts_voice_id?.slice(0, 8) ?? null,
      cost_usd,
      latency_ms:   entry.latency_ms ?? null,
      success:      entry.success,
      error_category: entry.error_category ?? null,
      ip:           entry.ip ?? null,
      session_id:   entry.session_id ?? null,
    });
  } catch (err) {
    console.error('[voice-logger] TTS log failed:', err);
  }
}

export async function logSTTSession(entry: STTLogEntry): Promise<void> {
  try {
    const cost_usd = calculateSTTCost(entry.stt_duration_ms);
    const serviceClient = createServiceClient();
    await serviceClient.from('voice_usage_logs').insert({
      user_id:      entry.user_id ?? null,
      interview_id: entry.interview_id ?? null,
      provider:     'deepgram',
      voice_type:   'stt',
      stt_duration_ms: entry.stt_duration_ms,
      stt_model:    entry.stt_model,
      stt_language: entry.stt_language ?? null,
      cost_usd,
      success:      entry.success,
      error_category: entry.error_category ?? null,
      ip:           entry.ip ?? null,
      session_id:   entry.session_id ?? null,
    });
  } catch (err) {
    console.error('[voice-logger] STT log failed:', err);
  }
}
