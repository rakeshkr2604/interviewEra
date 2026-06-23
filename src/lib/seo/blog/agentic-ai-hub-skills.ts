export interface AgenticSkillEval {
  skill: string
  whyItMatters: string
  goodExample: string
  badExample: string
  interviewSignal: string
}

export const AGENTIC_SKILLS_EVALUATED: readonly AgenticSkillEval[] = [
  {
    skill: 'Requirement clarification',
    whyItMatters: 'Ambiguous specs cause wrong solutions; seniors ask before coding.',
    goodExample: 'Asks about auth model, rate limits, and error format before writing endpoints.',
    badExample: 'Assumes REST when the interviewer wanted GraphQL; builds the wrong API.',
    interviewSignal: 'Interviewer notes structured questions and documented assumptions.',
  },
  {
    skill: 'Communication',
    whyItMatters: 'Interviewers must follow your reasoning in real time.',
    goodExample: 'Narrates plan: "I will add validation layer first, then handler, then tests."',
    badExample: 'Silent for 20 minutes, then surprises interviewer with unfinished code.',
    interviewSignal: 'Clear think-aloud without over-explaining every line.',
  },
  {
    skill: 'System thinking',
    whyItMatters: 'Features touch data, APIs, and failure modes — not isolated functions.',
    goodExample: 'Considers idempotency, retries, and observability for a webhook handler.',
    badExample: 'Implements happy path only; no logging or error boundaries.',
    interviewSignal: 'Mentions boundaries, dependencies, and operational concerns.',
  },
  {
    skill: 'AI prompting',
    whyItMatters: 'Vague prompts produce vague code; precision saves review time.',
    goodExample: 'Prompt includes stack, constraints, file structure, and test expectations.',
    badExample: '"Build the API" with no context — receives generic, wrong-framework code.',
    interviewSignal: 'Iterative prompts that narrow scope after each AI response.',
  },
  {
    skill: 'Planning',
    whyItMatters: 'Plan prevents rework and shows you can decompose problems.',
    goodExample: 'Sketches modules, data flow, and test order on paper or comments first.',
    badExample: 'Prompts AI repeatedly without structure; ends with conflicting files.',
    interviewSignal: 'Visible plan referenced during implementation and review.',
  },
  {
    skill: 'Architecture',
    whyItMatters: 'Structure must scale and remain readable for the team.',
    goodExample: 'Separates routes, services, and repositories with clear interfaces.',
    badExample: 'Single 400-line file mixing HTTP, SQL, and business logic.',
    interviewSignal: 'Can defend folder structure and dependency direction.',
  },
  {
    skill: 'Trade-off analysis',
    whyItMatters: 'Every choice has cost; seniors articulate alternatives.',
    goodExample: 'Chooses in-memory cache for interview scope; notes Redis for production.',
    badExample: 'Adds Kubernetes because AI suggested it for a CLI tool.',
    interviewSignal: 'Explains why not the alternative approach.',
  },
  {
    skill: 'Debugging',
    whyItMatters: 'AI introduces subtle bugs; you must trace and fix them.',
    goodExample: 'Reads stack trace, reproduces failure, fixes root cause in validation layer.',
    badExample: 'Re-prompts AI randomly until something compiles.',
    interviewSignal: 'Systematic isolation, not prompt roulette.',
  },
  {
    skill: 'Testing',
    whyItMatters: 'Tests prove the solution works and catch AI hallucinations.',
    goodExample: 'Writes unit tests for edge cases AI missed; runs them before claiming done.',
    badExample: 'Manual click-test only; misses null input and boundary failures.',
    interviewSignal: 'Test names and cases map to clarified requirements.',
  },
  {
    skill: 'Risk analysis',
    whyItMatters: 'Shipping unsafe code fails in production interviews and real jobs.',
    goodExample: 'Flags SQL injection risk in AI-generated query; parameterizes inputs.',
    badExample: 'Ships string-concatenated SQL because it passed one manual test.',
    interviewSignal: 'Proactive security and reliability mentions.',
  },
  {
    skill: 'Ownership',
    whyItMatters: 'You sign the code — not the model.',
    goodExample: 'Says "I chose this approach because…" and fixes AI mistakes personally.',
    badExample: 'Blames AI when code fails: "The model gave me that."',
    interviewSignal: 'First-person accountability in discussion.',
  },
  {
    skill: 'Decision making',
    whyItMatters: 'Interviews compress weeks of decisions into one hour.',
    goodExample: 'Cuts scope to deliver tested core; documents deferred features.',
    badExample: 'Chases optional features while core requirement remains broken.',
    interviewSignal: 'Prioritization aligned with stated goals.',
  },
  {
    skill: 'Code review',
    whyItMatters: 'Reviewing AI output is half the job in agentic workflows.',
    goodExample: 'Walks through diff, removes dead code, fixes naming and error handling.',
    badExample: 'Accepts generated code without reading imports or side effects.',
    interviewSignal: 'Specific critiques of AI-generated sections.',
  },
  {
    skill: 'Engineering judgment',
    whyItMatters: 'Holistic signal — knowing when AI helps vs when you must think alone.',
    goodExample: 'Uses AI for boilerplate; designs auth flow manually after threat modeling.',
    badExample: 'Delegates architecture to AI; cannot explain data model.',
    interviewSignal: 'Balanced tool use with defensible human decisions.',
  },
]
