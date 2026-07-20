/**
 * Generate sample core questions for three onboarding profiles to verify
 * experience/JD/resume personalization + forced-theme grounding in SCRIPT_H.
 *
 * Usage (from repo root, with .env.local loaded):
 *   npx tsx scripts/verify-script-personalization-samples.ts
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'

config({ path: resolve(process.cwd(), '.env.local') })

import { getScript } from '../src/lib/ai/scripts/script-loader'
import {
  buildRuntimeContext,
  experienceYearsToLevel,
} from '../src/lib/ai/scripts/runtime-context'
import { buildScriptResumeSummary } from '../src/lib/interview/question-gen-input'
import { completeInterviewChat } from '../src/lib/ai/interview-completion'
import { validateTurnOutput } from '../src/lib/ai/scripts/turn-validator'

type Profile = {
  id: string
  label: string
  role: string
  experienceYears: number
  goal: string
  difficulty: string
  resume: unknown | null
  jobDescription?: string
}

const PROFILES: Profile[] = [
  {
    id: 'a_fresher_no_docs',
    label: '(a) Fresher, no JD/resume',
    role: 'Associate Developer',
    experienceYears: 0,
    goal: 'fresher_placement',
    difficulty: 'easy',
    resume: null,
  },
  {
    id: 'b_fresher_with_projects',
    label: '(b) Fresher with college-project resume',
    role: 'Junior Software Engineer',
    experienceYears: 0,
    goal: 'fresher_placement',
    difficulty: 'easy',
    resume: {
      target_role: 'Junior Software Engineer',
      skills: ['React', 'JavaScript', 'Python', 'SQL'],
      experience_estimate: 'Fresher / student',
      projects: [
        { title: 'Campus Placement Portal', description: 'React + Node college project' },
        { title: 'Hackathon Chatbot', description: 'Python NLP team project' },
      ],
    },
  },
  {
    id: 'c_two_years_with_jd',
    label: '(c) 2yoE associate + JD',
    role: 'Associate Developer',
    experienceYears: 2,
    goal: 'job_switch',
    difficulty: 'medium',
    resume: {
      target_role: 'Associate Developer',
      skills: ['Java', 'Spring Boot', 'PostgreSQL', 'REST'],
      experience_estimate: '2 years',
      projects: [{ title: 'Payments API', description: 'Spring Boot microservice' }],
    },
    jobDescription: `
We are hiring an Associate Developer for our payments platform.
Must-have: Java, Spring Boot, PostgreSQL, REST APIs, unit testing.
Nice-to-have: Kafka, AWS.
Responsibilities: implement payment settlement APIs, fix production bugs, write tests, collaborate with QA.
`.trim(),
  },
]

function buildSystemPrompt(profile: Profile): {
  systemPrompt: string
  resumeSummary: string
  runtimeContext: string
} {
  const resumeSummary = profile.resume
    ? buildScriptResumeSummary(profile.resume, profile.role)
    : 'Not available'
  const runtimeContext = buildRuntimeContext({
    candidate_name: 'Asha',
    target_role: profile.role,
    experience_level: experienceYearsToLevel(profile.experienceYears),
    interview_goal: profile.goal,
    company_name: 'Not specified',
    company_type: 'unknown',
    difficulty: profile.difficulty,
    resume_summary: resumeSummary,
    job_description: profile.jobDescription?.trim() || 'Not provided',
    question_pool: 'Not available',
    current_phase: 'core',
    question_number: 1,
    total_questions: 4,
    skips_used: 0,
    max_skips: 2,
    last_answer: 'I am ready for the first question.',
    multilingual_detected: false,
    is_returning_user: false,
    self_intro_enabled: false,
    current_turn_index: 3,
    follow_up_enabled: true,
    follow_ups_this_question: 0,
    max_follow_ups_per_question: 2,
    recent_acknowledgments: [],
  })

  return {
    resumeSummary,
    runtimeContext,
    systemPrompt:
      getScript('SCRIPT_H') +
      '\n\n## RUNTIME CONTEXT\n\n```\n' +
      runtimeContext +
      '\n```',
  }
}

const FORCED_USER =
  'Generate the NEXT core behavioral question now. Prefer a conflict/disagreement theme. Return JSON only.'
const FREE_USER =
  'Generate the NEXT core behavioral question now. Choose any appropriate behavioral theme from the question pool (not forced to conflict). Return JSON only.'

async function generateTurn(
  profile: Profile,
  mode: 'forced_conflict' | 'free_choice',
): Promise<{
  speech: string
  display_question: string | null
  resumeSummary: string
  hasForcedThemeSection: boolean
  hasGroundedConflictTemplate: boolean
  userMessage: string
}> {
  const { systemPrompt, resumeSummary } = buildSystemPrompt(profile)
  const userMessage = mode === 'forced_conflict' ? FORCED_USER : FREE_USER

  const completion = await completeInterviewChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.4,
    operation: 'script_turn_generation',
    jsonMode: true,
    signal: AbortSignal.timeout(45_000),
  })

  let parsed: unknown
  try {
    parsed = JSON.parse(completion.content)
  } catch {
    const start = completion.content.indexOf('{')
    const end = completion.content.lastIndexOf('}')
    parsed = JSON.parse(completion.content.slice(start, end + 1))
  }

  const turn = validateTurnOutput(parsed, 'SCRIPT_H')
  return {
    speech: turn.speech,
    display_question: turn.display_question,
    resumeSummary,
    hasForcedThemeSection: systemPrompt.includes('Forced-theme grounding'),
    hasGroundedConflictTemplate: systemPrompt.includes('{project_from_resume}'),
    userMessage,
  }
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error('Missing OPENROUTER_API_KEY (or OPENAI_API_KEY) in .env.local')
    process.exit(1)
  }

  // Prompt-diff evidence (same RUNTIME CONTEXT for both; only user message differs)
  const evidenceProfile = PROFILES[1]!
  const { runtimeContext, systemPrompt } = buildSystemPrompt(evidenceProfile)
  const promptEvidence = {
    note: 'Forced-theme and free-choice turns share identical system prompt + RUNTIME CONTEXT. Only the user message differs.',
    resume_summary_in_runtime: evidenceProfile.resume
      ? buildScriptResumeSummary(evidenceProfile.resume, evidenceProfile.role)
      : 'Not available',
    runtime_context_excerpt: runtimeContext.split('\n').slice(0, 20).join('\n'),
    forced_user_message: FORCED_USER,
    free_choice_user_message: FREE_USER,
    system_has_forced_theme_section: systemPrompt.includes('Forced-theme grounding'),
    system_has_grounded_conflict_templates: systemPrompt.includes('{project_from_resume}'),
    root_cause:
      'Resume/JD were already injected for both modes. Gap was instruction/template: Conflict JSON skeletons were complete generic questions with no rewrite placeholders, so forced-theme turns copy-pasted them. Free-choice could invent from Projects/JD more freely.',
  }

  const out: Record<string, unknown>[] = []
  for (const profile of PROFILES) {
    console.error(`\n=== Forced conflict: ${profile.label} ===`)
    const forced = await generateTurn(profile, 'forced_conflict')
    console.error(`\n=== Free choice: ${profile.label} ===`)
    const free = await generateTurn(profile, 'free_choice')

    const row = {
      profile: profile.id,
      label: profile.label,
      resume_summary: forced.resumeSummary,
      job_description_present: Boolean(profile.jobDescription),
      forced_conflict: {
        speech: forced.speech,
        display_question: forced.display_question,
      },
      free_choice: {
        speech: free.speech,
        display_question: free.display_question,
      },
    }
    out.push(row)
    console.log(JSON.stringify(row, null, 2))
  }

  mkdirSync(resolve(process.cwd(), '.verify-out'), { recursive: true })
  const path = resolve(process.cwd(), '.verify-out/script-forced-theme-grounding.json')
  writeFileSync(
    path,
    JSON.stringify({ prompt_evidence: promptEvidence, samples: out }, null, 2),
  )
  console.error(`\n=== Wrote ${path} ===`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
