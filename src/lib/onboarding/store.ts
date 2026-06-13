'use client'
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { OnboardingData, InterviewGoal } from '@/types/onboarding.types'

const DEFAULT_STATE: OnboardingData = {
  goal: null,
  role: '',
  experienceYears: 0,
  mode: 'Technical',
  interviewerId: null,
  resumeId: null,
  resumeText: '',
  skills: [],
  projects: [],
  placementDate: null,
}

interface OnboardingContextType {
  data: OnboardingData
  setGoal: (goal: InterviewGoal) => void
  setRole: (role: string) => void
  setExperienceYears: (years: number) => void
  setMode: (mode: 'Technical' | 'HR' | 'Mixed') => void
  setInterviewerId: (id: 'priya' | 'arjun') => void
  setResumeId: (resumeId: string) => void
  setResumeData: (data: {
    resumeText: string
    skills: string[]
    projects: string[]
    role?: string
    experienceYears?: number
  }) => void
  setPlacementDate: (date: string) => void
  reset: () => void
}

const OnboardingContext = createContext<OnboardingContextType | null>(null)

export function OnboardingProvider({
  children,
  initialData,
}: {
  children: React.ReactNode
  initialData?: OnboardingData
}) {
  const [data, setData] = useState<OnboardingData>(initialData ?? DEFAULT_STATE)

  const setGoal = useCallback(
    (goal: InterviewGoal) => setData(p => (p.goal === goal ? p : { ...p, goal })),
    [],
  )
  const setRole = useCallback(
    (role: string) => setData(p => (p.role === role ? p : { ...p, role })),
    [],
  )
  const setExperienceYears = useCallback(
    (experienceYears: number) =>
      setData(p => (p.experienceYears === experienceYears ? p : { ...p, experienceYears })),
    [],
  )
  const setMode = useCallback(
    (mode: 'Technical' | 'HR' | 'Mixed') => setData(p => (p.mode === mode ? p : { ...p, mode })),
    [],
  )
  const setInterviewerId = useCallback(
    (interviewerId: 'priya' | 'arjun') =>
      setData(p => (p.interviewerId === interviewerId ? p : { ...p, interviewerId })),
    [],
  )
  const setResumeId = useCallback(
    (resumeId: string) => setData(p => (p.resumeId === resumeId ? p : { ...p, resumeId })),
    [],
  )
  const setResumeData = useCallback(
    (rd: {
      resumeText: string
      skills: string[]
      projects: string[]
      role?: string
      experienceYears?: number
    }) =>
      setData(p => {
        const nextRole = rd.role ?? p.role
        const nextExperienceYears = rd.experienceYears ?? p.experienceYears
        if (
          p.resumeText === rd.resumeText &&
          p.skills === rd.skills &&
          p.projects === rd.projects &&
          p.role === nextRole &&
          p.experienceYears === nextExperienceYears
        ) {
          return p
        }
        return {
          ...p,
          resumeText: rd.resumeText,
          skills: rd.skills,
          projects: rd.projects,
          role: nextRole,
          experienceYears: nextExperienceYears,
        }
      }),
    [],
  )
  const setPlacementDate = useCallback(
    (placementDate: string) =>
      setData(p => (p.placementDate === placementDate ? p : { ...p, placementDate })),
    [],
  )
  const reset = useCallback(() => setData(DEFAULT_STATE), [])

  const value: OnboardingContextType = useMemo(
    () => ({
      data,
      setGoal,
      setRole,
      setExperienceYears,
      setMode,
      setInterviewerId,
      setResumeId,
      setResumeData,
      setPlacementDate,
      reset,
    }),
    [
      data,
      setGoal,
      setRole,
      setExperienceYears,
      setMode,
      setInterviewerId,
      setResumeId,
      setResumeData,
      setPlacementDate,
      reset,
    ],
  )

  return React.createElement(OnboardingContext.Provider, { value }, children)
}

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}
