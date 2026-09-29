import { redirect } from 'next/navigation'
import { SCRIPT_INTERVIEW_START_PATH } from '@/lib/interview/default-interview-start-path'

export default function BriefingRedirectPage() {
  redirect(SCRIPT_INTERVIEW_START_PATH)
}
