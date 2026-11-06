/** Preset target companies shown as toggle chips on onboarding step 1. */
export const COMPANY_QUICK_PICKS = [
  'Google',
  'Amazon',
  'Microsoft',
  'TCS',
  'Infosys',
  'Accenture',
  'Flipkart',
  'Swiggy',
] as const

export type CompanyQuickPick = (typeof COMPANY_QUICK_PICKS)[number]
