/**
 * Signed HMAC-SHA256 interview session tokens.
 *
 * Replaces the raw interview_id validation in /api/stt/token with a
 * cryptographically signed token that cannot be forged or replayed.
 *
 * Token structure (base64url-encoded JSON):
 *   header.payload.signature
 *
 * Payload:
 *   sub   — user_id
 *   iid   — interview_id
 *   sid   — random session UUID (for replay protection)
 *   tier  — plan_tier at issuance
 *   iat   — issued_at (epoch seconds)
 *   exp   — expiry (epoch seconds)
 *   ops   — allowed operations array e.g. ['stt', 'tts']
 *
 * Replay protection:
 *   Used token JTIs (sid values) are stored in Redis with TTL = token expiry.
 *   A token can only be used once per operation type.
 *
 * Required env var: SESSION_SIGNING_SECRET (min 32 chars)
 * Generate with: openssl rand -hex 32
 */

import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import getRedis from '@/lib/redis/client';

export type AllowedOperation = 'stt' | 'tts' | 'voice';

export interface SessionTokenPayload {
  sub:  string;               // user_id
  iid:  string;               // interview_id
  sid:  string;               // session ID (jti — for replay protection)
  tier: string;               // plan_tier
  iat:  number;               // issued_at (epoch seconds)
  exp:  number;               // expiry (epoch seconds)
  ops:  AllowedOperation[];   // allowed operations
}

// Token validity window — short enough to limit replay exposure
const DEFAULT_TTL_SECONDS = 15 * 60; // 15 minutes

function getSigningSecret(): Buffer {
  const secret = process.env.SESSION_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('[session-token] SESSION_SIGNING_SECRET missing or too short (min 32 chars)');
  }
  return Buffer.from(secret, 'utf-8');
}

function b64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function fromB64url(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

function sign(data: string, secret: Buffer): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

// ─── Issue ────────────────────────────────────────────────────────────────────

export interface IssueTokenOptions {
  userId: string;
  interviewId: string;
  planTier: string;
  ops?: AllowedOperation[];
  ttlSeconds?: number;
}

export function issueSessionToken(opts: IssueTokenOptions): string {
  const secret = getSigningSecret();
  const now = Math.floor(Date.now() / 1000);

  const payload: SessionTokenPayload = {
    sub:  opts.userId,
    iid:  opts.interviewId,
    sid:  randomUUID(),
    tier: opts.planTier,
    iat:  now,
    exp:  now + (opts.ttlSeconds ?? DEFAULT_TTL_SECONDS),
    ops:  opts.ops ?? ['stt', 'tts'],
  };

  const header  = b64url(JSON.stringify({ alg: 'HS256', typ: 'IST' }));
  const body    = b64url(JSON.stringify(payload));
  const sig     = sign(`${header}.${body}`, secret);

  return `${header}.${body}.${sig}`;
}

// ─── Verify ───────────────────────────────────────────────────────────────────

export type VerifyResult =
  | { ok: true;  payload: SessionTokenPayload }
  | { ok: false; reason: 'invalid_format' | 'invalid_signature' | 'expired' | 'invalid_payload' };

export function verifySessionToken(token: string): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'invalid_format' };

  const [header, body, receivedSig] = parts;
  const secret = getSigningSecret();
  const expectedSig = sign(`${header}.${body}`, secret);

  // Timing-safe comparison to prevent timing attacks
  const expected = Buffer.from(expectedSig, 'base64url');
  const received = Buffer.from(receivedSig, 'base64url');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { ok: false, reason: 'invalid_signature' };
  }

  let payload: SessionTokenPayload;
  try {
    payload = JSON.parse(fromB64url(body)) as SessionTokenPayload;
  } catch {
    return { ok: false, reason: 'invalid_payload' };
  }

  if (!payload.sub || !payload.iid || !payload.sid || !payload.exp) {
    return { ok: false, reason: 'invalid_payload' };
  }

  if (Math.floor(Date.now() / 1000) > payload.exp) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, payload };
}

// ─── Replay protection ────────────────────────────────────────────────────────

/**
 * Marks a session ID as used for a specific operation.
 * Returns false if it was already used (replay detected).
 * One token can be used once per operation type.
 */
export async function consumeSessionToken(
  sid: string,
  operation: AllowedOperation,
  expSeconds: number,
): Promise<boolean> {
  const key = `st:used:${sid}:${operation}`;
  const ttl = Math.max(0, expSeconds - Math.floor(Date.now() / 1000));

  try {
    const redis = getRedis();
    // SET NX (only if not exists) — atomic "use once" operation
    const result = await redis.set(key, '1', { nx: true, ex: ttl });
    return result === 'OK'; // null means key already existed → replay
  } catch {
    return true; // Redis down: fail open to avoid blocking legitimate requests
  }
}

// ─── Convenience: verify + consume in one call ────────────────────────────────

export interface ConsumeResult {
  ok: boolean;
  payload?: SessionTokenPayload;
  reason?: string;
}

export async function verifyAndConsumeToken(
  token: string,
  requiredOperation: AllowedOperation,
): Promise<ConsumeResult> {
  const verified = verifySessionToken(token);
  if (!verified.ok) {
    return { ok: false, reason: verified.reason };
  }

  const { payload } = verified;

  if (!payload.ops.includes(requiredOperation)) {
    return { ok: false, reason: 'operation_not_permitted' };
  }

  const consumed = await consumeSessionToken(payload.sid, requiredOperation, payload.exp);
  if (!consumed) {
    return { ok: false, reason: 'token_replayed' };
  }

  return { ok: true, payload };
}
