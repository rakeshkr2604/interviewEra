export interface RoadmapDay {
  day: number
  tasks: readonly string[]
}

export interface PrepRoadmap {
  label: string
  days: number
  summary: string
  schedule: readonly RoadmapDay[]
}

export const AGENTIC_PREP_ROADMAPS: readonly PrepRoadmap[] = [
  {
    label: '7-Day Crash',
    days: 7,
    summary: 'Fundamentals and one full simulated agentic session.',
    schedule: [
      { day: 1, tasks: ['Read agentic round format; list permitted tools you will use', 'Practice 10 clarification questions on ambiguous specs'] },
      { day: 2, tasks: ['DSA refresh: arrays, hashing, strings — 3 problems without AI', 'Same 3 problems with AI; compare speed and error rate'] },
      { day: 3, tasks: ['Prompting drill: 5 incremental prompts for a REST endpoint', 'Review and fix one deliberately buggy AI output'] },
      { day: 4, tasks: ['Bug-fix exercise in unfamiliar repo (open source or sample)', 'Write regression test for the fix'] },
      { day: 5, tasks: ['60-minute timed mock: backend API task with AI allowed', 'Self-score against rubric dimensions'] },
      { day: 6, tasks: ['Review mistakes list; redo weakest dimension only', 'Practice think-aloud narration for 20 minutes'] },
      { day: 7, tasks: ['Second full mock; record screen if possible', 'Write 5 STAR stories on ownership and AI disagreement'] },
    ],
  },
  {
    label: '15-Day Builder',
    days: 15,
    summary: 'Cover all major formats with rubric-aligned practice.',
    schedule: [
      { day: 1, tasks: ['Assess baseline: one untimed agentic task', 'Identify top 3 weak rubric dimensions'] },
      { day: 2, tasks: ['Clarification drills — 3 ambiguous product specs'] },
      { day: 3, tasks: ['Backend API mock (60 min)'] },
      { day: 4, tasks: ['Frontend component mock (60 min)'] },
      { day: 5, tasks: ['Bug-fix mock in legacy snippet'] },
      { day: 6, tasks: ['CLI tool mock'] },
      { day: 7, tasks: ['Rest day — review rubric and notes only'] },
      { day: 8, tasks: ['Light system design: sketch + trade-offs (45 min)'] },
      { day: 9, tasks: ['Code review exercise on AI-generated PR'] },
      { day: 10, tasks: ['Full-stack thin slice mock'] },
      { day: 11, tasks: ['Prompting patterns journal — what worked'] },
      { day: 12, tasks: ['Testing focus day: TDD one feature with AI'] },
      { day: 13, tasks: ['Timed pressure mock — stricter clock'] },
      { day: 14, tasks: ['Behavioral + technical hybrid discussion prep'] },
      { day: 15, tasks: ['Final mock; simulate interviewer Q&A for 15 min after'] },
    ],
  },
  {
    label: '30-Day Professional',
    days: 30,
    summary: 'Weekly format rotation, DSA maintenance, and mock interviews.',
    schedule: [
      { day: 1, tasks: ['Set goals; schedule 4 weekend mocks', 'Audit AI tools: Cursor, Claude, ChatGPT workflows'] },
      { day: 2, tasks: ['DSA: 2 problems', 'Agentic clarification drill'] },
      { day: 3, tasks: ['Backend mock'] },
      { day: 4, tasks: ['Review + fix weak tests from day 3'] },
      { day: 5, tasks: ['Frontend mock'] },
      { day: 6, tasks: ['STAR behavioral prep — 3 stories'] },
      { day: 7, tasks: ['Week 1 retrospective; update rubric self-scores'] },
      { day: 8, tasks: ['DSA: trees/graphs — 2 problems'] },
      { day: 9, tasks: ['Bug-fix + data pipeline snippet'] },
      { day: 10, tasks: ['AI application mini-task (LLM wrapper)'] },
      { day: 11, tasks: ['System design light — caching layer'] },
      { day: 12, tasks: ['Code review day'] },
      { day: 13, tasks: ['Full mock #2 with peer or platform'] },
      { day: 14, tasks: ['Rest and read India adoption section trends'] },
      { day: 15, tasks: ['Midpoint: half-length mocks on weak format'] },
      { day: 16, tasks: ['DSA: DP — 2 problems'] },
      { day: 17, tasks: ['Legacy codebase enhancement task'] },
      { day: 18, tasks: ['Security review drill on AI output'] },
      { day: 19, tasks: ['Communication: explain design to imaginary junior'] },
      { day: 20, tasks: ['Full mock #3'] },
      { day: 21, tasks: ['Analyze all mock scorecards'] },
      { day: 22, tasks: ['Trade-off deep dive — 5 architecture prompts'] },
      { day: 23, tasks: ['Speed run: 45-min scoped API'] },
      { day: 24, tasks: ['Behavioral: conflict with AI suggestion story'] },
      { day: 25, tasks: ['Full mock #4'] },
      { day: 26, tasks: ['Polish: testing patterns cheat sheet'] },
      { day: 27, tasks: ['Company research — which loops use agentic rounds'] },
      { day: 28, tasks: ['Dry run interview day routine'] },
      { day: 29, tasks: ['Light review only'] },
      { day: 30, tasks: ['Final dress rehearsal mock + debrief'] },
    ],
  },
  {
    label: '60-Day Comprehensive',
    days: 60,
    summary: 'Campus-to-product readiness with DSA, formats, and weekly mocks.',
    schedule: [
      { day: 1, tasks: ['Diagnostic mock + goal setting'] },
      { day: 7, tasks: ['Week 1 checkpoint — clarification & planning focus'] },
      { day: 14, tasks: ['Week 2 — backend + frontend mocks; DSA 10 problems cumulative'] },
      { day: 21, tasks: ['Week 3 — bug-fix, CLI, code review rotation'] },
      { day: 28, tasks: ['Week 4 — full mock; mid-program rubric audit'] },
      { day: 35, tasks: ['Week 5 — system design + AI app tasks'] },
      { day: 42, tasks: ['Week 6 — India target companies research; tailor stories'] },
      { day: 49, tasks: ['Week 7 — pressure mocks; fix top mistake patterns'] },
      { day: 56, tasks: ['Week 8 — taper: review FAQs and rubric'] },
      { day: 60, tasks: ['Final mock; interview kit ready (tools, checklist, stories)'] },
    ],
  },
]

export const AGENTIC_PRACTICE_LOOP_STEPS = [
  { step: 'Generate', body: 'Use question generator or pick format-specific task with ambiguous edges.' },
  { step: 'Clarify', body: 'Write assumptions and questions you would ask a PM or interviewer.' },
  { step: 'Plan', body: 'Module breakdown, test order, and what you will delegate to AI.' },
  { step: 'Collaborate', body: 'Iterative prompts; verify each chunk before next.' },
  { step: 'Implement', body: 'Integrate AI output; fix issues yourself.' },
  { step: 'Test', body: 'Automated tests + manual edge cases.' },
  { step: 'Score', body: 'Rate yourself 1–4 on each rubric dimension.' },
  { step: 'Iterate', body: 'Redo weakest dimension in a shortened repeat session.' },
] as const
