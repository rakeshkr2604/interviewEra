export interface WorkflowMinute {
  minute: string
  candidate: string
  aiAction: string
  interviewer: string
}

export const AGENTIC_60_MIN_WORKFLOW: readonly WorkflowMinute[] = [
  { minute: '0–3', candidate: 'Read problem; note unknowns', aiAction: 'Idle — no prompting yet', interviewer: 'Observes whether candidate rushes' },
  { minute: '3–10', candidate: 'Asks about auth, pagination, error format', aiAction: 'None', interviewer: 'Answers 2–3 clarifications' },
  { minute: '10–15', candidate: 'Sketches routes, service layer, test plan', aiAction: 'Optional: "outline file structure"', interviewer: 'May probe plan briefly' },
  { minute: '15–22', candidate: 'Prompts for model + repository interface', aiAction: 'Generates interfaces', interviewer: 'Watches prompt quality' },
  { minute: '22–30', candidate: 'Reviews AI code; fixes wrong types', aiAction: 'Refines on feedback', interviewer: 'Notes ownership' },
  { minute: '30–40', candidate: 'Implements handler logic; AI for boilerplate tests', aiAction: 'Test scaffolds', interviewer: 'Checks verification habit' },
  { minute: '40–48', candidate: 'Runs tests; adds missing edge case', aiAction: 'Suggests one edge test', interviewer: 'May ask about failure modes' },
  { minute: '48–55', candidate: 'Manual demo + walkthrough', aiAction: 'Idle', interviewer: 'Follow-up trade-off questions' },
  { minute: '55–60', candidate: 'Summarizes what shipped vs deferred', aiAction: 'N/A', interviewer: 'Final signal capture' },
]

export interface SimulationComparison {
  aspect: string
  bad: string
  excellent: string
}

export const AGENTIC_SIMULATION_TASK =
  'Build a POST /tasks API that creates tasks with title (required), optional due date, and returns 201 with id. Validate input; persist in memory or SQLite.'

export const AGENTIC_BAD_VS_EXCELLENT: readonly SimulationComparison[] = [
  {
    aspect: 'Clarification',
    bad: 'Assumes JSON shape; misses timezone on due date',
    excellent: 'Asks max title length, date format, id type, and error response schema',
  },
  {
    aspect: 'Planning',
    bad: 'Single prompt: "build the API"',
    excellent: 'Layers: model → validation → route → tests',
  },
  {
    aspect: 'AI prompts',
    bad: 'Accepts 200 lines including wrong framework',
    excellent: 'Specifies stack, existing files, and validation rules per prompt',
  },
  {
    aspect: 'Review',
    bad: 'Does not read generated validation',
    excellent: 'Catches missing 400 on empty title; fixes manually',
  },
  {
    aspect: 'Testing',
    bad: 'curl once with valid body',
    excellent: 'Tests 201, 400 empty title, invalid date format',
  },
  {
    aspect: 'Discussion',
    bad: '"It works on my machine"',
    excellent: 'Explains in-memory vs DB trade-off for interview scope',
  },
  {
    aspect: 'Outcome',
    bad: 'Borderline fail — fragile, unexplained',
    excellent: 'Strong hire signal — tested, owned, articulate',
  },
]

export const AGENTIC_EXCELLENT_PROMPT_SAMPLE = `Stack: Node + Express + TypeScript. Existing app in src/app.ts.
Add POST /tasks: body { title: string (1-120), dueDate?: ISO8601 }.
Return 201 { id: uuid, title, dueDate? }. 400 on validation errors as { error: string }.
Generate only src/routes/tasks.ts and src/validation/taskSchema.ts — no new dependencies.`

export const AGENTIC_BAD_PROMPT_SAMPLE = `Create a task API endpoint`
