/**
 * Preparation-toolkit analytics.
 *
 * Follows the question-generator client pattern: GA4 (consent-gated) plus a
 * client product event. These events are not written through a new
 * unauthenticated endpoint. `/api/product-events` stays console-only except
 * for interview milestones.
 *
 * Props are a closed enum/boolean set. Free-text resume, prompt, and job
 * description values are dropped.
 */

import { markAnalyticsDedupeKey } from '@/lib/analytics/dedupe'
import { trackEvent } from '@/lib/analytics/gtag'
import {
  trackProductEventClient,
  type ProductEventName,
} from '@/lib/analytics/product-events'
import type { CandidateLevel, PrepGoal } from '@/lib/prep/prompt-builder'

export const PREP_EVENT_NAMES = [
  'resource_hub_viewed',
  'prep_prompt_generated',
  'prep_prompt_copied',
  'readiness_checklist_completed',
  'prep_guide_opened',
  'prep_to_mock_cta_clicked',
] as const satisfies readonly ProductEventName[]

export type PrepEventName = (typeof PREP_EVENT_NAMES)[number]

const MAX_PROP_STRING = 80

const ALLOWED_KEYS = new Set([
  'page_path',
  'goal',
  'level',
  'has_company',
  'has_skills',
  'has_job_description',
  'has_resume',
  'outcome',
  'completed_count',
  'total',
  'percent',
  'section',
  'mode',
])

export type PrepEventProps = {
  page_path?:
    | '/prepare'
    | '/resources/chatgpt-interview-preparation'
    | '/resources/hr-interview-answer-framework'
    | '/resources/online-assessment-preparation'
  goal?: PrepGoal
  level?: CandidateLevel
  has_company?: boolean
  has_skills?: boolean
  has_job_description?: boolean
  has_resume?: boolean
  outcome?: 'success' | 'failed'
  completed_count?: number
  total?: number
  percent?: number
  section?: string
  mode?: 'technical' | 'hr_behavioral' | 'mixed' | 'unspecified'
}

export function sanitizePrepEventProps(
  props: PrepEventProps,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(props)) {
    if (!ALLOWED_KEYS.has(key) || value === undefined) continue
    if (typeof value === 'string') {
      if (value.length === 0 || value.length > MAX_PROP_STRING) continue
      out[key] = value
      continue
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value
      continue
    }
    if (typeof value === 'boolean') out[key] = value
  }
  return out
}

export function trackPrepEvent(eventName: PrepEventName, props: PrepEventProps = {}): void {
  if (typeof window === 'undefined') return
  const safe = sanitizePrepEventProps(props)
  trackProductEventClient(eventName, safe)
  trackEvent(eventName, safe)
}

const VIEW_DEDUPE_PREFIX = 'ie_prep_view:'

export function trackPrepViewOnce(eventName: 'resource_hub_viewed' | 'prep_guide_opened', pagePath: PrepEventProps['page_path']): void {
  if (!pagePath) return
  if (!markAnalyticsDedupeKey(VIEW_DEDUPE_PREFIX, `${eventName}:${pagePath}`)) return
  trackPrepEvent(eventName, { page_path: pagePath })
}
