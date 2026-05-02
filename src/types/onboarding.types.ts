export type InterviewGoal =
  | 'fresher_placement'
  | 'job_switch'
  | 'promotion_prep'
  | 'general_practice'

export interface OnboardingData {
  goal: InterviewGoal | null
  role: string
  experience: string
  mode: 'Technical' | 'HR'
  interviewerId: 'priya' | 'arjun' | null
  resumeId: string | null
  resumeText: string
  skills: string[]
  projects: string[]
  placementDate: string | null
}

export const GOAL_OPTIONS = [
  {
    id: 'fresher_placement' as InterviewGoal,
    label: 'Fresher Placement',
    description: 'Campus placements, first job',
    emoji: '🎓',
  },
  {
    id: 'job_switch' as InterviewGoal,
    label: 'Job Switch',
    description: '1–5 years experience, new role',
    emoji: '🚀',
  },
  {
    id: 'promotion_prep' as InterviewGoal,
    label: 'Promotion Prep',
    description: 'Internal interviews, leadership roles',
    emoji: '📈',
  },
  {
    id: 'general_practice' as InterviewGoal,
    label: 'General Practice',
    description: 'Stay sharp, build confidence',
    emoji: '🎯',
  },
]
