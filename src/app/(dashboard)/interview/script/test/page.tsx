import { redirect } from 'next/navigation'
import { SCRIPT_INTERVIEW_START_PATH } from '@/lib/interview/default-interview-start-path'

/** Bookmark compatibility — former test harness URL. */
export default function ScriptInterviewTestRedirectPage() {
  redirect(SCRIPT_INTERVIEW_START_PATH)
}
