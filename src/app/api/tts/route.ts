import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkTTSQuota, recordTTSUsage, enforcePerInterviewTTSLimit } from '@/lib/quota/voice-quota';
import { logTTSCall } from '@/lib/telemetry/voice-logger';
import { abuseGate } from '@/lib/abuse/risk-scorer';
import {
  resolveElevenLabsModelId,
  resolveElevenLabsVoiceId,
} from '@/lib/voice/elevenlabs-voices';
import { resolveElevenLabsApiKey } from '@/lib/voice/elevenlabs-health-shared';

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
  // Softer, professional interviewer delivery — higher stability, lower expressiveness.
  switch (tone) {
    case 'encouraging':
      return { stability: 0.62, similarity_boost: 0.78, style: isQuestion ? 0.22 : 0.28, use_speaker_boost: true };
    case 'challenging':
      return { stability: 0.58, similarity_boost: 0.76, style: isQuestion ? 0.26 : 0.32, use_speaker_boost: true };
    default:
      return { stability: 0.65, similarity_boost: 0.8, style: isQuestion ? 0.2 : 0.24, use_speaker_boost: true };
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
    return NextResponse.json(
      { error: 'Unauthorized', fallback: 'browser_tts' },
      { status: 401 },
    );
  }

  // ── 2. Abuse gate ────────────────────────────────────────────────────────────
  const abuse = await abuseGate(user.id, ip);
  if (!abuse.allowed) {
    return NextResponse.json(
      {
        error: 'Request blocked. Please try again later.',
        fallback: 'browser_tts',
      },
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

  const apiKey = resolveElevenLabsApiKey();
  if (!apiKey) {
    console.error('[TTS proxy] ELEVENLABS_API_KEY not configured');
    return NextResponse.json(
      { error: 'TTS not configured', fallback: 'browser_tts' },
      { status: 503 },
    );
  }

  const voiceId       = resolveElevenLabsVoiceId(voice ?? 'priya');
  const ttsModelId    = resolveElevenLabsModelId();
  const spokenText    = enhanceTextForSpeech(finalText);
  const voiceSettings = toneToVoiceSettings(tone ?? 'neutral', spokenText);

  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    event: 'tts_voice_resolved',
    voice_key: voice ?? 'priya',
    voice_id: voiceId,
    model_id: ttsModelId,
  }));

  // ── 8. ElevenLabs call (streaming endpoint) ───────────────────────────────────
  let errorCategory: string | undefined;

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          Accept:           'audio/mpeg',
          'Content-Type':   'application/json',
          'xi-api-key':     apiKey,
        },
        body: JSON.stringify({
          text:           spokenText,
          model_id:       ttsModelId,
          voice_settings: voiceSettings,
          output_format:  'mp3_44100_128',
        }),
        signal: AbortSignal.timeout(12_000), // 12s hard timeout (covers full stream drain)
      },
    );

    // Time-to-first-byte from ElevenLabs — the metric that actually matters now
    // that we forward the stream instead of buffering the full response.
    const ttfbMs = Date.now() - t0;

    if (!upstream.ok) {
      const errBody = await upstream.text().catch(() => upstream.statusText);
      console.error('[TTS proxy] ElevenLabs error:', upstream.status, errBody);
      errorCategory = 'http_error';
      void logTTSCall({
        user_id: user.id, interview_id: interview_id ?? undefined,
        tts_chars: spokenText.length, tts_model: ttsModelId,
        tts_voice_id: voiceId, latency_ms: ttfbMs,
        success: false, error_category: errorCategory, ip,
      });
      return NextResponse.json({ error: `ElevenLabs ${upstream.status}: ${errBody}`, fallback: 'browser_tts' }, { status: upstream.status });
    }

    // ── 9. Post-success: record usage + telemetry (non-blocking) ───────────────
    void recordTTSUsage(user.id, spokenText.length);
    void logTTSCall({
      user_id: user.id, interview_id: interview_id ?? undefined,
      tts_chars: spokenText.length, tts_model: ttsModelId,
      tts_voice_id: voiceId, latency_ms: ttfbMs,
      success: true, ip,
    });

    // Structured stdout event for log aggregators (mirrors stt_token_issued pattern)
    console.log(JSON.stringify({
      ts:            new Date().toISOString(),
      event:         'tts_call_success',
      provider:      'elevenlabs',
      model:         ttsModelId,
      latency_ms:    ttfbMs,
      chars:         spokenText.length,
      plan_tier:     planTier,
      quota_warning: quota.warning,
      streamed:      Boolean(upstream.body),
    }));

    const responseHeaders: Record<string, string> = { 'Content-Type': 'audio/mpeg' };
    if (quota.warning === 'warning' || quota.warning === 'critical') {
      responseHeaders['X-TTS-Quota-Warning'] = quota.warning;
      responseHeaders['X-TTS-Quota-Remaining'] = String(quota.remaining_chars);
    }

    // Forward the upstream stream body directly — no server-side buffering, so
    // the client can start decoding/playing before generation finishes. Falls
    // back to a buffered response only if the runtime doesn't expose a body
    // stream (defensive; not expected under `runtime = 'nodejs'`).
    if (!upstream.body) {
      const audio = await upstream.arrayBuffer();
      return new NextResponse(audio, { headers: responseHeaders });
    }

    return new NextResponse(upstream.body, { headers: responseHeaders });

  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    errorCategory = isTimeout ? 'timeout' : 'fetch_error';
    const ttsFailLatencyMs = Date.now() - t0;
    console.error('[TTS proxy] Fetch failed:', isTimeout ? 'timeout' : err);
    void logTTSCall({
      user_id: user.id, interview_id: interview_id ?? undefined,
      tts_chars: spokenText.length, tts_model: ttsModelId,
      latency_ms: ttsFailLatencyMs, success: false, error_category: errorCategory, ip,
    });
    console.log(JSON.stringify({
      ts:         new Date().toISOString(),
      event:      'tts_call_failure',
      provider:   'elevenlabs',
      model:      ttsModelId,
      latency_ms: ttsFailLatencyMs,
      error_code: errorCategory,
      plan_tier:  planTier,
    }));
    return NextResponse.json(
      { error: isTimeout ? 'TTS timed out. Try text mode.' : 'TTS fetch failed.', fallback: 'browser_tts' },
      { status: 502 },
    );
  }
}

export const runtime = 'nodejs';
