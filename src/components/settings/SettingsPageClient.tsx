'use client'

import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { SettingsSection } from '@/components/settings/SettingsSection'
import {
  SettingsTableOfContentsDesktop,
  SettingsTableOfContentsMobile,
} from '@/components/settings/SettingsTableOfContents'
import { ThemeAppearanceControl } from '@/components/settings/ThemeAppearanceControl'
import { InterviewPreferencesPanel } from '@/components/settings/InterviewPreferencesPanel'
import { VoiceAudioPanel } from '@/components/settings/VoiceAudioPanel'
import { NotificationsPanel } from '@/components/settings/NotificationsPanel'
import {
  BillingUsageCard,
  type BillingSubscription,
  type BillingTx,
} from '@/components/settings/BillingUsageCard'
import { PrivacySecurityPanel } from '@/components/settings/PrivacySecurityPanel'
import { AccountManagementPanel } from '@/components/settings/AccountManagementPanel'
import { DangerZoneCard } from '@/components/settings/DangerZoneCard'
import type { NotificationPreferences } from '@/lib/settings/notification-preferences'
import type { PlanTier } from '@/types/app.types'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

const SETTINGS_CARD_SHELL = 'dashboard-premium-card px-5 py-4 sm:px-6 sm:py-4.5'

export function SettingsPageClient({
  authUser,
  profileName,
  profileEmail,
  profileJoinedAt,
  planTier,
  creditsRemaining,
  creditsUsedThisMonth,
  subscription,
  recentTransactions,
  notificationPrefs,
  weeklyImprovementSummaryOn,
}: {
  authUser: User
  profileName: string | null
  profileEmail: string
  profileJoinedAt: string
  planTier: PlanTier
  creditsRemaining: number
  creditsUsedThisMonth: number
  subscription: BillingSubscription
  recentTransactions: BillingTx[]
  notificationPrefs: NotificationPreferences
  weeklyImprovementSummaryOn: boolean
}) {
  const lastSignIn = authUser.last_sign_in_at ?? null
  const hasGoogle = Boolean(authUser.identities?.some((i) => i.provider === 'google'))

  return (
    <div className="flex w-full max-w-none flex-col pb-10 lg:flex-row lg:items-start lg:gap-8 lg:pb-12">
      <div className="min-w-0 flex-1 space-y-6 md:space-y-7">
        <DashboardPageHeader
          eyebrow="Account"
          title="Settings"
          subtitle={
            <>
              Preferences, billing, and security — consistent with the rest of{' '}
              <BrandWordmarkSplit className="inline text-[inherit]" />.
            </>
          }
        />

        <SettingsTableOfContentsMobile className="-mt-2 mb-2 lg:hidden" />

        <div
          className={cn(
            'grid gap-6 md:gap-y-5',
            'lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-5',
          )}
        >
          <SettingsSection
            id="settings-appearance"
            eyebrow="Appearance"
            title="Theme"
            description="Choose how InterviewEra looks on this device. System follows your OS setting."
            density="compact"
          >
            <div
              className={cn(
                SETTINGS_CARD_SHELL,
                'min-h-0 lg:flex lg:min-h-[min(27.5rem,calc(100vh-14rem))] lg:flex-col',
              )}
            >
              <div className="flex min-h-0 flex-1 flex-col">
                <ThemeAppearanceControl />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="settings-notifications"
            eyebrow="Stay in the loop"
            title="Notifications"
            description="Control what we send by email. Transactional messages (security, receipts) may still be required."
            density="compact"
          >
            <div className={SETTINGS_CARD_SHELL}>
              <NotificationsPanel
                initialPrefs={notificationPrefs}
                weeklyImprovementSummaryInitiallyOn={weeklyImprovementSummaryOn}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            id="settings-billing"
            eyebrow="Plan"
            title="Billing and usage"
            description="Credits, subscription status, and your recent account activity."
            density="compact"
          >
            <div className={SETTINGS_CARD_SHELL}>
              <BillingUsageCard
                planTier={planTier}
                creditsRemaining={creditsRemaining}
                creditsUsedThisMonth={creditsUsedThisMonth}
                subscription={subscription}
                recentTransactions={recentTransactions}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            id="settings-privacy"
            eyebrow="Trust"
            title="Privacy and security"
            description="Sign-in methods, sessions, and how to rotate your password safely."
            density="compact"
          >
            <div className={SETTINGS_CARD_SHELL}>
              <PrivacySecurityPanel
                lastSignInAt={lastSignIn}
                hasGoogle={hasGoogle}
                userEmail={profileEmail}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            id="settings-account"
            className="lg:col-span-2"
            eyebrow="Profile"
            title="Account management"
            description="Your details and data exports."
            density="compact"
          >
            <div className={SETTINGS_CARD_SHELL}>
              <AccountManagementPanel
                displayName={profileName}
                email={profileEmail}
                joinedAt={profileJoinedAt}
                accountId={authUser.id}
              />
            </div>
          </SettingsSection>
        </div>

        <SettingsSection
          id="settings-interview"
          eyebrow="Interview"
          title="Interview preferences"
          description="Defaults for new practice sessions. Your current interview is not changed retroactively."
          density="compact"
        >
          <div className={SETTINGS_CARD_SHELL}>
            <InterviewPreferencesPanel />
          </div>
        </SettingsSection>

        <SettingsSection
          id="settings-audio"
          eyebrow="Audio"
          title="Voice and audio"
          description="Interviewer voice, preview, and microphone behavior for avatar sessions."
          density="compact"
        >
          <div className={SETTINGS_CARD_SHELL}>
            <VoiceAudioPanel />
          </div>
        </SettingsSection>

        <div id="settings-danger" className="mx-auto w-full max-w-4xl">
          <DangerZoneCard />
        </div>
      </div>

      <SettingsTableOfContentsDesktop className="hidden shrink-0 pt-0.5 lg:block" />
    </div>
  )
}
