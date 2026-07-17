import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, buildRateLimitHttpResponse } from '@/lib/redis/rate-limit';
import { abuseGate, recordSTTTokenRequest } from '@/lib/abuse/risk-scorer';
import { checkSTTQuota } from '@/lib/quota/voice-quota';
import {
  createSessionLease,
  validateRefreshLease,
} from '@/lib/quota/stt-session-lease';
import { releaseSession } from '@/lib/quota/voice-quota';
import { recommendedSttRateLimits } from '@/lib/voice/stt-token-budget';

const STT_LIMITS = recommendedSttRateLimits();
const EPHEMERAL_TTL_SECONDS = STT_LIMITS.ephemeralTtlSeconds;

function extractIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

export async function POST(request: NextRequest) {
  const t0 = Date.now();
  const ip = extractIP(request);

  // ── 1. Parse body ────────────────────────────────────────────────────────
  let interviewId: string | undefined;
  let refreshLeaseId: string | undefined;
  try {
    const body = (await request.json()) as {
      interview_id?: string;
      refresh_lease_id?: string;
    };
    interviewId = body.interview_id?.trim();
    refreshLeaseId = body.refresh_lease_id?.trim();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!interviewId) {
    return NextResponse.json({ error: 'interview_id is required' }, { status: 400 });
  }

  // ── 2. Auth ───────────────────────────────────────────────────────────────
  const supabase = await createSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Local dev only — repeated interview restarts while debugging the voice pipeline
  // burn through these budgets fast. Skipping them outside production means no
  // manual re-enable step; every production request still goes through the checks.
  //
  // Budget evidence (see stt-token-budget.ts): without lease preservation a single
  // 4-question interview alone can mint ~7–10 keys (one per listening phase +
  // mid-answer refresh). The old 10/user/hr ceiling therefore 429'd legitimate
  // sessions. New mints and refreshes are budgeted separately; refreshes are
  // mandatory for long answers / inter-question reconnects, not abuse.
  const isDev = process.env.NODE_ENV !== 'production';
  const isRefreshRequest = Boolean(refreshLeaseId);

  if (!isDev) {
    // ── 3. Abuse gate ─────────────────────────────────────────────────────────
    const abuse = await abuseGate(user.id, ip);
    if (!abuse.allowed) {
      return NextResponse.json(
        { error: 'Request blocked. Please try again later.' },
        { status: 429, headers: abuse.block_ttl_s ? { 'Retry-After': String(abuse.block_ttl_s) } : {} },
      );
    }

    if (isRefreshRequest) {
      // ── 4a. Refresh budget — continuing an existing lease ───────────────────
      const refreshRL = await checkRateLimit(
        `stt:user:refresh:${user.id}`,
        3600,
        STT_LIMITS.refreshesPerUserPerHour,
        { failClosed: true },
      );
      const refreshBlocked = buildRateLimitHttpResponse(
        refreshRL,
        'Too many voice reconnects. Please wait and try again.',
      );
      if (refreshBlocked) {
        return NextResponse.json(refreshBlocked.body, {
          status: refreshBlocked.status,
          headers: refreshBlocked.headers,
        });
      }
    } else {
      // ── 4b. New-mint budgets — IP + user/hour + per-interview ───────────────
      const ipRL = await checkRateLimit(
        `stt:ip:${ip}`,
        3600,
        STT_LIMITS.newMintsPerIpPerHour,
        { failClosed: true },
      );
      const ipBlocked = buildRateLimitHttpResponse(
        ipRL,
        'Too many requests from this IP. Try again later.',
      );
      if (ipBlocked) {
        return NextResponse.json(ipBlocked.body, {
          status: ipBlocked.status,
          headers: ipBlocked.headers,
        });
      }

      const userRL = await checkRateLimit(
        `stt:user:${user.id}`,
        3600,
        STT_LIMITS.newMintsPerUserPerHour,
        { failClosed: true },
      );
      const userBlocked = buildRateLimitHttpResponse(
        userRL,
        'Too many recording sessions. Please wait and try again.',
      );
      if (userBlocked) {
        return NextResponse.json(userBlocked.body, {
          status: userBlocked.status,
          headers: userBlocked.headers,
        });
      }

      const interviewRL = await checkRateLimit(
        `stt:interview:${interviewId}`,
        3600,
        STT_LIMITS.newMintsPerInterview,
        { failClosed: true },
      );
      const interviewBlocked = buildRateLimitHttpResponse(
        interviewRL,
        'Too many voice sessions for this interview. Please type your answer or restart.',
      );
      if (interviewBlocked) {
        return NextResponse.json(interviewBlocked.body, {
          status: interviewBlocked.status,
          headers: interviewBlocked.headers,
        });
      }
    }
  }

  // ── 6. Resolve plan tier + session validation (parallel) ─────────────────
  const serviceClient = createServiceClient();
  const [{ data: userData }, { data: interview, error: dbError }] = await Promise.all([
    serviceClient.from('users').select('plan_tier').eq('id', user.id).maybeSingle(),
    serviceClient
      .from('interviews')
      .select('id, status')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const planTier = userData?.plan_tier ?? 'free';

  if (dbError) {
    console.error('[stt/token] DB error during session validation:', dbError.message);
    return NextResponse.json({ error: 'Session validation failed' }, { status: 500 });
  }

  if (!interview) {
    // Avoid enumeration: same 403 for wrong user and non-existent interview
    return NextResponse.json({ error: 'Interview session not found' }, { status: 403 });
  }

  if (interview.status !== 'in_progress') {
    return NextResponse.json(
      { error: 'STT is only available during an active interview session.' },
      { status: 403 },
    );
  }

  // ── 7. Monthly STT quota check ───────────────────────────────────────────
  const quota = await checkSTTQuota(user.id, planTier);
  if (!quota.allowed) {
    console.warn('[RATE-LIMIT]', JSON.stringify({
      event: 'deepgram_token_failure',
      reason: 'monthly_quota',
      interview_id: interviewId,
      user_id: user.id,
      duration_ms: Date.now() - t0,
      ts: new Date().toISOString(),
    }));
    return NextResponse.json(
      {
        error: 'Monthly voice recording quota exceeded. Text mode is still available.',
        quota: { used: quota.used_seconds, limit: quota.limit_seconds },
        fallback: 'text_mode',
      },
      { status: 429 },
    );
  }

  // ── 8. Concurrency / session lease ───────────────────────────────────────
  let sessionLeaseId: string;
  if (refreshLeaseId) {
    const valid = await validateRefreshLease(user.id, refreshLeaseId);
    if (!valid) {
      return NextResponse.json(
        { error: 'Voice session expired. Please start voice again.' },
        { status: 409 },
      );
    }
    sessionLeaseId = refreshLeaseId;
  } else {
    const lease = await createSessionLease(user.id, planTier);
    if (!lease.ok) {
      return NextResponse.json(
        {
          error: `You already have ${lease.active_sessions} active voice session(s). Please end the current session first.`,
          active_sessions: lease.active_sessions,
          max_sessions: lease.max_sessions,
        },
        { status: 429 },
      );
    }
    sessionLeaseId = lease.lease_id;
  }

  // ── 9. Require DEEPGRAM_PROJECT_ID — no master-key fallback ─────────────
  const masterKey = process.env.DEEPGRAM_API_KEY;
  const projectId = process.env.DEEPGRAM_PROJECT_ID;

  if (!masterKey || !projectId) {
    console.error('[stt/token] DEEPGRAM_API_KEY or DEEPGRAM_PROJECT_ID not configured');
    return NextResponse.json(
      { error: 'Voice recording is not configured on this server.' },
      { status: 503 },
    );
  }

  // ── 10. Record abuse signals (fire-and-forget) ────────────────────────────
  void recordSTTTokenRequest(user.id, ip);

  // ── 11. Create ephemeral Deepgram key (120 s TTL) ─────────────────────────
  let ephemeralKey: string;
  try {
    const res = await fetch(
      `https://api.deepgram.com/v1/projects/${projectId}/keys`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${masterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: `stt|uid:${user.id}|iid:${interviewId}|t:${Date.now()}`,
          scopes: ['usage:write'],
          time_to_live_in_seconds: EPHEMERAL_TTL_SECONDS,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      console.warn('[DEEPGRAM]', JSON.stringify({
        event: 'deepgram_token_failure',
        interview_id: interviewId,
        user_id: user.id,
        status: res.status,
        duration_ms: Date.now() - t0,
        error: body.slice(0, 500),
        hint: res.status === 401
          ? 'DEEPGRAM_API_KEY rejected by Deepgram — rotate key in console.deepgram.com and update .env.local'
          : undefined,
        ts: new Date().toISOString(),
      }));
      if (!refreshLeaseId) {
        await releaseSession(user.id);
      }
      return NextResponse.json(
        {
          error: res.status === 401 && process.env.NODE_ENV !== 'production'
            ? 'Deepgram rejected DEEPGRAM_API_KEY (401). Update the key in .env.local and restart npm run dev.'
            : 'Could not create voice session. Please try again.',
        },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { key?: string };
    if (!data.key) {
      console.error('[stt/token] Deepgram returned no key in response');
      if (!refreshLeaseId) {
        await releaseSession(user.id);
      }
      return NextResponse.json(
        { error: 'Voice session initialization failed.' },
        { status: 502 },
      );
    }
    ephemeralKey = data.key;
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    console.error('[stt/token] Deepgram API call failed:', isTimeout ? 'timeout' : err);
    if (!refreshLeaseId) {
      await releaseSession(user.id);
    }
    return NextResponse.json(
      { error: 'Voice service temporarily unavailable.' },
      { status: 502 },
    );
  }

  // ── 12. Structured telemetry log ──────────────────────────────────────────
  console.info('[DEEPGRAM]', JSON.stringify({
    event:             'deepgram_token_success',
    user_id:           user.id,
    interview_id:      interviewId,
    session_lease_id:  sessionLeaseId,
    refresh:           Boolean(refreshLeaseId),
    plan_tier:         planTier,
    expires_in_seconds: EPHEMERAL_TTL_SECONDS,
    quota_remaining_s: quota.remaining_seconds,
    quota_warning:     quota.warning,
    duration_ms:        Date.now() - t0,
    ip,
    user_agent:        request.headers.get('user-agent') ?? 'unknown',
    ts:                new Date().toISOString(),
  }));

  // ── 13. Return session-bound token ───────────────────────────────────────
  const response: Record<string, unknown> = {
    token:              ephemeralKey,
    expires_in_seconds: EPHEMERAL_TTL_SECONDS,
    interview_id:       interviewId,
    issued_at:          new Date().toISOString(),
    quota_remaining_s:  quota.remaining_seconds,
    session_lease_id:   sessionLeaseId,
  };

  if (quota.warning !== 'ok') {
    response.quota_warning = quota.warning;
  }

  return NextResponse.json(response);
}

export const runtime = 'nodejs';
