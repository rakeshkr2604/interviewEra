/**
 * Startup-time AI provider validation.
 *
 * Checks environment variables without logging key material.
 * Call runProviderStartupCheck() in server startup paths (e.g. route handlers
 * on cold boot) to surface misconfiguration early rather than mid-request.
 */

import { logSingleProviderBanner } from '@/lib/ai/single-provider-mode';

export interface StartupCheckResult {
  hasOpenAI:     boolean;
  hasOpenRouter: boolean;
  hasMistral:    boolean;
  /** True when OpenRouter is configured — required for all LLM completions. */
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
  const canOperate   = hasOpenRouter;

  if (!hasOpenRouter) {
    console.error(
      '[provider-startup-check] CRITICAL: OPENROUTER_API_KEY is required — all AI traffic routes through OpenRouter.',
    );
  }

  const warnings: string[] = [];
  if (!hasOpenAI)
    warnings.push('OPENAI_API_KEY missing — unused for LLM completions (reserved for tooling only)');
  if (!hasOpenRouter) warnings.push('OPENROUTER_API_KEY missing — REQUIRED for InterviewEra AI');
  if (!hasMistral) warnings.push('MISTRAL_API_KEY missing — Mistral is not enabled in current build');

  for (const w of warnings) {
    console.warn(`[provider-startup-check] ${w}`);
  }

  if (!canOperate) {
    console.error(
      '[provider-startup-check] CRITICAL: No viable AI provider configured. ' +
      'Set OPENROUTER_API_KEY before handling inference requests.',
    );
  }

  return { hasOpenAI, hasOpenRouter, hasMistral, canOperate, warnings };
}
