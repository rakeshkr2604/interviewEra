/**
 * Live answer-structure detector — provisional, client-side guidance while
 * the candidate speaks.
 *
 * PURE + deterministic: no network, no LLM, no async, no side effects.
 * Input is FINALIZED STT text only (never interim). Output is an estimate —
 * the authoritative analysis remains post-approval auto_structure + scoring.
 *
 * Framework identity reuses the existing answer-score routing
 * (star | logical_flow via subRubricForQuestionType) — no third registry.
 */

import {
  subRubricForQuestionType,
  type QuestionType,
  type SubRubric,
} from '@/lib/interview/answer-score/rubric'

export type LiveSectionStatus = 'detected' | 'not_detected_yet'

export type LiveAnswerSection = {
  id: string
  label: string
  status: LiveSectionStatus
}

export type LiveAnswerStructure = {
  framework: SubRubric
  sections: LiveAnswerSection[]
}

/**
 * Resolve the live framework from existing runtime metadata.
 * SCRIPT_M without a per-turn question_type tag → null (no strip).
 * Client-safe: reuses only the pure rubric helper (no server imports).
 */
export function resolveLiveAnswerFramework(opts: {
  scriptType: string | null | undefined
  questionType: QuestionType | null | undefined
}): SubRubric | null {
  if (opts.questionType === 'behavioral' || opts.questionType === 'technical') {
    return subRubricForQuestionType(opts.questionType)
  }
  if (opts.scriptType === 'SCRIPT_H') return 'star'
  if (opts.scriptType === 'SCRIPT_T') return 'logical_flow'
  return null
}

type SectionSpec = {
  id: string
  label: string
  matches: (sentence: string) => boolean
}

/** Sentences from finalized STT text (punctuate=true gives boundaries). */
function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+["']?\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * A sentence fragment must carry enough words before it can mark a section —
 * "I built" alone (cut-off final segment) is not evidence of an Action.
 */
const MIN_SENTENCE_WORDS = 4

function normalizeSentence(sentence: string): string {
  return sentence
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'%\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── STAR cues (conservative; user-visible product spec) ──────────────────────

const STAR_SITUATION =
  /\b(when|while|during|project|problem|situation|challenge|bottleneck|needed to address|at my (previous|last|first))\b/

const STAR_TASK =
  /\b(needed to|goal|responsible for|my responsibility|i had to|objective|was asked to|my task)\b/

const STAR_ACTION =
  /\bi (built|implemented|designed|created|changed|decided|configured|developed|introduced|worked on|wrote|set up|refactored|automated)\b/

/**
 * Result requires an outcome CUE — a bare number/metric must never mark
 * Result ("the app had 150 users" is Situation context, not an outcome).
 */
const STAR_RESULT =
  /\b(result|outcome|impact|led to|improved|improving|reduced|reducing|increased|increasing|generated|achieved|reached|saved|grew|boosted)\b/

// ── logical_flow cues (labels match CoachingFeedbackPanel wording) ───────────

const FLOW_PROBLEM =
  /\b(problem|issue|challenge|bottleneck|failure|failing|bug|requirement|broke|breaking)\b/

const FLOW_APPROACH =
  /\bi (used|implemented|chose|built|configured|designed|applied|picked)\b|\b(approach|solution|strategy)\b/

const FLOW_REASONING =
  /\b(because|trade-?offs?|compared|comparing|downside|limitation|performance|scalability|reliability|instead of|rather than)\b|\bchose\b.*\bover\b/

const FLOW_CONCLUSION =
  /\b(result|outcome|ultimately|therefore|this solved|solved|improved|reduced|increased|in the end)\b/

const STAR_SECTIONS: SectionSpec[] = [
  { id: 'situation', label: 'Situation', matches: (s) => STAR_SITUATION.test(s) },
  { id: 'task', label: 'Task', matches: (s) => STAR_TASK.test(s) },
  { id: 'action', label: 'Action', matches: (s) => STAR_ACTION.test(s) },
  { id: 'result', label: 'Result', matches: (s) => STAR_RESULT.test(s) },
]

const FLOW_SECTIONS: SectionSpec[] = [
  { id: 'problem', label: 'Problem', matches: (s) => FLOW_PROBLEM.test(s) },
  { id: 'approach', label: 'Approach', matches: (s) => FLOW_APPROACH.test(s) },
  {
    id: 'reasoning',
    label: 'Reasoning / trade-offs',
    matches: (s) => FLOW_REASONING.test(s),
  },
  { id: 'conclusion', label: 'Conclusion', matches: (s) => FLOW_CONCLUSION.test(s) },
]

function sectionsForFramework(framework: SubRubric): SectionSpec[] {
  return framework === 'star' ? STAR_SECTIONS : FLOW_SECTIONS
}

/**
 * Detect provisional structure coverage from FINALIZED transcript text.
 *
 * Monotonic within one answer: pass the previous result via `previous` and
 * any section already `detected` stays detected even if a later recompute on
 * different text would not re-match (defensive — the finalized transcript
 * only grows during an answer, so this mostly guards state resets).
 */
export function detectLiveAnswerStructure(
  finalizedTranscript: string,
  framework: SubRubric,
  previous?: LiveAnswerStructure | null,
): LiveAnswerStructure {
  const specs = sectionsForFramework(framework)

  const previousDetected = new Set(
    previous && previous.framework === framework
      ? previous.sections.filter((s) => s.status === 'detected').map((s) => s.id)
      : [],
  )

  const sentences = splitSentences(finalizedTranscript)
    .map(normalizeSentence)
    .filter((s) => s.split(' ').filter(Boolean).length >= MIN_SENTENCE_WORDS)

  const sections: LiveAnswerSection[] = specs.map((spec) => {
    const detected =
      previousDetected.has(spec.id) || sentences.some((s) => spec.matches(s))
    return {
      id: spec.id,
      label: spec.label,
      status: detected ? 'detected' : 'not_detected_yet',
    }
  })

  return { framework, sections }
}

/**
 * Sequential PRESENTATION of live structure — does not change detection.
 *
 * A section is shown as completed only when it is detected AND every earlier
 * section is already completed. A later cue (e.g. Result before Action) stays
 * detected internally but is not shown as a green completed step. The first
 * incomplete section is marked `next` (primary guidance). Never emits
 * "missing" / "failed" / "complete".
 */
export type LiveSectionPresentation = 'completed' | 'next' | 'upcoming'

export type PresentedLiveSection = {
  id: string
  label: string
  /** Internal detector result — preserved even when not shown as completed. */
  detected: boolean
  presentation: LiveSectionPresentation
}

export function presentLiveAnswerStructure(
  structure: LiveAnswerStructure,
): PresentedLiveSection[] {
  let prefixComplete = true
  let nextAssigned = false

  return structure.sections.map((section) => {
    const detected = section.status === 'detected'
    const completed = detected && prefixComplete
    if (!completed) prefixComplete = false

    let presentation: LiveSectionPresentation
    if (completed) {
      presentation = 'completed'
    } else if (!nextAssigned) {
      presentation = 'next'
      nextAssigned = true
    } else {
      presentation = 'upcoming'
    }

    return { id: section.id, label: section.label, detected, presentation }
  })
}
