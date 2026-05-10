'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { GoalSelector } from '@/components/onboarding/GoalSelector'
import { OnboardingStepIllustration } from '@/components/onboarding/OnboardingStepIllustration'
import { InterviewerPicker } from '@/components/onboarding/InterviewerPicker'
import { ROLE_QUICK_PICKS } from '@/lib/onboarding/role-quick-picks'
import type { InterviewGoal, OnboardingData } from '@/types/onboarding.types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { FaUserTie, FaBriefcase } from 'react-icons/fa'

const INTERVIEW_MODES: OnboardingData['mode'][] = ['Technical', 'HR']

export interface OnboardingStepGoalProfileProps {
  goal: OnboardingData['goal']
  role: OnboardingData['role']
  experienceYears: OnboardingData['experienceYears']
  mode: OnboardingData['mode']
  interviewerId: OnboardingData['interviewerId']
  onGoalSelect: (goal: InterviewGoal) => void
  onRoleChange: (role: string) => void
  onExperienceYearsChange: (years: number) => void
  onModeChange: (mode: OnboardingData['mode']) => void
  onInterviewerSelect: (id: NonNullable<OnboardingData['interviewerId']>) => void
  /** Resolved display name for the selected interviewer. */
  interviewerDisplayName: string
  /** True when session voice matches the user’s saved Settings default. */
  voiceMatchesSettingsDefault: boolean
  onResetVoiceToSettings: () => void
  canContinue: boolean
  onContinue: () => void
}

function RoleQuickPickGrid({
  selectedRole,
  onSelect,
}: {
  selectedRole: string
  onSelect: (role: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="group" aria-label="Suggested roles">
      {ROLE_QUICK_PICKS.map((pick) => (
        <button
          key={pick}
          type="button"
          onClick={() => onSelect(pick)}
          className={cn(
            'min-h-[1.85rem] rounded-full border px-2 py-1 text-center text-[10px] font-medium leading-snug transition-colors duration-200 sm:text-[11px]',
            selectedRole === pick
              ? 'border-(--accent-primary) bg-(--accent-primary)/10 text-(--accent-primary)'
              : 'border-(--card-border) bg-(--card-bg) text-(--text-secondary) hover:border-(--accent-primary)/45 hover:text-(--text-primary)',
          )}
        >
          {pick}
        </button>
      ))}
    </div>
  )
}

function InterviewerVoicePanel({
  displayName,
  matchesSettingsDefault,
  onResetToSettings,
  onOpenPicker,
}: {
  displayName: string
  matchesSettingsDefault: boolean
  onResetToSettings: () => void
  onOpenPicker: () => void
}) {
  return (
    <div className="rounded-xl border border-(--card-border) bg-(--bg-secondary)/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-(--text-primary)">Interviewer voice</p>
          <p className="mt-0.5 text-[11px] text-(--text-muted)">
            <span className="font-medium text-(--text-primary)">{displayName}</span>
            {matchesSettingsDefault ? ' · from Settings' : ' · this session only'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {!matchesSettingsDefault ? (
            <button
              type="button"
              onClick={onResetToSettings}
              className="rounded-lg border border-(--card-border) bg-(--card-bg) px-2 py-1 text-[10px] font-semibold text-(--text-secondary) hover:text-(--text-primary)"
            >
              Match Settings
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpenPicker}
            className="rounded-lg border border-(--card-border) bg-(--card-bg) px-2 py-1 text-[10px] font-semibold text-(--accent-primary)"
          >
            Change
          </button>
        </div>
      </div>
    </div>
  )
}

export function OnboardingStepGoalProfile({
  goal,
  role,
  experienceYears,
  mode,
  interviewerId,
  onGoalSelect,
  onRoleChange,
  onExperienceYearsChange,
  onModeChange,
  onInterviewerSelect,
  interviewerDisplayName,
  voiceMatchesSettingsDefault,
  onResetVoiceToSettings,
  canContinue,
  onContinue,
}: OnboardingStepGoalProfileProps) {
  const [voicePickerOpen, setVoicePickerOpen] = useState(false)

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] lg:gap-4 xl:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] lg:items-stretch">
      <div className="hidden min-h-0 shrink-0 lg:flex lg:flex-col lg:items-center lg:justify-center lg:pt-1">
        <OnboardingStepIllustration compact step={1} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
      >
        <div className="dashboard-premium-card flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 max-lg:overflow-y-auto max-lg:overscroll-y-contain lg:p-3 lg:overflow-hidden p-4 sm:p-6">
            <div className="space-y-4 lg:space-y-2">
              <div>
                <h2 className="text-base font-semibold text-(--text-primary) sm:text-lg lg:text-[0.95rem]">
                  Goal & profile
                </h2>
                <p className="mt-0.5 text-[11px] leading-snug text-(--text-secondary) sm:text-xs lg:hidden">
                  Everything here shapes this run only — change it each round if you want.
                </p>
              </div>

              <GoalSelector dense selected={goal} onSelect={onGoalSelect} />

              <div className="space-y-2">
                <p className="text-[11px] font-medium text-(--text-secondary)">Target role</p>
                <div className="relative">
                  <FaUserTie
                    className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-[1.05rem] -translate-y-1/2 text-(--text-muted)"
                    aria-hidden
                  />
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer"
                    value={role}
                    onChange={(e) => onRoleChange(e.target.value)}
                    className="w-full rounded-xl border border-(--card-border) bg-(--bg-secondary) py-2 pl-10 pr-3 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--accent-primary) focus:outline-none transition-colors duration-200"
                  />
                </div>
                <RoleQuickPickGrid selectedRole={role} onSelect={onRoleChange} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_minmax(7rem,8rem)]">
                <div className="relative sm:col-span-1">
                  <FaBriefcase
                    className="pointer-events-none absolute left-3.5 top-1/2 size-[0.95rem] -translate-y-1/2 text-(--text-muted)"
                    aria-hidden
                  />
                  <input
                    type="number"
                    min={0}
                    max={60}
                    placeholder="Years of experience"
                    value={experienceYears}
                    onChange={(e) => onExperienceYearsChange(Number.parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-(--card-border) bg-(--bg-secondary) py-2 pl-10 pr-3 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--accent-primary) focus:outline-none transition-colors duration-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:col-span-1 sm:grid-cols-2">
                  {INTERVIEW_MODES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onModeChange(m)}
                      className={cn(
                        'rounded-lg border py-2 text-[11px] font-semibold transition-all duration-200 sm:text-xs',
                        mode === m
                          ? 'border-(--accent-primary) bg-(--accent-primary)/10 text-(--accent-primary)'
                          : 'border-(--card-border) bg-(--bg-secondary) text-(--text-secondary)',
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <InterviewerVoicePanel
                displayName={interviewerDisplayName}
                matchesSettingsDefault={voiceMatchesSettingsDefault}
                onResetToSettings={() => {
                  onResetVoiceToSettings()
                  setVoicePickerOpen(false)
                }}
                onOpenPicker={() => setVoicePickerOpen(true)}
              />

              <Dialog open={voicePickerOpen} onOpenChange={setVoicePickerOpen}>
                <DialogContent
                  className="flex max-h-[min(85dvh,36rem)] max-w-[calc(100%-2rem)] flex-col gap-3 overflow-hidden p-4 sm:max-w-md"
                  showCloseButton
                >
                  <DialogHeader className="shrink-0 text-left">
                    <DialogTitle className="text-(--text-primary)">Choose interviewer voice</DialogTitle>
                    <DialogDescription className="text-(--text-secondary)">
                      Preview a voice, then tap your choice. This applies to this interview only unless it matches
                      Settings.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-1">
                    <InterviewerPicker
                      selectedId={interviewerId}
                      onSelect={(id) => {
                        onInterviewerSelect(id)
                        setVoicePickerOpen(false)
                      }}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end border-t border-(--card-border) px-4 py-2.5 sm:px-6 lg:py-2">
            <button
              type="button"
              onClick={onContinue}
              disabled={!canContinue}
              className="rounded-xl bg-(--accent-primary) px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-(--accent-hover) disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue →
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
