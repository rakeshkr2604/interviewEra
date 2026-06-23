export type PromptVariant = 'poor' | 'good' | 'improved'

export interface AgenticPromptExample {
  variant: PromptVariant
  title: string
  language?: string
  code: string
  note?: string
}

export const AGENTIC_PROMPT_CLARIFICATION: readonly AgenticPromptExample[] = [
  {
    variant: 'poor',
    title: 'Poor prompt',
    code: 'Build a task API',
  },
  {
    variant: 'good',
    title: 'Good prompt',
    language: 'markdown',
    code: `Stack: Node + Express + TypeScript.
Add POST /tasks: { title: string (1-120), dueDate?: ISO8601 }.
Return 201 { id, title, dueDate? }. 400 on validation errors.
Files: src/routes/tasks.ts only. No new dependencies.`,
  },
  {
    variant: 'improved',
    title: 'Improved prompt',
    language: 'markdown',
    code: `Context: existing app in src/app.ts, in-memory store pattern in src/store.ts.
Task: POST /tasks — validate title 1-120 chars, optional ISO8601 dueDate.
Errors: 400 { error: string }. Success: 201 { id: uuid, title, dueDate? }.
Also generate vitest tests: happy path, empty title, invalid date.
Do not add packages beyond what is in package.json.`,
    note: 'Adds file context, test expectations, and dependency guardrails.',
  },
]

export const AGENTIC_PROMPT_DEBUG: readonly AgenticPromptExample[] = [
  {
    variant: 'poor',
    title: 'Poor prompt',
    code: 'fix the bug',
  },
  {
    variant: 'good',
    title: 'Good prompt',
    language: 'markdown',
    code: `POST /tasks returns 500 when dueDate is omitted (should be optional).
Stack trace: TypeError at validateDueDate (tasks.ts:42).
Expected: 201 with dueDate null/omitted. Actual: 500.
Show minimal fix in validation layer only.`,
  },
  {
    variant: 'improved',
    title: 'Improved prompt',
    language: 'markdown',
    code: `Bug: POST /tasks 500 when body is { "title": "Ship feature" } (no dueDate).
File: src/validation/taskSchema.ts — validateDueDate treats undefined as invalid.
Constraint: keep optional dueDate; add regression test in tasks.test.ts.
Do not change route handler except if required for error mapping.`,
    note: 'Pins file, constraint, and asks for a regression test.',
  },
]

export const AGENTIC_PROMPT_REVIEW: readonly AgenticPromptExample[] = [
  {
    variant: 'poor',
    title: 'Poor prompt',
    code: 'make this code better',
  },
  {
    variant: 'good',
    title: 'Good prompt',
    language: 'markdown',
    code: `Review src/middleware/auth.ts for:
1) missing rate limiting on /login
2) JWT expiry validation
3) error response shape consistency
List issues by severity; suggest patches inline.`,
  },
  {
    variant: 'improved',
    title: 'Improved prompt',
    language: 'markdown',
    code: `Security review — auth middleware only (src/middleware/auth.ts).
Threat model: public internet, brute-force login, token replay.
Output: table [severity, line, issue, suggested fix].
Do not refactor unrelated files. Flag any new dependency proposals.`,
    note: 'Threat model + structured output reduces noisy refactors.',
  },
]
