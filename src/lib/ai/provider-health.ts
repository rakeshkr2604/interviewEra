/**
 * In-memory per-model circuit breaker for the AI completion stack.
 *
 * State is warm-instance-scoped (reset on cold start), which is intentional —
 * providers recover fast and a cold start is an automatic half-open probe.
 *
 * Key behaviours:
 * - 400/401/403 → deterministic failure → trip circuit immediately (no threshold)
 * - 429/5xx     → transient → trip after THRESHOLD consecutive failures
 * - Circuit auto-resets after RESET_MS (half-open: one probe attempt allowed)
 */

const FAILURE_THRESHOLD = 4;   // transient failures before circuit opens
const CIRCUIT_RESET_MS = 60_000; // 1 min cooldown before half-open probe

/** HTTP codes that indicate a permanent per-model problem (model gone, bad key, access denied). */
const HARD_FAIL_CODES = new Set([400, 401, 403]);

interface ModelHealth {
  failures: number;
  openedAt: number | null;
  lastCode: number | null;
}

const _health = new Map<string, ModelHealth>();

function ensure(key: string): ModelHealth {
  let h = _health.get(key);
  if (!h) { h = { failures: 0, openedAt: null, lastCode: null }; _health.set(key, h); }
  return h;
}

export function isModelHealthy(providerModel: string): boolean {
  const h = ensure(providerModel);
  if (h.openedAt === null) return true;
  if (Date.now() - h.openedAt >= CIRCUIT_RESET_MS) {
    // Auto-reset: allow one probe
    h.openedAt = null;
    h.failures = 0;
    return true;
  }
  return false;
}

export function recordModelSuccess(providerModel: string): void {
  const h = ensure(providerModel);
  h.failures = 0;
  h.openedAt = null;
  h.lastCode = null;
}

export function recordModelFailure(providerModel: string, statusCode?: number): void {
  const h = ensure(providerModel);
  h.lastCode = statusCode ?? null;

  if (statusCode && HARD_FAIL_CODES.has(statusCode)) {
    // Deterministic failure — trip immediately, skip threshold counting
    h.openedAt ??= Date.now();
    h.failures = FAILURE_THRESHOLD;
    console.warn(
      `[provider-health] "${providerModel}" tripped (hard-fail HTTP ${statusCode}) — skipping for ${CIRCUIT_RESET_MS / 1000}s`,
    );
    return;
  }

  h.failures++;
  if (h.failures >= FAILURE_THRESHOLD && h.openedAt === null) {
    h.openedAt = Date.now();
    console.warn(
      `[provider-health] "${providerModel}" tripped after ${h.failures} failures — skipping for ${CIRCUIT_RESET_MS / 1000}s`,
    );
  }
}

/** Diagnostic snapshot — used by health-check endpoints or debug logging. */
export function providerHealthSnapshot(): Record<string, { healthy: boolean; failures: number; lastCode: number | null }> {
  const out: Record<string, { healthy: boolean; failures: number; lastCode: number | null }> = {};
  for (const [key, h] of _health) {
    out[key] = { healthy: isModelHealthy(key), failures: h.failures, lastCode: h.lastCode };
  }
  return out;
}
