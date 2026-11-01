'use server'

import { headers } from 'next/headers'
import { checkAndConsumeFreeToolLimit } from '@/lib/security/free-tool-rate-limit'
import {
  clientIpFromHeaders,
  requireFreeToolUser,
  type FreeToolAuthErrorCode,
} from '@/lib/security/free-tool-access'
import { recordFreeToolCompleted } from '@/lib/analytics/free-tool-events'
import { logToolUsage } from '@/lib/telemetry/tool-usage-logger'
import { parsePromptBuilderUsage } from '@/lib/prep/usage-event'

export type PromptBuilderAuthorization =
  | { ok: true }
  | {
      ok: false
      code: FreeToolAuthErrorCode | 'RATE_LIMITED' | 'RATE_LIMIT_UNAVAILABLE' | 'INVALID'
      message: string
    }

/**
 * Server-controlled access check for the Prompt Builder. The prompt itself is
 * still written in the browser; the body carries only the preparation goal.
 * The client must not render a prompt unless this returns ok.
 */
export async function authorizePromptBuilderRun(input: unknown): Promise<PromptBuilderAuthorization> {
  const access = await requireFreeToolUser()
  if (!access.ok) return { ok: false, code: access.code, message: access.message }

  const parsed = parsePromptBuilderUsage(input)
  if (!parsed) return { ok: false, code: 'INVALID', message: 'Please choose a preparation goal.' }

  const ip = clientIpFromHeaders(await headers())
  const limit = await checkAndConsumeFreeToolLimit(
    'prompt-builder',
    { userId: access.userId, ip, tier: access.tier },
    { failClosed: false },
  )

  logToolUsage({
    tool: 'prompt_builder',
    mode: parsed.goal,
    event: limit.ok ? 'run' : 'rate_limited',
    signed_in: true,
  })

  if (!limit.ok) return { ok: false, code: limit.code, message: limit.message }
  recordFreeToolCompleted(access.userId, 'prompt_builder')
  return { ok: true }
}
