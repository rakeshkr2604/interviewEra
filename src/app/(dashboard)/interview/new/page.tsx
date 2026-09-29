import { redirect } from 'next/navigation'
import { SCRIPT_INTERVIEW_START_PATH } from '@/lib/interview/default-interview-start-path'
import { privatePageMetadata } from '@/lib/seo/metadata'

export const metadata = privatePageMetadata({
  title: 'Start interview',
  description: 'Configure and start a new AI mock interview.',
  path: '/interview/new',
})

/** Legacy V1 short-form start — retired; script engine is the only start path. */
export default function NewInterviewRedirectPage() {
  redirect(SCRIPT_INTERVIEW_START_PATH)
}
