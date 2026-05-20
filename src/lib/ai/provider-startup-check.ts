/**
 * Startup-time AI provider validation.
 *
 * Checks environment variables without logging key material.
 * Call runProviderStartupCheck() in server startup paths (e.g. route handlers
 * on cold boot) to surface misconfiguration early rather than mid-request.
 */

import { isSingleProviderMode, logSingleProviderBanner } from '@/lib/ai/single-provider-mode';

export interface StartupCheckResult {
  hasOpenAI:     boolean;
  hasOpenRouter: boolean;
  hasMistral:    boolean;
  /** True when at least one primary provider (OpenAI or OpenRouter) is configured. */
  canOperate:    boolean;
  warnings:      string[];
}

/**
 * True when OPENAI_API_KEY is present and has the expected `sk-` prefix.
 * Does NOT make a network call.
 */
export function hasMinimumAiConfig(): boolean {
  const key = process.env.OPENAI_API_KEY ?? '';
  return key.startsWith('sk-') && key.length > 10;
}

/**
 * Validates all AI-related environment variables and returns a structured result.
 * Logs warnings for missing optional providers and an error if no provider can operate.
 */
export function runProviderStartupCheck(): StartupCheckResult {
  logSingleProviderBanner();
  const openaiKey    = process.env.OPENAI_API_KEY ?? '';
  const hasOpenAI    = openaiKey.startsWith('sk-') && openaiKey.length > 10;
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const hasMistral   = Boolean(process.env.MISTRAL_API_KEY?.trim());
  const canOperate   = isSingleProviderMode() ? hasOpenRouter : (hasOpenAI || hasOpenRouter);

  if (isSingleProviderMode() && !hasOpenRouter) {
    console.error(
      '[provider-startup-check] CRITICAL: SINGLE_PROVIDER_MODE=true requires OPENROUTER_API_KEY.',
    );
  }

  const warnings: string[] = [];
  if (!hasOpenAI)     warnings.push('OPENAI_API_KEY missing or invalid (expected sk-… prefix)');
  if (!hasOpenRouter) warnings.push('OPENROUTER_API_KEY not set — OpenRouter provider unavailable');
  if (!hasMistral)    warnings.push('MISTRAL_API_KEY not set — Mistral fallback unavailable');

  for (const w of warnings) {
    console.warn(`[provider-startup-check] ${w}`);
  }

  if (!canOperate) {
    console.error(
      '[provider-startup-check] CRITICAL: No viable AI provider configured. ' +
      'Set OPENAI_API_KEY (sk-…) or OPENROUTER_API_KEY before handling requests.',
    );
  }

  return { hasOpenAI, hasOpenRouter, hasMistral, canOperate, warnings };
}
