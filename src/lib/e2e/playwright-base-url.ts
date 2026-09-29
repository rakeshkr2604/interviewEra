/**
 * Resolve Playwright browser base URL for E2E.
 *
 * Staging `loadSafeStagingEnvironment` sets absent STAGING_ENV_KEYS to `''`.
 * Empty / whitespace must be treated as absent — never passed to `new URL()`.
 *
 * Precedence (local / staging E2E — never invents a production host):
 *   1. PLAYWRIGHT_BASE_URL (non-empty after trim)
 *   2. NEXT_PUBLIC_APP_URL (non-empty after trim)
 *   3. http://localhost:${PLAYWRIGHT_PORT ?? 3000}
 */

export type PlaywrightBaseUrlEnv = {
  PLAYWRIGHT_BASE_URL?: string | undefined
  NEXT_PUBLIC_APP_URL?: string | undefined
  PLAYWRIGHT_PORT?: string | undefined
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function resolvePlaywrightBaseUrl(
  // Accept ProcessEnv / dotenv bags (index signature) without weak-type errors.
  env: PlaywrightBaseUrlEnv | NodeJS.ProcessEnv = process.env,
): string {
  const bag = env as PlaywrightBaseUrlEnv
  const port = nonEmpty(bag.PLAYWRIGHT_PORT) ?? '3000'
  const localhostFallback = `http://localhost:${port}`

  const candidates = [
    { name: 'PLAYWRIGHT_BASE_URL', value: nonEmpty(bag.PLAYWRIGHT_BASE_URL) },
    { name: 'NEXT_PUBLIC_APP_URL', value: nonEmpty(bag.NEXT_PUBLIC_APP_URL) },
    { name: 'localhost-fallback', value: localhostFallback },
  ] as const

  for (const { name, value } of candidates) {
    if (!value) continue
    try {
      // Absolute http(s) URL required for cookie domain + Playwright webServer.
      const parsed = new URL(value)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`unsupported protocol ${parsed.protocol}`)
      }
      return value.replace(/\/$/, '')
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      throw new Error(
        `[e2e-base-url] Invalid ${name}=${JSON.stringify(value)} (${detail}). ` +
          'Set PLAYWRIGHT_BASE_URL or NEXT_PUBLIC_APP_URL to an absolute http(s) URL ' +
          '(e.g. http://127.0.0.1:3000). Empty strings from staging env wipe are treated as absent.',
      )
    }
  }

  // Unreachable — localhostFallback always present — but keep fail-closed.
  throw new Error('[e2e-base-url] Unable to resolve a Playwright base URL.')
}
