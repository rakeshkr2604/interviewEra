import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  notificationPreferencesSchema,
  parseNotificationPreferencesJson,
  type NotificationPreferences,
} from '@/lib/settings/notification-preferences'

const patchBodySchema = z
  .object({
    interviewReminders: z.boolean().optional(),
    performanceReports: z.boolean().optional(),
    productUpdates: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
    weeklyImprovementSummary: z.boolean().optional(),
  })
  .refine(
    (o) => Object.keys(o).length > 0,
    'At least one preference field is required',
  )

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = patchBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { data: rowFull, error: fetchFullError } = await supabase
      .from('users')
      .select('notification_preferences, email_digest_unsubscribed')
      .eq('id', user.id)
      .single()

    let notificationPrefsRaw: unknown = undefined
    let digestUnsubscribed: boolean | null = null

    if (!fetchFullError && rowFull) {
      notificationPrefsRaw = rowFull.notification_preferences
      digestUnsubscribed = rowFull.email_digest_unsubscribed
    } else {
      const { data: rowBase, error: fetchBaseError } = await supabase
        .from('users')
        .select('email_digest_unsubscribed')
        .eq('id', user.id)
        .single()

      if (fetchBaseError || !rowBase) {
        const msg =
          typeof fetchBaseError?.message === 'string'
            ? fetchBaseError.message
            : typeof fetchFullError?.message === 'string'
              ? fetchFullError.message
              : 'unknown'
        console.error('[notification-preferences] fetch:', msg, fetchBaseError?.code ?? fetchFullError?.code)
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      }
      digestUnsubscribed = rowBase.email_digest_unsubscribed
    }

    const currentPrefs = parseNotificationPreferencesJson(notificationPrefsRaw)
    const nextPrefs: NotificationPreferences = { ...currentPrefs }
    const patch = parsed.data

    if (patch.interviewReminders !== undefined) {
      nextPrefs.interviewReminders = patch.interviewReminders
    }
    if (patch.performanceReports !== undefined) {
      nextPrefs.performanceReports = patch.performanceReports
    }
    if (patch.productUpdates !== undefined) {
      nextPrefs.productUpdates = patch.productUpdates
    }
    if (patch.marketingEmails !== undefined) {
      nextPrefs.marketingEmails = patch.marketingEmails
    }

    const validated = notificationPreferencesSchema.parse(nextPrefs)

    let emailDigestUnsubscribed: boolean | undefined
    if (patch.weeklyImprovementSummary !== undefined) {
      emailDigestUnsubscribed = !patch.weeklyImprovementSummary
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        notification_preferences: validated,
        ...(emailDigestUnsubscribed !== undefined
          ? { email_digest_unsubscribed: emailDigestUnsubscribed }
          : {}),
      })
      .eq('id', user.id)

    if (updateError) {
      const onlyWeekly =
        patch.interviewReminders === undefined &&
        patch.performanceReports === undefined &&
        patch.productUpdates === undefined &&
        patch.marketingEmails === undefined &&
        patch.weeklyImprovementSummary !== undefined

      if (onlyWeekly && emailDigestUnsubscribed !== undefined) {
        const { error: digestOnlyError } = await supabase
          .from('users')
          .update({ email_digest_unsubscribed: emailDigestUnsubscribed })
          .eq('id', user.id)

        if (!digestOnlyError) {
          return NextResponse.json({
            notification_preferences: validated,
            weeklyImprovementSummary: !emailDigestUnsubscribed,
          })
        }
      }

      console.error('[notification-preferences] update:', updateError.message, updateError.code)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({
      notification_preferences: validated,
      weeklyImprovementSummary:
        emailDigestUnsubscribed !== undefined
          ? !emailDigestUnsubscribed
          : !(digestUnsubscribed ?? false),
    })
  } catch (err) {
    console.error('[notification-preferences]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
