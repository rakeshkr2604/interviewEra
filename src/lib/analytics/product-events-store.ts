/**
 * Durable product-event persistence — best-effort, non-blocking.
 * Uses service-role Supabase client directly (no next/headers dependency).
 * Persistence is scheduled via Next.js `after()` so inserts survive the
 * serverless response lifecycle (raw fire-and-forget fetch aborts on Vercel).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ProductEventName } from '@/lib/analytics/product-events';
import { scheduleServerlessBackgroundWork } from '@/lib/analytics/schedule-serverless-background-work';
import { isPlaceholderValue } from '@/lib/redis/client';

const MAX_PROP_KEYS = 32;
const MAX_STRING_LEN = 500;
const DIAGNOSTIC_MSG_MAX_LEN = 160;
function isProductEventTraceEnabled(): boolean {
  return process.env.IE_DIAGNOSTICS_PRODUCT_EVENT_TRACE === '1';
}

export function isSupabasePlaceholderCredential(url?: string, key?: string): boolean {
  if (!url || !key) return true;
  if (isPlaceholderValue(url) || isPlaceholderValue(key)) return true;

  try {
    const parts = key.trim().split('.');
    if (parts.length === 3) {
      let b64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) {
        b64 += '=';
      }
      const payloadJson = Buffer.from(b64, 'base64').toString('utf-8');
      const payload = JSON.parse(payloadJson) as Record<string, unknown>;

      if (payload.iss === 'supabase-demo') {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

let cachedServiceClient: SupabaseClient | null | undefined;

export function resetProductEventServiceClientCacheForTests(): void {
  cachedServiceClient = undefined;
}

export function getServiceClient(): SupabaseClient | null {
  if (cachedServiceClient !== undefined) {
    return cachedServiceClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key || isSupabasePlaceholderCredential(url, key)) {
    cachedServiceClient = null;
    return null;
  }

  cachedServiceClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return cachedServiceClient;
}

function sanitizeProps(
  props: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  let count = 0;
  for (const [key, value] of Object.entries(props)) {
    if (count >= MAX_PROP_KEYS) break;
    if (value === undefined) continue;
    if (typeof value === 'string') {
      out[key] = value.slice(0, MAX_STRING_LEN);
    } else {
      out[key] = value;
    }
    count += 1;
  }
  return out;
}

function formatErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    const message = typeof obj.message === 'string' && obj.message.length > 0 ? obj.message : '';
    const cause =
      obj.cause && typeof obj.cause === 'object' && obj.cause !== null
        ? (obj.cause as Record<string, unknown>)
        : null;
    const causeCode = typeof cause?.code === 'string' ? cause.code : null;
    const causeMessage =
      typeof cause?.message === 'string' && cause.message.length > 0 ? cause.message : null;

    if (message && causeCode && !message.includes(causeCode)) {
      return `${message} (${causeCode})`;
    }
    if (message && causeMessage && message === 'fetch failed' && causeMessage !== message) {
      return `${message}: ${causeMessage}`;
    }
    if (message) return message;
  }
  if (typeof err === 'string' && err.length > 0) {
    return err;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

function formatPersistFailureLog(error: unknown): string {
  const msg = formatErrorMessage(error);
  const failure = classifyPersistFailure(error);
  if (msg !== 'fetch failed' && msg !== 'TypeError: fetch failed') {
    return msg;
  }
  const parts = [msg];
  if (failure.causeCode) parts.push(`cause=${failure.causeCode}`);
  if (failure.category !== 'unknown') parts.push(`category=${failure.category}`);
  return parts.join(' ');
}

type PersistFailureCategory =
  | 'dns_failure'
  | 'connection_failure'
  | 'timeout'
  | 'tls_failure'
  | 'http_response_failure'
  | 'supabase_client_failure'
  | 'runtime_platform_failure'
  | 'unknown';

function stringCode(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function numberStatus(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sanitizeDiagnosticMessage(err: unknown): string {
  const msg = formatErrorMessage(err).replace(/[\r\n\t]/g, ' ').trim();
  if (!msg) return '';
  return msg.length > DIAGNOSTIC_MSG_MAX_LEN ? `${msg.slice(0, DIAGNOSTIC_MSG_MAX_LEN)}...` : msg;
}

const DNS_ERROR_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN']);
const CONNECTION_ERROR_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', 'UND_ERR_SOCKET']);
const TIMEOUT_ERROR_CODES = new Set(['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'ABORT_ERR']);
const TLS_ERROR_CODES = new Set(['ERR_SSL_PROTOCOL_ERROR', 'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT']);

function isSupabaseErrorCode(code: string | null): boolean {
  if (!code) return false;
  return (
    code === 'PGRST301' ||
    code === '42501' ||
    code === '42P01' ||
    code === '401' ||
    code === '403' ||
    code.startsWith('PGRST')
  );
}

export function classifyPersistFailure(error: unknown): {
  category: PersistFailureCategory;
  code: string | null;
  status: number | null;
  causeCode: string | null;
  name: string | null;
} {
  const errObj = (typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : null);
  const cause =
    errObj && typeof errObj.cause === 'object' && errObj.cause !== null
      ? (errObj.cause as Record<string, unknown>)
      : null;

  const code = stringCode(errObj?.code);
  const causeCode = stringCode(cause?.code);
  const status = numberStatus(errObj?.status);
  const name = typeof errObj?.name === 'string' ? errObj.name : null;

  if (status !== null && status >= 400) return { category: 'http_response_failure', code, status, causeCode, name };
  if (DNS_ERROR_CODES.has(code ?? '') || DNS_ERROR_CODES.has(causeCode ?? '')) {
    return { category: 'dns_failure', code, status, causeCode, name };
  }
  if (CONNECTION_ERROR_CODES.has(code ?? '') || CONNECTION_ERROR_CODES.has(causeCode ?? '')) {
    return { category: 'connection_failure', code, status, causeCode, name };
  }
  if (TIMEOUT_ERROR_CODES.has(code ?? '') || TIMEOUT_ERROR_CODES.has(causeCode ?? '')) {
    return { category: 'timeout', code, status, causeCode, name };
  }
  if (TLS_ERROR_CODES.has(code ?? '') || TLS_ERROR_CODES.has(causeCode ?? '')) {
    return { category: 'tls_failure', code, status, causeCode, name };
  }
  if (isSupabaseErrorCode(code) || isSupabaseErrorCode(causeCode)) {
    return { category: 'supabase_client_failure', code, status, causeCode, name };
  }
  return { category: 'unknown', code, status, causeCode, name };
}

export function isNonRetryableError(error: unknown): boolean {
  if (!error) return false;

  let message = '';
  let code = '';
  let status: number | undefined = undefined;

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.message === 'string') message = errObj.message;
    if (typeof errObj.code === 'string') code = errObj.code;
    if (typeof errObj.status === 'number') status = errObj.status;
    if (typeof errObj.code === 'number') {
      const parsed = Number(errObj.code);
      if (!Number.isNaN(parsed)) status = parsed;
    }
  } else if (typeof error === 'string') {
    message = error;
  }

  if (status === 401 || status === 403) return true;

  if (code === '42501' || code === '42P01' || code === 'PGRST301' || code === '401' || code === '403') {
    return true;
  }

  const lowerMsg = message.toLowerCase();
  if (
    lowerMsg.includes('invalid api key') ||
    lowerMsg.includes('invalid credentials') ||
    lowerMsg.includes('invalid claim') ||
    lowerMsg.includes('jwt expired') ||
    lowerMsg.includes('invalid jwt') ||
    lowerMsg.includes('jwt claim') ||
    lowerMsg.includes('unauthorized') ||
    lowerMsg.includes('permission denied') ||
    lowerMsg.includes('authentication failed') ||
    lowerMsg.includes('authentication failure')
  ) {
    return true;
  }

  return false;
}

async function persistProductEventWork(
  eventName: ProductEventName,
  userId: string | null,
  cleanProps: Record<string, string | number | boolean>,
  traceContext: {
    diagnosticEnabled: boolean;
    requestId: string | null;
    traceId: string | null;
    startedAt: number;
  },
): Promise<void> {
  const svc = getServiceClient();
  if (!svc) return;

  const { diagnosticEnabled, requestId, traceId, startedAt } = traceContext;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { error } = await svc.from('product_events').insert({
        event_name: eventName,
        user_id: userId,
        props: cleanProps,
      });
      if (!error) return;

      const msg = formatPersistFailureLog(error);
      const failure = classifyPersistFailure(error);
      if (diagnosticEnabled) {
        console.warn(
          '[product-events-store][diagnostic]',
          JSON.stringify({
            trace_id: traceId,
            request_id: requestId,
            event_name: eventName,
            attempt: attempt + 1,
            elapsed_ms: Date.now() - startedAt,
            category: failure.category,
            code: failure.code,
            status: failure.status,
            cause_code: failure.causeCode,
            error_name: failure.name,
            message: sanitizeDiagnosticMessage(error),
          }),
        );
      }
      if (isNonRetryableError(error)) {
        console.warn('[product-events-store] insert failed:', msg);
        return;
      }

      if (attempt === 0) {
        console.warn('[product-events-store] insert failed (will retry):', msg);
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        console.warn('[product-events-store] insert failed after retry:', msg);
      }
    } catch (err) {
      const msg = formatPersistFailureLog(err);
      const failure = classifyPersistFailure(err);
      if (diagnosticEnabled) {
        console.warn(
          '[product-events-store][diagnostic]',
          JSON.stringify({
            trace_id: traceId,
            request_id: requestId,
            event_name: eventName,
            attempt: attempt + 1,
            elapsed_ms: Date.now() - startedAt,
            category: failure.category,
            code: failure.code,
            status: failure.status,
            cause_code: failure.causeCode,
            error_name: failure.name,
            message: sanitizeDiagnosticMessage(err),
          }),
        );
      }
      if (isNonRetryableError(err)) {
        console.warn('[product-events-store] persist error:', msg);
        return;
      }

      if (attempt === 0) {
        console.warn('[product-events-store] persist error (will retry):', msg);
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        console.warn('[product-events-store] persist error after retry:', msg);
      }
    }
  }
}

/** Fire-and-forget insert; never throws to callers. */
export function persistProductEventAsync(
  eventName: ProductEventName,
  props: Record<string, string | number | boolean | undefined> = {},
): void {
  const userId =
    typeof props.user_id === 'string'
      ? props.user_id
      : typeof props.userId === 'string'
        ? props.userId
        : null;

  const { user_id: _uid, userId: _legacy, event_name: _en, event: _e, ...rest } = props;
  const cleanProps = sanitizeProps(rest);
  const diagnosticEnabled = isProductEventTraceEnabled();
  const requestId = diagnosticEnabled
    ? (typeof props.request_id === 'string'
        ? props.request_id
        : typeof props.requestId === 'string'
          ? props.requestId
          : null)
    : null;
  const traceId = diagnosticEnabled ? (requestId ?? `pe-${Math.random().toString(36).slice(2, 10)}`) : null;
  const startedAt = diagnosticEnabled ? Date.now() : 0;

  scheduleServerlessBackgroundWork(() =>
    persistProductEventWork(eventName, userId, cleanProps, {
      diagnosticEnabled,
      requestId,
      traceId,
      startedAt,
    }),
  );
}
