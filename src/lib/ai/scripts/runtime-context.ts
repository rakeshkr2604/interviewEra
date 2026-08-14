export type RuntimeContextParams = {
  candidate_name: string
  target_role: string
  experience_level: string // pre-converted string, not raw number
  interview_goal: string
  company_name: string
  company_type: string
  difficulty: string
  resume_summary: string
  /** Clamped JD text, or "Not provided" when absent. */
  job_description: string
  question_pool: string
  current_phase: string
  question_number: number
  total_questions: number
  skips_used: number
  max_skips: number
  last_answer: string
  multilingual_detected: boolean
  is_returning_user: boolean
  self_intro_enabled: boolean
  current_turn_index: number
  /** Session toggle: when false, model must never emit is_follow_up. */
  follow_up_enabled: boolean
  /** Follow-ups already asked on the current parent core question. */
  follow_ups_this_question: number
  /** Cap for follow-ups on the current question (0 when disabled). */
  max_follow_ups_per_question: number
  /** Last acknowledgment speeches (most-recent-first), for rotation. */
  recent_acknowledgments: string[]
  /** Canonical parent core question (not a follow-up). Empty when none. */
  parent_question?: string
  /** Candidate's last real answer — never interviewer ack speech. */
  last_candidate_answer?: string
  /** How last_answer was derived for this turn. */
  last_answer_source?: 'candidate_submit' | 'ack_auto_advance' | 'special'
  /** True when the previous persisted turn was a core is_question=false ack. */
  previous_turn_was_acknowledgment?: boolean
  selected_interviewer?: string // only for SCRIPT_M
  last_question_type?: string | null // only for SCRIPT_M
  /** True when follow_ups_this_question >= max and follow-ups are enabled. */
  follow_up_cap_reached?: boolean
  /** SCRIPT_M only: required type of the next NEW core question. */
  next_core_question_type?: 'technical' | 'behavioral' | null
  /**
   * Score-derived probe gate for the last candidate answer.
   * true = follow-up allowed; false = do not follow up; unknown = LLM decides.
   */
  answer_probe_needed?: boolean | 'unknown'
  /** Most recent dedicated CQ lifecycle action, or none before CQ entry. */
  candidate_question_action?: 'none' | 'invite' | 'guidance' | 'answer' | 'follow_up'
  candidate_question_guidance_shown?: boolean
  candidate_question_follow_ups?: number
  max_candidate_question_follow_ups?: number
  /** Bounded CQ transcript. Separate from core parent_question. */
  candidate_question_conversation?: string
}

// Keys are padded so every value starts at the same column, matching the
// RUNTIME CONTEXT block format in the SCRIPT_*.md prompt files.
const KEY_COLUMN_WIDTH = 30

function contextLine(key: string, value: string | number | boolean | null): string {
  return `${(key + ':').padEnd(KEY_COLUMN_WIDTH)} ${String(value)}`
}

/** Human-readable gloss for onboarding goal enums (injected beside the raw value). */
export function interviewGoalGlossary(goal: string): string {
  switch (goal) {
    case 'fresher_placement':
      return 'fresher_placement (campus / first-job prep — no assumed full-time work history)'
    case 'job_switch':
      return 'job_switch (has work history; contrast prior role vs target)'
    case 'promotion_prep':
      return 'promotion_prep (deeper ownership / leadership within current track)'
    case 'general_practice':
      return 'general_practice (flexible practice; still respect experience_level)'
    default:
      return goal
  }
}

export function buildRuntimeContext(params: RuntimeContextParams): string {
  const lines = [
    contextLine('candidate_name', params.candidate_name),
    contextLine('target_role', params.target_role),
    contextLine('experience_level', params.experience_level),
    contextLine('interview_goal', interviewGoalGlossary(params.interview_goal)),
    contextLine('company_name', params.company_name),
    contextLine('company_type', params.company_type),
    contextLine('difficulty', params.difficulty),
    contextLine('resume_summary', params.resume_summary),
    contextLine('job_description', params.job_description),
    contextLine('question_pool', params.question_pool),
    contextLine('current_phase', params.current_phase),
    contextLine('question_number', params.question_number),
    contextLine('total_questions', params.total_questions),
    contextLine('skips_used', params.skips_used),
    contextLine('max_skips', params.max_skips),
    contextLine('last_answer', params.last_answer),
    contextLine('multilingual_detected', params.multilingual_detected),
    contextLine('is_returning_user', params.is_returning_user),
    contextLine('self_intro_enabled', params.self_intro_enabled),
    contextLine('current_turn_index', params.current_turn_index),
    contextLine(
      'follow_up_enabled',
      `${params.follow_up_enabled} // true = up to 2 follow-ups when warranted, not always 2; false = none`,
    ),
    contextLine('follow_ups_this_question', params.follow_ups_this_question),
    contextLine('max_follow_ups_per_question', params.max_follow_ups_per_question),
    contextLine(
      'answer_probe_needed',
      `${params.answer_probe_needed ?? 'unknown'} // true = answer is weak, a same-topic probe is REQUIRED while under cap; false = answer is strong, next core/phase; unknown = decide from last_candidate_answer`,
    ),
    contextLine(
      'candidate_question_action',
      params.candidate_question_action ?? 'none',
    ),
    contextLine(
      'candidate_question_guidance_shown',
      params.candidate_question_guidance_shown ?? false,
    ),
    contextLine(
      'candidate_question_follow_ups',
      params.candidate_question_follow_ups ?? 0,
    ),
    contextLine(
      'max_candidate_question_follow_ups',
      params.max_candidate_question_follow_ups ?? 2,
    ),
    contextLine(
      'candidate_question_conversation',
      params.candidate_question_conversation || '[NONE]',
    ),
    contextLine(
      'recent_acknowledgments',
      JSON.stringify(params.recent_acknowledgments),
    ),
    contextLine('parent_question', params.parent_question || '[NONE]'),
    contextLine(
      'last_candidate_answer',
      params.last_candidate_answer || params.last_answer,
    ),
    contextLine(
      'last_answer_source',
      params.last_answer_source ?? 'candidate_submit',
    ),
    contextLine(
      'previous_turn_was_acknowledgment',
      params.previous_turn_was_acknowledgment ?? false,
    ),
    contextLine('follow_up_cap_reached', params.follow_up_cap_reached ?? false),
  ]

  if (params.selected_interviewer !== undefined) {
    lines.push(contextLine('selected_interviewer', params.selected_interviewer))
    lines.push(contextLine('last_question_type', params.last_question_type ?? null))
    lines.push(contextLine('next_core_question_type', params.next_core_question_type ?? null))
  }

  return lines.join('\n')
}

export function experienceYearsToLevel(years: number): string {
  if (years <= 0) return '0-1 years (Fresher)'
  if (years === 1) return '1 year'
  if (years <= 3) return `${years} years`
  if (years <= 7) return `${years} years (Mid-level)`
  return `${years} years (Senior)`
}

/** True when behavioral questions must avoid assumed workplace history. */
export function isFresherExperienceLevel(experienceLevel: string): boolean {
  return /fresher|0-1\s*years/i.test(experienceLevel)
}
