export type ScriptStartDifficulty = 'easy' | 'medium' | 'hard'
export type ScriptStartInterviewMode = 'technical' | 'hr_behavioral' | 'mixed'

export function parseInterviewModeParam(
  raw: string | null,
): ScriptStartInterviewMode | null {
  if (!raw) return null
  const normalized = raw.trim().toLowerCase()
  if (normalized === 'technical') return 'technical'
  if (normalized === 'hr_behavioral' || normalized === 'hr' || normalized === 'behavioral') {
    return 'hr_behavioral'
  }
  if (normalized === 'mixed') return 'mixed'
  return null
}

export function parseDifficultyParam(raw: string | null): ScriptStartDifficulty | null {
  if (!raw) return null
  const normalized = raw.trim().toLowerCase()
  if (normalized === 'easy' || normalized === 'medium' || normalized === 'hard') {
    return normalized
  }
  return null
}

/** Infer interview mode from a roadmap focus dimension when mode is absent. */
export function modeFromFocusParam(
  focus: string | null,
): ScriptStartInterviewMode | null {
  if (!focus) return null
  if (focus === 'technical_depth') return 'technical'
  if (
    focus === 'communication_clarity' ||
    focus === 'answer_structure' ||
    focus === 'confidence'
  ) {
    return 'hr_behavioral'
  }
  return null
}
