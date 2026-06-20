import { z } from 'zod'

export const notificationPreferencesSchema = z.object({
  interviewReminders: z.boolean(),
  performanceReports: z.boolean(),
  productUpdates: z.boolean(),
  marketingEmails: z.boolean(),
})

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>

export const defaultNotificationPreferences: NotificationPreferences = {
  interviewReminders: true,
  performanceReports: true,
  productUpdates: true,
  marketingEmails: true,
}

export function parseNotificationPreferencesJson(
  raw: unknown,
): NotificationPreferences {
  if (!raw || typeof raw !== 'object') return { ...defaultNotificationPreferences }
  const o = raw as Record<string, unknown>
  const merged = {
    interviewReminders:
      typeof o.interviewReminders === 'boolean'
        ? o.interviewReminders
        : defaultNotificationPreferences.interviewReminders,
    performanceReports:
      typeof o.performanceReports === 'boolean'
        ? o.performanceReports
        : defaultNotificationPreferences.performanceReports,
    productUpdates:
      typeof o.productUpdates === 'boolean'
        ? o.productUpdates
        : defaultNotificationPreferences.productUpdates,
    marketingEmails:
      typeof o.marketingEmails === 'boolean'
        ? o.marketingEmails
        : defaultNotificationPreferences.marketingEmails,
  }
  return notificationPreferencesSchema.parse(merged)
}
