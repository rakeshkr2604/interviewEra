'use client'
import React, { createContext, useContext, useState } from 'react'
import type { OnboardingData, InterviewGoal } from '@/types/onboarding.types'

const DEFAULT_STATE: OnboardingData = {
  goal: null,
  role: '',
  experience: '',
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
  setExperience: (exp: string) => void
  setMode: (mode: 'Technical' | 'HR') => void
  setInterviewerId: (id: 'priya' | 'arjun') => void
  setResumeId: (resumeId: string) => void
  setResumeData: (data: { resumeText: string; skills: string[]; projects: string[]; role?: string; experience?: string }) => void
  setPlacementDate: (date: string) => void
  reset: () => void
}

const OnboardingContext = createContext<OnboardingContextType | null>(null)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(DEFAULT_STATE)

  const setGoal = (goal: InterviewGoal) => setData(p => ({ ...p, goal }))
  const setRole = (role: string) => setData(p => ({ ...p, role }))
  const setExperience = (experience: string) => setData(p => ({ ...p, experience }))
  const setMode = (mode: 'Technical' | 'HR') => setData(p => ({ ...p, mode }))
  const setInterviewerId = (interviewerId: 'priya' | 'arjun') => setData(p => ({ ...p, interviewerId }))
  const setResumeId = (resumeId: string) => setData(p => ({ ...p, resumeId }))
  const setResumeData = (rd: { resumeText: string; skills: string[]; projects: string[]; role?: string; experience?: string }) =>
    setData(p => ({ ...p, resumeText: rd.resumeText, skills: rd.skills, projects: rd.projects, role: rd.role || p.role, experience: rd.experience || p.experience }))
  const setPlacementDate = (placementDate: string) => setData(p => ({ ...p, placementDate }))
  const reset = () => setData(DEFAULT_STATE)

  const value: OnboardingContextType = {
    data, setGoal, setRole, setExperience, setMode,
    setInterviewerId, setResumeId, setResumeData, setPlacementDate, reset,
  }

  return React.createElement(OnboardingContext.Provider, { value }, children)
}

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}
