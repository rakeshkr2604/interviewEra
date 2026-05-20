/**
 * MVP launch kill-switch. When SINGLE_PROVIDER_MODE=true:
 *   - All fallback chains short-circuit to OpenRouter → gpt-4o-mini.
 *   - Direct OpenAI calls + Mistral calls throw before hitting the network.
 *   - Provider routing tables collapse to a single spec.
 * Reversible at runtime by toggling the env var (no redeploy required for
 * subsequent cold boots).
 */
export function isSingleProviderMode(): boolean {
  return process.env.SINGLE_PROVIDER_MODE === 'true';
}

export class FallbackDisabledError extends Error {
  constructor(provider: string) {
    super(`[single-provider-mode] ${provider} fallback disabled by SINGLE_PROVIDER_MODE`);
    this.name = 'FallbackDisabledError';
  }
}

/** Startup log line — emitted once per cold boot from provider-startup-check. */
export function logSingleProviderBanner(): void {
  if (isSingleProviderMode()) {
    console.warn(
      '[single-provider-mode] ACTIVE — OpenRouter→gpt-4o-mini only. ' +
      'Direct OpenAI and Mistral fallbacks are blocked.',
    );
  }
}
