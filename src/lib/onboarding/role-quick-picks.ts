/** Preset target roles shown as chips on onboarding step 1. */
export const ROLE_QUICK_PICKS = [
  'Software Engineer',
  'Full Stack Developer',
  'Data Analyst',
  'Product Manager',
  'Business Analyst',
  'DevOps Engineer',
  'UI/UX Designer',
  'HR / People Ops',
] as const

export type RoleQuickPick = (typeof ROLE_QUICK_PICKS)[number]
