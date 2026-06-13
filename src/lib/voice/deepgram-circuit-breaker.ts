/**
 * Client-side circuit breaker for Deepgram token + websocket storms.
 * Protects shared NAT / campus networks from aggressive reconnect loops.
 */

export interface DeepgramCircuitBreakerState {
  failureCount: number
  isOpen: boolean
  cooldownUntilMs: number | null
  lastFailureAt: number | null
  lastError: string | null
  tokenRequestCount: number
  lastTokenRequestAt: number | null
}

export interface DeepgramCircuitBreakerConfig {
  failureThreshold: number
  cooldownMs: number
  minTokenIntervalMs: number
}

const DEFAULT_CONFIG: DeepgramCircuitBreakerConfig = {
  failureThreshold: 5,
  cooldownMs: 60_000,
  minTokenIntervalMs: 2_000,
}

export class DeepgramCircuitBreaker {
  private state: DeepgramCircuitBreakerState = {
    failureCount: 0,
    isOpen: false,
    cooldownUntilMs: null,
    lastFailureAt: null,
    lastError: null,
    tokenRequestCount: 0,
    lastTokenRequestAt: null,
  }

  constructor(private readonly config: DeepgramCircuitBreakerConfig = DEFAULT_CONFIG) {}

  getState(): Readonly<DeepgramCircuitBreakerState> {
    this.refreshOpenState()
    return { ...this.state }
  }

  canRequestToken(now = Date.now()): { allowed: boolean; waitMs?: number; reason?: string } {
    this.refreshOpenState(now)
    if (this.state.isOpen) {
      const waitMs = Math.max(0, (this.state.cooldownUntilMs ?? now) - now)
      return { allowed: false, waitMs, reason: 'circuit_open' }
    }
    if (
      this.state.lastTokenRequestAt != null &&
      now - this.state.lastTokenRequestAt < this.config.minTokenIntervalMs
    ) {
      return {
        allowed: false,
        waitMs: this.config.minTokenIntervalMs - (now - this.state.lastTokenRequestAt),
        reason: 'token_throttled',
      }
    }
    return { allowed: true }
  }

  recordTokenRequest(now = Date.now()): void {
    this.state.tokenRequestCount += 1
    this.state.lastTokenRequestAt = now
  }

  recordSuccess(): void {
    this.state.failureCount = 0
    this.state.isOpen = false
    this.state.cooldownUntilMs = null
    this.state.lastError = null
  }

  recordFailure(error: string, now = Date.now()): void {
    this.state.failureCount += 1
    this.state.lastFailureAt = now
    this.state.lastError = error
    if (this.state.failureCount >= this.config.failureThreshold) {
      this.state.isOpen = true
      this.state.cooldownUntilMs = now + this.config.cooldownMs
    }
  }

  reset(): void {
    this.state = {
      failureCount: 0,
      isOpen: false,
      cooldownUntilMs: null,
      lastFailureAt: null,
      lastError: null,
      tokenRequestCount: 0,
      lastTokenRequestAt: null,
    }
  }

  private refreshOpenState(now = Date.now()): void {
    if (!this.state.isOpen) return
    if (this.state.cooldownUntilMs != null && now >= this.state.cooldownUntilMs) {
      this.state.isOpen = false
      this.state.cooldownUntilMs = null
      this.state.failureCount = 0
    }
  }
}

export function computeBackoffMs(attempt: number, baseMs = 1000, maxMs = 16_000): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt)
  const jitter = Math.floor(Math.random() * 400)
  return exp + jitter
}

export async function sleepMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}
