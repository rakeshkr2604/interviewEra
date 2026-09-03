/**
 * GET/POST /api/admin/coach/access
 *
 * Founder admin endpoint for runtime control of AI Interview Coach.
 * Enables zero-deploy mode switching ('disabled' | 'admin_only' | 'allowlist' | 'public')
 * and cohort allowlist management.
 *
 * Protected: Platform Admin only (requirePlatformAdmin).
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/admin/auth'
import {
  COACH_ACCESS_MODES,
  addEmailsToCoachAllowlist,
  clearCoachAllowlist,
  getCoachAccessMode,
  getCoachAllowlist,
  removeEmailsFromCoachAllowlist,
  setCoachAccessMode,
} from '@/lib/coach/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('set_mode'),
    mode: z.enum(COACH_ACCESS_MODES),
  }),
  z.object({
    action: z.literal('add_emails'),
    emails: z.array(z.string().trim().email()).min(1).max(500),
  }),
  z.object({
    action: z.literal('remove_emails'),
    emails: z.array(z.string().trim().email()).min(1).max(500),
  }),
  z.object({
    action: z.literal('clear_allowlist'),
  }),
])

export async function GET(): Promise<NextResponse> {
  const { error } = await requirePlatformAdmin()
  if (error) return error

  try {
    const mode = await getCoachAccessMode()
    const allowlist = await getCoachAllowlist()

    return NextResponse.json({
      mode,
      allowlistCount: allowlist.length,
      allowlist,
    })
  } catch (err) {
    console.error('[admin/coach/access] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to retrieve Coach access configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const { admin, error } = await requirePlatformAdmin()
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request payload', details: parsed.error.issues },
      { status: 400 }
    )
  }

  try {
    const data = parsed.data

    switch (data.action) {
      case 'set_mode': {
        await setCoachAccessMode(data.mode)
        console.log(`[admin/coach/access] admin=${admin.email} changed mode to ${data.mode}`)
        return NextResponse.json({
          ok: true,
          mode: data.mode,
          message: `Coach access mode updated to ${data.mode}`,
        })
      }

      case 'add_emails': {
        const added = await addEmailsToCoachAllowlist(data.emails)
        console.log(`[admin/coach/access] admin=${admin.email} added ${added} emails to allowlist`)
        return NextResponse.json({
          ok: true,
          added,
          allowlist: await getCoachAllowlist(),
        })
      }

      case 'remove_emails': {
        const removed = await removeEmailsFromCoachAllowlist(data.emails)
        console.log(`[admin/coach/access] admin=${admin.email} removed ${removed} emails from allowlist`)
        return NextResponse.json({
          ok: true,
          removed,
          allowlist: await getCoachAllowlist(),
        })
      }

      case 'clear_allowlist': {
        await clearCoachAllowlist()
        console.log(`[admin/coach/access] admin=${admin.email} cleared allowlist`)
        return NextResponse.json({
          ok: true,
          message: 'Allowlist cleared successfully',
          allowlist: [],
        })
      }
    }
  } catch (err) {
    console.error('[admin/coach/access] POST failed', err)
    return NextResponse.json(
      { error: 'Failed to update Coach access configuration' },
      { status: 500 }
    )
  }
}
