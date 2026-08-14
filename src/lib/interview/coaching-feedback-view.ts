/**
 * Pure view-model for post-answer coaching UI.
 * Assembles card + modal content from existing auto-structure / answer-score
 * fields only — no LLM, no invented Action/Result, no fabricated weaknesses.
 */

import type { AutoStructureCoaching } from '@/lib/interview/fetch-auto-structure'
import type { AnswerScore } from '@/components/interview/AnswerScoreCard'

export type ImprovementPoint = {
  title: string
  detail?: string
}

export type StrongerExampleSection = {
  label: 'Situation' | 'Task' | 'Action' | 'Result' | 'Example'
  text: string
}

export type AnswerFramework = 'star' | 'logical_flow'

export type CoachingFeedbackViewModel = {
  coachingParagraph: string
  improvements: ImprovementPoint[]
  question: string
  framework: AnswerFramework
  interviewerWants: string[]
  missingFromAnswer: string[]
  strongerExample: StrongerExampleSection[]
  /** Shown when the stronger example omits STAR/flow sections we refused to invent. */
  strongerExampleNote: string | null
  quickTip: string | null
  hasStrongerExample: boolean
}

const STAR_WANTS = [
  'A real experience — never invent a story to fit the question.',
  'A concrete past incident (not a hypothetical).',
  'What YOU personally did — not only the team.',
  'A clear result or what changed afterward.',
]

/** View-model fallback when LLM coaching still tells the candidate to invent a story. */
export const TRUTHFUL_EXPERIENCE_COACHING =
  "If you have a genuine example from another project, use that. Do not invent a story to fit the question. If you don't have one, briefly explain the limitation and share the closest real experience."

const STAR_SECTION_LABELS: StrongerExampleSection['label'][] = [
  'Situation',
  'Task',
  'Action',
  'Result',
]

/**
 * True when coaching tells the candidate to manufacture an experience.
 * Conservative: ignores text that already forbids invention ("do not invent").
 */
export function encouragesExperienceFabrication(text: string): boolean {
  const t = text.toLowerCase()
  if (!t.trim()) return false
  const forbids = /\b(do not|don't|never|avoid)\b/.test(t)
  if (/\b(invent|fabricat|make up|manufactur)\b/.test(t) && !forbids) return true
  if (/even if it requires/.test(t)) return true
  if (/even if you (have to|need to) (recall|create|invent|make)/.test(t)) return true
  if (/prepar(e|ing) a star story/.test(t) && /even if/.test(t)) return true
  return false
}

export function sanitizeCoachingAgainstFabrication(text: string): string {
  if (!encouragesExperienceFabrication(text)) return text
  return TRUTHFUL_EXPERIENCE_COACHING
}

export function strongerExampleEvidenceNote(
  framework: AnswerFramework,
  sections: StrongerExampleSection[],
): string | null {
  if (sections.length === 0) return null
  if (framework === 'star') {
    const labels = new Set(sections.map((s) => s.label))
    const complete = STAR_SECTION_LABELS.every((l) => labels.has(l))
    if (complete) return null
    return "Only sections supported by your actual answer are shown. We don't invent missing STAR details."
  }
  return "Only sections supported by your actual answer are shown. We don't invent missing details."
}

const LOGICAL_FLOW_WANTS = [
  'A clear problem or question framing.',
  'Your approach and the reasoning behind it.',
  'Trade-offs or a crisp conclusion.',
]

/** Normalize for duplicate detection: lowercase, strip punctuation, collapse space. */
export function normalizeImprovementKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    // Map common specificity phrasings to one token so near-duplicates collapse.
    .replace(/\b(specificity|specifics?|details?|detail)\b/g, 'specific')
    .replace(/\b(be|more|add|give|include|provide|need|to|the|a|an|of|and)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isNearDuplicate(a: string, b: string): boolean {
  const ka = normalizeImprovementKey(a)
  const kb = normalizeImprovementKey(b)
  if (!ka || !kb) return false
  if (ka === kb) return true
  if (ka.includes(kb) || kb.includes(ka)) return true
  // Shared significant tokens (≥3 chars)
  const ta = new Set(ka.split(' ').filter((w) => w.length >= 3))
  const tb = kb.split(' ').filter((w) => w.length >= 3)
  if (ta.size === 0 || tb.length === 0) return false
  const overlap = tb.filter((w) => ta.has(w)).length
  return overlap / Math.max(ta.size, tb.length) >= 0.7
}

/** Title-case a short missing-element into a scannable heading. */
export function titleFromMissing(raw: string): string {
  const t = raw.trim().replace(/\s+/g, ' ')
  if (!t) return ''
  // Already sentence-like — keep first ~8 words as title.
  const words = t.split(' ')
  if (words.length <= 8) {
    return t.charAt(0).toUpperCase() + t.slice(1)
  }
  return words.slice(0, 8).join(' ') + '…'
}

export function parseStrongerExampleLines(lines: string[]): StrongerExampleSection[] {
  const out: StrongerExampleSection[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const m = /^(situation|task|action|result)\s*[:\-–—]\s*(.+)$/i.exec(line)
    if (m) {
      const label =
        m[1]!.charAt(0).toUpperCase() + m[1]!.slice(1).toLowerCase()
      out.push({
        label: label as StrongerExampleSection['label'],
        text: m[2]!.trim(),
      })
      continue
    }
    out.push({ label: 'Example', text: line })
  }
  return out
}

/**
 * True when `one_line_summary` is a positive recap, not an actionable gap.
 * Conservative: any imperative / "next time" cue wins over praise.
 */
const ACTIONABLE_IMPROVEMENT_CUE =
  /\b(next time|to make it more|to go further|add |include |give |provide |show |name |quantify|specify|mention |focus on|tighten|missing|without a |didn'?t|did not|could have|should have|need to|try to|be more)\b/i

const PRAISE_RECAP_CUE =
  /\b(comprehensive|covers all|covering all|well[- ]structured|clearly explained|good examples|well done|excellent|you clearly|your reasoning was|solid answer|strong answer|the answer is|your answer is|you covered|you explained|you provided|complete answer|clear, complete|articulated|it['’]s great|you correctly|good start|this is a good start)\b/i

export function isPraiseRecapNotActionable(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (ACTIONABLE_IMPROVEMENT_CUE.test(t)) return false
  return PRAISE_RECAP_CUE.test(t)
}

/** Drop praise-only sentences; keep genuine improvement sentences. */
function stripPraiseOnlySentences(text: string): string {
  const t = text.trim()
  if (!t) return ''
  const parts = t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length <= 1) {
    return isPraiseRecapNotActionable(t) ? '' : t
  }
  return parts.filter((s) => !isPraiseRecapNotActionable(s)).join(' ')
}

export function dedupeImprovements(points: ImprovementPoint[]): ImprovementPoint[] {
  const kept: ImprovementPoint[] = []
  for (const p of points) {
    const title = p.title.trim()
    if (!title) continue
    const dup = kept.some(
      (k) =>
        isNearDuplicate(k.title, title) ||
        (p.detail && k.detail && isNearDuplicate(k.detail, p.detail)) ||
        (k.detail && isNearDuplicate(k.detail, title)) ||
        (p.detail && isNearDuplicate(p.detail, k.title)),
    )
    if (!dup) kept.push({ title, detail: p.detail?.trim() || undefined })
    if (kept.length >= 3) break
  }
  return kept
}

export function buildCoachingFeedbackViewModel(args: {
  coaching: AutoStructureCoaching | null | undefined
  score: AnswerScore | null | undefined
  displayQuestion: string
  questionType?: 'behavioral' | 'technical' | null
  fallbackCoaching?: string
}): CoachingFeedbackViewModel {
  const coaching = args.coaching
  const score = args.score
  const framework: AnswerFramework =
    args.questionType === 'technical' ? 'logical_flow' : 'star'

  const rawCoachingParagraph = sanitizeCoachingAgainstFabrication(
    coaching?.feedback?.trim() ||
      args.fallbackCoaching?.trim() ||
      '',
  )

  const missing = (coaching?.missing_elements ?? [])
    .map((m) => m.trim())
    .filter(Boolean)
    .map(sanitizeCoachingAgainstFabrication)

  const improvementCandidates: ImprovementPoint[] = missing.map((m) => ({
    title: titleFromMissing(m),
    detail: m.length > titleFromMissing(m).length ? m : undefined,
  }))

  // Surface one_line_summary as an improvement only when it is a real gap.
  // Praise/recap may still appear as Next step / quickTip.
  const summaryRaw = score?.one_line_summary?.trim()
  const summary = summaryRaw ? sanitizeCoachingAgainstFabrication(summaryRaw) : ''
  if (summary && !isPraiseRecapNotActionable(summary)) {
    improvementCandidates.push({ title: titleFromMissing(summary), detail: summary })
  }

  const improvements = dedupeImprovements(
    improvementCandidates.filter(
      (p) =>
        !isPraiseRecapNotActionable(p.title) &&
        !isPraiseRecapNotActionable(p.detail ?? ''),
    ),
  )

  // Praise belongs in quickTip / Next step — never under "How you could strengthen this".
  const coachingParagraph = stripPraiseOnlySentences(rawCoachingParagraph)

  const strongerExample = parseStrongerExampleLines(
    coaching?.restructured_example ?? [],
  )

  const quickTip =
    summary ||
    (missing[0] ? `Next time, focus on: ${missing[0]}` : null) ||
    null

  return {
    coachingParagraph,
    improvements,
    question: args.displayQuestion.trim(),
    framework,
    interviewerWants: framework === 'star' ? STAR_WANTS : LOGICAL_FLOW_WANTS,
    missingFromAnswer: missing,
    strongerExample,
    strongerExampleNote: strongerExampleEvidenceNote(framework, strongerExample),
    quickTip,
    hasStrongerExample: strongerExample.length > 0,
  }
}
