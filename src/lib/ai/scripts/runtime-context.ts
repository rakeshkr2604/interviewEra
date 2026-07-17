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
  selected_interviewer?: string // only for SCRIPT_M
  last_question_type?: string | null // only for SCRIPT_M
}

// Keys are padded so every value starts at the same column, matching the
// RUNTIME CONTEXT block format in the SCRIPT_*.md prompt files.
const KEY_COLUMN_WIDTH = 22

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
  ]

  if (params.selected_interviewer !== undefined) {
    lines.push(contextLine('selected_interviewer', params.selected_interviewer))
    lines.push(contextLine('last_question_type', params.last_question_type ?? null))
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
