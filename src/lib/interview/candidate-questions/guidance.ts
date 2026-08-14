import type { ScriptType } from '@/lib/ai/scripts/script-loader'
import type { ScriptTurnOutput } from '@/lib/ai/scripts/turn-validator'

type GuidanceCategory =
  | 'general'
  | 'technical'
  | 'behavioral'
  | 'role'
  | 'fresher'
  | 'team'
  | 'growth'
  | 'success'

type GuidanceQuestion = {
  category: GuidanceCategory
  text: string
}

const BANK: readonly GuidanceQuestion[] = [
  {
    category: 'success',
    text: 'What would success look like in this role during the first six months?',
  },
  {
    category: 'role',
    text: 'What kind of projects would I work on in this role?',
  },
  {
    category: 'team',
    text: 'How is the team structured, and who would I work with most closely?',
  },
  {
    category: 'technical',
    text: 'What are the biggest technical challenges the team is working on?',
  },
  {
    category: 'technical',
    text: 'How much technical ownership would I have in this role?',
  },
  {
    category: 'growth',
    text: 'How do you support learning and growth on the team?',
  },
  {
    category: 'fresher',
    text: 'What does the onboarding process typically look like?',
  },
  {
    category: 'fresher',
    text: 'Is there a mentorship or buddy system for someone joining the team?',
  },
  {
    category: 'behavioral',
    text: 'How does the team usually give feedback and collaborate?',
  },
  {
    category: 'behavioral',
    text: 'What qualities help someone do well on this team?',
  },
  {
    category: 'general',
    text: 'What are the most important priorities for the person joining this role?',
  },
]

function stableHash(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function categoryPriority(opts: {
  scriptType: ScriptType
  interviewGoal: string
  experienceLevel: string
}): GuidanceCategory[] {
  const fresher =
    opts.interviewGoal === 'fresher_placement' ||
    /fresher|0-1\s*years/i.test(opts.experienceLevel)

  if (fresher) {
    return ['fresher', 'growth', 'success', 'team', 'role', 'general']
  }
  if (opts.scriptType === 'SCRIPT_T') {
    return ['technical', 'role', 'team', 'success', 'growth', 'general']
  }
  if (opts.scriptType === 'SCRIPT_H') {
    return ['success', 'team', 'behavioral', 'growth', 'role', 'general']
  }
  return ['role', 'technical', 'team', 'success', 'growth', 'behavioral', 'general']
}

/**
 * Picks two context-relevant prompts with stable per-interview variation.
 * Stability matters because /turn retries must return the same guidance.
 */
export function selectCandidateQuestionGuidance(opts: {
  interviewId: string
  targetRole: string
  scriptType: ScriptType
  interviewGoal: string
  experienceLevel: string
}): [string, string] {
  const priorities = categoryPriority(opts)
  const rank = new Map(priorities.map((category, index) => [category, index]))
  const seed = `${opts.interviewId}:${opts.targetRole}:${opts.scriptType}`

  const candidates = BANK.map((question, index) => ({
    ...question,
    rank: rank.get(question.category) ?? priorities.length,
    variation: stableHash(`${seed}:${index}`),
  })).sort((a, b) => a.rank - b.rank || a.variation - b.variation)

  const first = candidates[0]
  const second =
    candidates.find(
      (candidate) =>
        candidate.text !== first.text && candidate.category !== first.category,
    ) ?? candidates[1]

  return [first.text, second.text]
}

export function cannedCandidateQuestionGuidanceTurn(opts: {
  questions: readonly [string, string]
  emotion?: ScriptTurnOutput['interviewer_emotion']
}): ScriptTurnOutput {
  const [first, second] = opts.questions
  const displayQuestion =
    'You can ask one of these, another question, or say you would like to finish.'

  return {
    speech:
      `That's completely fine. In a real interview, asking one useful question can help. ` +
      `For example: ${first} Or: ${second} ${displayQuestion}`,
    display_question: displayQuestion,
    tip: `Try one of these:\n• ${first}\n• ${second}`,
    timer_seconds: 60,
    reading_buffer_seconds: 3,
    auto_submit: true,
    allow_skip: true,
    show_auto_structure: false,
    phase: 'candidate_questions',
    is_question: true,
    is_follow_up: false,
    candidate_question_action: 'guidance',
    question_difficulty: null,
    interviewer_emotion: opts.emotion ?? 'warm',
  }
}
