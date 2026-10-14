'use server'

import { headers } from 'next/headers'
import { checkAndConsumeFreeToolLimit } from '@/lib/security/free-tool-rate-limit'
import { isSignedInFromHeaders, logToolUsage } from '@/lib/telemetry/tool-usage-logger'
import { parsePromptBuilderUsage } from '@/lib/prep/usage-event'

/**
 * Count one local prompt generation. The body may contain only a preparation
 * goal. Generation itself stays in the browser and does not wait on this call.
 */
export async function recordPromptBuilderRun(input: unknown): Promise<void> {
  const parsed = parsePromptBuilderUsage(input)
  if (!parsed) return

  const headersList = await headers()
  const signedIn = isSignedInFromHeaders(headersList)
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip')?.trim() ||
    'unknown'

  try {
    const limit = await checkAndConsumeFreeToolLimit('prompt-builder', ip, { failClosed: false })
    logToolUsage({
      tool: 'prompt_builder',
      mode: parsed.goal,
      event: limit.ok ? 'run' : 'rate_limited',
      signed_in: signedIn,
    })
  } catch (err) {
    console.warn('[prompt-builder] usage log failed:', err instanceof Error ? err.message : 'unknown')
  }
}
