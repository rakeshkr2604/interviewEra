/**
 * MVP launch banner. When SINGLE_PROVIDER_MODE=true we log loudly at cold boot —
 * Mistral/direct OpenAI are not wired for completions in this codebase.
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
      '[single-provider-mode] ACTIVE — OpenRouter-only completions. ' +
        'Ensure OPENROUTER_API_KEY is set and OPENROUTER_CHEAP_MODEL / OPENROUTER_SMART_MODEL are valid.',
    );
  }
}
