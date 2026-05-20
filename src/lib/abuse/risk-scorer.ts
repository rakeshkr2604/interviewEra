/**
 * AI abuse detection and risk scoring.
 *
 * Redis key schema:
 *   ab:score:{user_id}         → float string (0-100, TTL 24h)
 *   ab:rapid:{user_id}:60s     → integer (requests in last 60s window)
 *   ab:ip:{ip}:daily           → integer (sessions from this IP today)
 *   ab:auth_fail:{ip}:hourly   → integer (auth failures from this IP in last hour)
 *   ab:blocked:user:{user_id}  → "1" with TTL = block duration
 *   ab:blocked:ip:{ip}         → "1" with TTL = block duration
 *   ab:stt_long:{user_id}      → integer (STT sessions > 5 min in last 24h)
 *
 * Risk score buckets:
 *   0–29:   Normal
 *   30–59:  Elevated — log, watch
 *   60–79:  High — add friction (warn user)
 *   80–99:  Very high — temporary block
 *   100:    Block + flag for manual review
 */

import getRedis from '@/lib/redis/client';
import { createServiceClient } from '@/lib/supabase/server';

// ─── Thresholds ──────────────────────────────────────────────────────────────

const THRESHOLDS = {
  RAPID_REQUESTS_60S: 8,          // >8 STT token requests per 60s → suspicious
  IP_DAILY_SESSIONS: 30,          // >30 sessions from one IP in a day
  AUTH_FAILURES_HOURLY: 10,       // >10 auth failures from one IP in an hour
  LONG_STT_SESSIONS_24H: 5,       // >5 sessions over 5 min in 24h → bot-like
  RISK_WARN: 60,
  RISK_BLOCK: 80,
  BLOCK_DURATION_WARN_S:  5 * 60,   // 5 min cooldown at warn level
  BLOCK_DURATION_HIGH_S: 30 * 60,   // 30 min at high level
  BLOCK_DURATION_CRITICAL_S: 4 * 3600, // 4 hours at critical
} as const;

// ─── Block checks ─────────────────────────────────────────────────────────────

export interface BlockStatus {
  is_blocked: boolean;
  reason?: string;
  ttl_seconds?: number;
}

export async function isBlocked(userId: string, ip: string): Promise<BlockStatus> {
  try {
    const redis = getRedis();
    const [userBlock, ipBlock] = await Promise.all([
      redis.get(`ab:blocked:user:${userId}`),
      redis.get(`ab:blocked:ip:${ip}`),
    ]);

    if (userBlock) {
      const ttl = await redis.ttl(`ab:blocked:user:${userId}`);
      return { is_blocked: true, reason: String(userBlock), ttl_seconds: ttl };
    }
    if (ipBlock) {
      const ttl = await redis.ttl(`ab:blocked:ip:${ip}`);
      return { is_blocked: true, reason: `IP blocked: ${String(ipBlock)}`, ttl_seconds: ttl };
    }
    return { is_blocked: false };
  } catch {
    return { is_blocked: false }; // fail open
  }
}

// ─── Event recording ─────────────────────────────────────────────────────────

export async function recordSTTTokenRequest(userId: string, ip: string): Promise<void> {
  try {
    const redis = getRedis();
    const today = new Date().toISOString().slice(0, 10);
    const pipeline = redis.pipeline();
    // Rapid-fire detection: 60s tumbling window
    pipeline.incr(`ab:rapid:${userId}:60s`);
    pipeline.expire(`ab:rapid:${userId}:60s`, 60);
    // IP daily session count
    pipeline.incr(`ab:ip:${ip}:daily:${today}`);
    pipeline.expire(`ab:ip:${ip}:daily:${today}`, 86_400 + 3_600);
    await pipeline.exec();
  } catch (err) {
    console.error('[risk-scorer] recordSTTTokenRequest failed:', err);
  }
}

export async function recordAuthFailure(ip: string): Promise<void> {
  try {
    const redis = getRedis();
    const slot = Math.floor(Date.now() / 3_600_000); // hourly slot
    const key = `ab:auth_fail:${ip}:${slot}`;
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 7_200); // 2h TTL
    await pipeline.exec();
  } catch (err) {
    console.error('[risk-scorer] recordAuthFailure failed:', err);
  }
}

export async function recordLongSTTSession(userId: string): Promise<void> {
  try {
    const redis = getRedis();
    const key = `ab:stt_long:${userId}`;
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 86_400);
    await pipeline.exec();
  } catch (err) {
    console.error('[risk-scorer] recordLongSTTSession failed:', err);
  }
}

// ─── Score computation ────────────────────────────────────────────────────────

export interface RiskScoreResult {
  score: number;            // 0-100
  flags: string[];          // human-readable flag list
  action: 'allow' | 'warn' | 'block';
  block_duration_s?: number;
}

export async function computeRiskScore(
  userId: string,
  ip: string,
): Promise<RiskScoreResult> {
  let score = 0;
  const flags: string[] = [];

  try {
    const redis = getRedis();
    const today = new Date().toISOString().slice(0, 10);
    const slot  = Math.floor(Date.now() / 3_600_000);

    const [rapid, ipDaily, authFail, longSessions] = await Promise.all([
      redis.get(`ab:rapid:${userId}:60s`),
      redis.get(`ab:ip:${ip}:daily:${today}`),
      redis.get(`ab:auth_fail:${ip}:${slot}`),
      redis.get(`ab:stt_long:${userId}`),
    ]);

    const rapidCount    = Number(rapid ?? 0);
    const ipDailyCount  = Number(ipDaily ?? 0);
    const authFailCount = Number(authFail ?? 0);
    const longCount     = Number(longSessions ?? 0);

    if (rapidCount > THRESHOLDS.RAPID_REQUESTS_60S) {
      const excess = rapidCount - THRESHOLDS.RAPID_REQUESTS_60S;
      score += Math.min(40, excess * 8);
      flags.push(`rapid_requests:${rapidCount}/60s`);
    }

    if (ipDailyCount > THRESHOLDS.IP_DAILY_SESSIONS) {
      const excess = ipDailyCount - THRESHOLDS.IP_DAILY_SESSIONS;
      score += Math.min(30, excess * 2);
      flags.push(`ip_session_burst:${ipDailyCount}/day`);
    }

    if (authFailCount > THRESHOLDS.AUTH_FAILURES_HOURLY) {
      score += Math.min(20, (authFailCount - THRESHOLDS.AUTH_FAILURES_HOURLY) * 3);
      flags.push(`auth_failures:${authFailCount}/hour`);
    }

    if (longCount > THRESHOLDS.LONG_STT_SESSIONS_24H) {
      score += Math.min(20, (longCount - THRESHOLDS.LONG_STT_SESSIONS_24H) * 5);
      flags.push(`excessive_long_stt:${longCount}/24h`);
    }

    score = Math.min(100, score);

    // Persist score with 24h TTL
    void redis.set(`ab:score:${userId}`, score.toString(), { ex: 86_400 });

  } catch {
    // Redis down: neutral score, allow
    return { score: 0, flags: [], action: 'allow' };
  }

  let action: RiskScoreResult['action'] = 'allow';
  let block_duration_s: number | undefined;

  if (score >= THRESHOLDS.RISK_BLOCK) {
    action = 'block';
    block_duration_s = score >= 90
      ? THRESHOLDS.BLOCK_DURATION_CRITICAL_S
      : THRESHOLDS.BLOCK_DURATION_HIGH_S;
  } else if (score >= THRESHOLDS.RISK_WARN) {
    action = 'warn';
    block_duration_s = THRESHOLDS.BLOCK_DURATION_WARN_S;
  }

  return { score, flags, action, block_duration_s };
}

// ─── Block application ────────────────────────────────────────────────────────

export async function applyBlock(
  userId: string,
  ip: string,
  durationSeconds: number,
  reason: string,
): Promise<void> {
  try {
    const redis = getRedis();
    await Promise.all([
      redis.set(`ab:blocked:user:${userId}`, reason, { ex: durationSeconds }),
      redis.set(`ab:blocked:ip:${ip}`, reason, { ex: durationSeconds }),
    ]);

    // Persist to DB for admin audit trail (fire and forget)
    void persistAbuseEvent(userId, ip, 'block', reason, durationSeconds);
  } catch (err) {
    console.error('[risk-scorer] applyBlock failed:', err);
  }
}

async function persistAbuseEvent(
  userId: string,
  ip: string,
  eventType: string,
  reason: string,
  blockDurationS?: number,
): Promise<void> {
  try {
    const serviceClient = createServiceClient();
    await serviceClient.from('abuse_detection_logs').insert({
      user_id:          userId,
      ip,
      event_type:       eventType,
      details:          { reason },
      action_taken:     blockDurationS ? 'blocked' : 'logged',
      block_duration_s: blockDurationS ?? null,
    });
  } catch (err) {
    console.error('[risk-scorer] persistAbuseEvent failed:', err);
  }
}

// ─── Convenience: full gate check ────────────────────────────────────────────

export interface AbuseGateResult {
  allowed: boolean;
  risk_score: number;
  block_ttl_s?: number;
  reason?: string;
}

/**
 * Single call that checks blocks + computes risk score + applies block if needed.
 * Use in any sensitive endpoint (STT token, TTS proxy, interview start).
 */
export async function abuseGate(
  userId: string,
  ip: string,
): Promise<AbuseGateResult> {
  // 1. Check existing block
  const blockStatus = await isBlocked(userId, ip);
  if (blockStatus.is_blocked) {
    return {
      allowed: false,
      risk_score: 100,
      block_ttl_s: blockStatus.ttl_seconds,
      reason: blockStatus.reason,
    };
  }

  // 2. Compute current risk score
  const risk = await computeRiskScore(userId, ip);

  // 3. Apply block if warranted
  if (risk.action === 'block' && risk.block_duration_s) {
    const reason = `Risk score ${risk.score}: ${risk.flags.join(', ')}`;
    await applyBlock(userId, ip, risk.block_duration_s, reason);
    return {
      allowed: false,
      risk_score: risk.score,
      block_ttl_s: risk.block_duration_s,
      reason,
    };
  }

  return { allowed: true, risk_score: risk.score };
}
