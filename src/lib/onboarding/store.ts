'use client'
import React, { createContext, useContext, useState } from 'react'
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

  const setGoal = (goal: InterviewGoal) => setData(p => ({ ...p, goal }))
  const setRole = (role: string) => setData(p => ({ ...p, role }))
  const setExperienceYears = (experienceYears: number) => setData(p => ({ ...p, experienceYears }))
  const setMode = (mode: 'Technical' | 'HR' | 'Mixed') => setData(p => ({ ...p, mode }))
  const setInterviewerId = (interviewerId: 'priya' | 'arjun') =>
    setData(p => ({ ...p, interviewerId }))
  const setResumeId = (resumeId: string) => setData(p => ({ ...p, resumeId }))
  const setResumeData = (rd: {
    resumeText: string
    skills: string[]
    projects: string[]
    role?: string
    experienceYears?: number
  }) =>
    setData(p => ({
      ...p,
      resumeText: rd.resumeText,
      skills: rd.skills,
      projects: rd.projects,
      role: rd.role ?? p.role,
      experienceYears: rd.experienceYears ?? p.experienceYears,
    }))
  const setPlacementDate = (placementDate: string) => setData(p => ({ ...p, placementDate }))
  const reset = () => setData(DEFAULT_STATE)

  const value: OnboardingContextType = {
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
  }

  return React.createElement(OnboardingContext.Provider, { value }, children)
}

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}
