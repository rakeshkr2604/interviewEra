export interface AgenticFormatCard {
  format: string
  task: string
  expectations: string
  aiTips: string
}

export const AGENTIC_INTERVIEW_FORMATS: readonly AgenticFormatCard[] = [
  {
    format: 'Backend API',
    task: 'Build REST/GraphQL endpoints with validation and persistence.',
    expectations: 'Clear resource design, error contracts, basic tests, auth awareness.',
    aiTips: 'Prompt for handler stubs; you own schema, validation rules, and security review.',
  },
  {
    format: 'Frontend feature',
    task: 'Implement UI component or page with state and API integration.',
    expectations: 'Accessible markup, loading/error states, component boundaries.',
    aiTips: 'Use AI for CSS boilerplate; verify a11y and state edge cases yourself.',
  },
  {
    format: 'Full-stack task',
    task: 'End-to-end feature spanning API and client.',
    expectations: 'Contract between layers, consistent types, integration sanity.',
    aiTips: 'Define API contract first; let AI scaffold both sides against your spec.',
  },
  {
    format: 'CLI tool',
    task: 'Command-line utility with args, output, and exit codes.',
    expectations: 'Parse args correctly, helpful --help, handle invalid input.',
    aiTips: 'Prompt with argv examples; test edge cases AI often skips.',
  },
  {
    format: 'Bug fixing',
    task: 'Diagnose and fix defect in provided codebase.',
    expectations: 'Reproduce bug, root-cause analysis, minimal fix, regression test.',
    aiTips: 'Explain bug to AI with stack trace; verify fix does not break neighbors.',
  },
  {
    format: 'System design (light)',
    task: 'Design architecture for scale — may include pseudo-code or diagrams.',
    expectations: 'Components, data flow, bottlenecks, trade-offs; AI for diagrams only if allowed.',
    aiTips: 'Do not outsource capacity estimates; use AI to draft sequence diagrams you validate.',
  },
  {
    format: 'Data pipeline',
    task: 'ETL or stream processing snippet — ingest, transform, load.',
    expectations: 'Idempotency, failure handling, schema evolution awareness.',
    aiTips: 'Specify source/sink formats in prompts; review for data loss paths.',
  },
  {
    format: 'AI application',
    task: 'Wire LLM call with prompts, guardrails, and fallbacks.',
    expectations: 'Prompt structure, timeout handling, PII awareness, eval mindset.',
    aiTips: 'Meta-skill: you are building on AI while being evaluated on AI use.',
  },
  {
    format: 'Code review',
    task: 'Review AI-generated or teammate PR; suggest improvements.',
    expectations: 'Specific line comments, severity, security and style issues.',
    aiTips: 'Optionally use AI to find issues — then prioritize and explain your top 3.',
  },
  {
    format: 'Legacy enhancement',
    task: 'Add feature to existing codebase without breaking patterns.',
    expectations: 'Read before write, match conventions, surgical diffs.',
    aiTips: 'Feed AI relevant file context; reject suggestions that ignore project patterns.',
  },
]
