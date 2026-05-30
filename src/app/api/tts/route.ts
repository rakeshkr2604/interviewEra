import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkTTSQuota, recordTTSUsage, enforcePerInterviewTTSLimit } from '@/lib/quota/voice-quota';
import { logTTSCall } from '@/lib/telemetry/voice-logger';
import { abuseGate } from '@/lib/abuse/risk-scorer';

/** Indian English–friendly voices (override via env for your ElevenLabs library). */
const VOICE_IDS: Record<string, string> = {
  female: process.env.ELEVENLABS_VOICE_FEMALE_ID ?? 'pFZP5JQG7iQjIQuC4Bku',
  male: process.env.ELEVENLABS_VOICE_MALE_ID ?? '1qEiC6qsybMkmnNbush0',
};

const TTS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID ?? 'eleven_multilingual_v2';

// Hard ceiling: no single TTS request may exceed this regardless of plan.
// Prevents runaway prompts from generating 10-minute audio at full cost.
const ABSOLUTE_MAX_CHARS = 2_000;

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

function toneToVoiceSettings(tone: string, text: string): VoiceSettings {
  const isQuestion = text.includes('?');
  switch (tone) {
    case 'encouraging':
      return { stability: 0.28, similarity_boost: 0.72, style: isQuestion ? 0.38 : 0.45, use_speaker_boost: true };
    case 'challenging':
      return { stability: 0.42, similarity_boost: 0.75, style: isQuestion ? 0.48 : 0.55, use_speaker_boost: true };
    default:
      return { stability: 0.35, similarity_boost: 0.74, style: isQuestion ? 0.36 : 0.42, use_speaker_boost: true };
  }
}

function enhanceTextForSpeech(text: string): string {
  return text
    .replace(/\?\s*/g, '? ')
    .replace(/!\s*/g, '! ')
    .replace(/\.\s+/g, '. ')
    .replace(/,\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

export async function POST(request: NextRequest) {
  const t0 = Date.now();
  const ip = extractIP(request);

  // ── 1. Auth ─────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Abuse gate ────────────────────────────────────────────────────────────
  const abuse = await abuseGate(user.id, ip);
  if (!abuse.allowed) {
    return NextResponse.json(
      { error: 'Request blocked. Please try again later.' },
      { status: 429, headers: abuse.block_ttl_s ? { 'Retry-After': String(abuse.block_ttl_s) } : {} },
    );
  }

  // ── 3. Resolve plan tier ─────────────────────────────────────────────────────
  const serviceClient = createServiceClient();
  const { data: userData } = await serviceClient
    .from('users')
    .select('plan_tier')
    .eq('id', user.id)
    .maybeSingle();
  const planTier = userData?.plan_tier ?? 'free';

  // ── 4. Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { text, voice, tone, interview_id } = (body ?? {}) as {
    text?: string; voice?: string; tone?: string; interview_id?: string;
  };

  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  // ── 5. Per-request hard ceiling (absolute max, plan-independent) ──────────────
  const truncatedText = text.slice(0, ABSOLUTE_MAX_CHARS);
  if (text.length > ABSOLUTE_MAX_CHARS) {
    console.warn(`[TTS] Text truncated: ${text.length} → ${ABSOLUTE_MAX_CHARS} chars (user: ${user.id})`);
  }

  // ── 6. Per-interview TTS ceiling (plan-dependent) ────────────────────────────
  const { clamped: clampedChars, was_clamped } = enforcePerInterviewTTSLimit(
    truncatedText.length,
    planTier,
  );
  const finalText = was_clamped ? truncatedText.slice(0, clampedChars) : truncatedText;

  // ── 7. Monthly TTS quota check ───────────────────────────────────────────────
  const quota = await checkTTSQuota(user.id, planTier, finalText.length);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: 'Monthly TTS quota exceeded. Voice is unavailable until next month.',
        quota: { used: quota.used_chars, limit: quota.limit_chars },
        fallback: 'browser_tts',
      },
      { status: 429 },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('[TTS proxy] ELEVENLABS_API_KEY not configured');
    return NextResponse.json({ error: 'TTS not configured' }, { status: 500 });
  }

  const voiceId     = VOICE_IDS[voice ?? 'female'] ?? VOICE_IDS.female;
  const spokenText  = enhanceTextForSpeech(finalText);
  const voiceSettings = toneToVoiceSettings(tone ?? 'neutral', spokenText);

  // ── 8. ElevenLabs call ───────────────────────────────────────────────────────
  let success = false;
  let errorCategory: string | undefined;

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          Accept:           'audio/mpeg',
          'Content-Type':   'application/json',
          'xi-api-key':     apiKey,
        },
        body: JSON.stringify({
          text:           spokenText,
          model_id:       TTS_MODEL_ID,
          voice_settings: voiceSettings,
        }),
        signal: AbortSignal.timeout(12_000), // 12s hard timeout
      },
    );

    if (!upstream.ok) {
      const errBody = await upstream.text().catch(() => upstream.statusText);
      console.error('[TTS proxy] ElevenLabs error:', upstream.status, errBody);
      errorCategory = 'http_error';
      void logTTSCall({
        user_id: user.id, interview_id: interview_id ?? undefined,
        tts_chars: spokenText.length, tts_model: 'eleven_turbo_v2_5',
        tts_voice_id: voiceId, latency_ms: Date.now() - t0,
        success: false, error_category: errorCategory, ip,
      });
      return NextResponse.json({ error: `ElevenLabs ${upstream.status}: ${errBody}`, fallback: 'browser_tts' }, { status: upstream.status });
    }

    const audio = await upstream.arrayBuffer();
    success = true;

    const ttsLatencyMs = Date.now() - t0;

    // ── 9. Post-success: record usage + telemetry (non-blocking) ───────────────
    void recordTTSUsage(user.id, spokenText.length);
    void logTTSCall({
      user_id: user.id, interview_id: interview_id ?? undefined,
      tts_chars: spokenText.length, tts_model: 'eleven_turbo_v2_5',
      tts_voice_id: voiceId, latency_ms: ttsLatencyMs,
      success: true, ip,
    });

    // Structured stdout event for log aggregators (mirrors stt_token_issued pattern)
    console.log(JSON.stringify({
      ts:            new Date().toISOString(),
      event:         'tts_call_success',
      provider:      'elevenlabs',
      model:         'eleven_turbo_v2_5',
      latency_ms:    ttsLatencyMs,
      chars:         spokenText.length,
      plan_tier:     planTier,
      quota_warning: quota.warning,
    }));

    if (quota.warning === 'warning' || quota.warning === 'critical') {
      return new NextResponse(audio, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-TTS-Quota-Warning': quota.warning,
          'X-TTS-Quota-Remaining': String(quota.remaining_chars),
        },
      });
    }

    return new NextResponse(audio, { headers: { 'Content-Type': 'audio/mpeg' } });

  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    errorCategory = isTimeout ? 'timeout' : 'fetch_error';
    const ttsFailLatencyMs = Date.now() - t0;
    console.error('[TTS proxy] Fetch failed:', isTimeout ? 'timeout' : err);
    void logTTSCall({
      user_id: user.id, interview_id: interview_id ?? undefined,
      tts_chars: spokenText.length, tts_model: 'eleven_turbo_v2_5',
      latency_ms: ttsFailLatencyMs, success: false, error_category: errorCategory, ip,
    });
    console.log(JSON.stringify({
      ts:         new Date().toISOString(),
      event:      'tts_call_failure',
      provider:   'elevenlabs',
      model:      'eleven_turbo_v2_5',
      latency_ms: ttsFailLatencyMs,
      error_code: errorCategory,
      plan_tier:  planTier,
    }));
    return NextResponse.json(
      { error: isTimeout ? 'TTS timed out. Try text mode.' : 'TTS fetch failed.', fallback: 'browser_tts' },
      { status: 502 },
    );
  }

  void success; // used above
}

export const runtime = 'nodejs';
