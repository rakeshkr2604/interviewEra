// Thin fetch wrapper used by onboarding and interview flows.
//
// NETWORK HARDENING (audit P0 "api.fetch no timeout — submit hangs forever"):
// every request is bounded by an AbortController deadline so a dead mobile
// connection can never leave a request hanging indefinitely. GETs (reads) use a
// 30s budget; POSTs (LLM evaluation / report generation) use a 60s budget to
// match the server `maxDuration` ceilings. On timeout we throw a typed
// {@link ApiTimeoutError} and emit an INTERVIEW_FLOW telemetry event so hung
// requests are visible in production rather than silent.
//
// T defaults to ApiResponse which covers all known endpoint shapes.

import { interviewTelemetry } from '@/lib/telemetry/interview-telemetry'

interface ApiResponse extends Record<string, unknown> {
  resumeText?: string
  skills?: string[]
  projects?: string[]
  role?: string
  experience?: string
  interviewId?: string
  feedback?: string
}

/** Default request budgets. Reads are short; writes match server maxDuration. */
export const GET_TIMEOUT_MS = 30_000
export const POST_TIMEOUT_MS = 60_000

/**
 * Thrown when a request exceeds its AbortController deadline. Callers can
 * `instanceof`-check this to distinguish a timeout (retry-worthy) from a
 * genuine HTTP error (often not).
 */
export class ApiTimeoutError extends Error {
  readonly url: string
  readonly method: string
  readonly timeoutMs: number
  constructor(url: string, method: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`)
    this.name = 'ApiTimeoutError'
    this.url = url
    this.method = method
    this.timeoutMs = timeoutMs
  }
}

/** Telemetry context is unknown at the network layer — emit with placeholders. */
function logTimeout(url: string, method: string, timeoutMs: number): void {
  try {
    interviewTelemetry(
      'INTERVIEW_FLOW',
      'request_timeout',
      { interviewId: 'n/a', questionIndex: -1, phase: 'network' },
      { url, method, timeoutMs },
      { critical: true, level: 'error' },
    )
  } catch {
    /* telemetry must never mask the original failure */
  }
}

interface FetchWithTimeoutInit extends RequestInit {
  timeoutMs: number
}

/**
 * fetch + AbortController deadline. Composes with any caller-supplied
 * `signal` (e.g. React unmount aborts) so either source can cancel. Translates
 * an abort caused by OUR deadline into a typed ApiTimeoutError; a caller abort
 * propagates as the original AbortError.
 */
async function fetchWithTimeout(url: string, init: FetchWithTimeoutInit): Promise<Response> {
  const { timeoutMs, signal: callerSignal, ...rest } = init
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  // Bridge a caller-provided signal into our controller so unmount/navigation
  // aborts still cancel the in-flight request.
  const onCallerAbort = () => controller.abort()
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort()
    else callerSignal.addEventListener('abort', onCallerAbort, { once: true })
  }

  const method = (rest.method ?? 'GET').toUpperCase()
  try {
    return await fetch(url, { ...rest, signal: controller.signal })
  } catch (err) {
    if (timedOut) {
      logTimeout(url, method, timeoutMs)
      throw new ApiTimeoutError(url, method, timeoutMs)
    }
    throw err
  } finally {
    clearTimeout(timer)
    if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort)
  }
}

export interface ApiRequestConfig {
  headers?: Record<string, string>
  /** Override the default timeout for this request. */
  timeoutMs?: number
  /** Caller abort signal (e.g. component unmount). Composed with the deadline. */
  signal?: AbortSignal
}

export const api = {
  async get<T = Record<string, unknown>>(url: string, config?: ApiRequestConfig): Promise<{ data: T }> {
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      timeoutMs: config?.timeoutMs ?? GET_TIMEOUT_MS,
      headers: config?.headers,
      signal: config?.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Request failed with status ${res.status}`)
    }

    const json: unknown = await res.json()
    return { data: json as T }
  },

  async post<T extends ApiResponse = ApiResponse>(
    url: string,
    data: unknown,
    config?: ApiRequestConfig,
  ): Promise<{ data: T }> {
    const isFormData = data instanceof FormData

    const res = await fetchWithTimeout(url, {
      method: 'POST',
      timeoutMs: config?.timeoutMs ?? POST_TIMEOUT_MS,
      // For FormData, let the browser set Content-Type + boundary automatically.
      // For JSON, set Content-Type and merge any caller headers.
      headers: isFormData
        ? (config?.headers ?? {})
        : { 'Content-Type': 'application/json', ...(config?.headers ?? {}) },
      body: isFormData ? data : JSON.stringify(data),
      signal: config?.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Request failed with status ${res.status}`)
    }

    const json: unknown = await res.json()
    return { data: json as T }
  },
}
