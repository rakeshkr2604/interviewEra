import { redirect } from 'next/navigation'
import { SCRIPT_INTERVIEW_START_PATH } from '@/lib/interview/default-interview-start-path'

/** Legacy V1 onboarding entry — retired; script engine is the only start path. */
export default function OnboardingRedirectPage() {
  redirect(SCRIPT_INTERVIEW_START_PATH)
}
