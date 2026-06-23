export interface AgenticQuestion {
  category: string
  question: string
  guidance: string
  interviewerSignal: string
}

export const AGENTIC_INTERVIEW_QUESTIONS: readonly AgenticQuestion[] = [
  // Behavioral
  {
    category: 'Behavioral',
    question: 'Tell me about a time you disagreed with an AI-generated solution.',
    guidance: 'STAR format: specific bug or design flaw you caught, how you fixed it, outcome.',
    interviewerSignal: 'Ownership and critical thinking over tool worship.',
  },
  {
    category: 'Behavioral',
    question: 'Describe pressure to ship quickly when AI suggested shortcuts.',
    guidance: 'Show principled scope cut vs unsafe shortcut.',
    interviewerSignal: 'Judgment under deadline.',
  },
  {
    category: 'Behavioral',
    question: 'How do you stay accountable when pair-programming with AI?',
    guidance: 'Review checklist, tests, personal sign-off before merge.',
    interviewerSignal: 'Professional accountability.',
  },
  {
    category: 'Behavioral',
    question: 'When did AI make you faster vs slower?',
    guidance: 'Honest example of prompt thrashing vs structured delegation.',
    interviewerSignal: 'Self-awareness and learning.',
  },
  {
    category: 'Behavioral',
    question: 'How do you mentor juniors on AI tool use?',
    guidance: 'Teach verification, not copy-paste; cite concrete rules.',
    interviewerSignal: 'Leadership potential.',
  },
  // Technical
  {
    category: 'Technical',
    question: 'Explain time complexity of your solution and whether AI choice was optimal.',
    guidance: 'Big-O for dominant operation; mention if you overrode AI algorithm.',
    interviewerSignal: 'Fundamentals despite AI use.',
  },
  {
    category: 'Technical',
    question: 'How would you handle concurrent writes to your in-memory store?',
    guidance: 'Mutex, channels, or DB — match stack; note interview scope.',
    interviewerSignal: 'Concurrency awareness.',
  },
  {
    category: 'Technical',
    question: 'Design idempotent POST for payment webhook.',
    guidance: 'Idempotency keys, dedup store, retry semantics.',
    interviewerSignal: 'API design maturity.',
  },
  {
    category: 'Technical',
    question: 'What happens when your AI-suggested regex fails on Unicode input?',
    guidance: 'Test case, fix, discuss limitations of AI for i18n.',
    interviewerSignal: 'Edge-case rigor.',
  },
  {
    category: 'Technical',
    question: 'Walk through memory lifecycle in your feature.',
    guidance: 'Allocations, closures, connection pools — stack-specific.',
    interviewerSignal: 'Runtime understanding.',
  },
  // Architecture
  {
    category: 'Architecture',
    question: 'Why monolith vs services for this interview task?',
    guidance: 'Timebox argument; production migration path.',
    interviewerSignal: 'Pragmatic architecture.',
  },
  {
    category: 'Architecture',
    question: 'Where would caching help and what invalidation strategy?',
    guidance: 'Read-heavy paths; TTL vs event-driven invalidation.',
    interviewerSignal: 'Performance thinking.',
  },
  {
    category: 'Architecture',
    question: 'How would you scale this to 10M users?',
    guidance: 'Bottleneck identification — DB, stateless app tier, queue.',
    interviewerSignal: 'Growth mindset.',
  },
  {
    category: 'Architecture',
    question: 'Draw data flow from client to persistence.',
    guidance: 'Clear diagram narration; mention failure points.',
    interviewerSignal: 'System communication.',
  },
  {
    category: 'Architecture',
    question: 'What would you not let AI decide in system design?',
    guidance: 'CAP trade-offs, compliance boundaries, ownership lines.',
    interviewerSignal: 'Senior boundaries.',
  },
  // Prompting
  {
    category: 'Prompting',
    question: 'Show how you would prompt for a repository layer only.',
    guidance: 'Include interfaces, error types, no HTTP layer.',
    interviewerSignal: 'Precise delegation.',
  },
  {
    category: 'Prompting',
    question: 'How do you reduce hallucinated dependencies in prompts?',
    guidance: 'Whitelist packages, paste package.json excerpt, forbid new deps.',
    interviewerSignal: 'Prompt engineering discipline.',
  },
  {
    category: 'Prompting',
    question: 'When do you switch models or tools mid-task?',
    guidance: 'Stuck on reasoning vs code gen; cost/latency — practical answer.',
    interviewerSignal: 'Tool literacy.',
  },
  {
    category: 'Prompting',
    question: 'How much context do you put in one prompt?',
    guidance: 'Relevant files only; chunking strategy.',
    interviewerSignal: 'Context management.',
  },
  {
    category: 'Prompting',
    question: 'Rewrite a vague prompt into a strong one.',
    guidance: 'Live exercise — constraints, examples, output format.',
    interviewerSignal: 'Communication to AI.',
  },
  // Debugging
  {
    category: 'Debugging',
    question: 'This test fails intermittently — your approach?',
    guidance: 'Reproduce, isolate, logging, race hypothesis.',
    interviewerSignal: 'Systematic debugging.',
  },
  {
    category: 'Debugging',
    question: 'AI introduced off-by-one — how did you find it?',
    guidance: 'Binary search test cases, debugger, or print tracing.',
    interviewerSignal: 'Verification skill.',
  },
  {
    category: 'Debugging',
    question: 'Production error only in one region — hypotheses?',
    guidance: 'Config, latency, data skew, feature flags.',
    interviewerSignal: 'Ops thinking.',
  },
  {
    category: 'Debugging',
    question: 'Stack trace points to generated code you do not understand.',
    guidance: 'Read docs, simplify, rewrite critical path yourself.',
    interviewerSignal: 'No blind trust.',
  },
  {
    category: 'Debugging',
    question: 'How do you debug AI-wrong business logic?',
    guidance: 'Compare against requirements doc; table-driven tests.',
    interviewerSignal: 'Requirements traceability.',
  },
  // Testing
  {
    category: 'Testing',
    question: 'What tests did you skip and why?',
    guidance: 'Explicit scope trade-off; what you would add next.',
    interviewerSignal: 'Honest prioritization.',
  },
  {
    category: 'Testing',
    question: 'How do you test AI non-determinism in LLM features?',
    guidance: 'Golden sets, eval harness, mock provider.',
    interviewerSignal: 'AI product quality.',
  },
  {
    category: 'Testing',
    question: 'Unit vs integration for this task?',
    guidance: 'Pyramid appropriate to timebox.',
    interviewerSignal: 'Testing strategy.',
  },
  {
    category: 'Testing',
    question: 'Write a test for invalid date boundary.',
    guidance: 'Live or whiteboard test case.',
    interviewerSignal: 'Edge-case habit.',
  },
  {
    category: 'Testing',
    question: 'How would AI help vs hinder TDD here?',
    guidance: 'AI for test list; you assert behavior.',
    interviewerSignal: 'Balanced TDD + AI.',
  },
  // AI collaboration
  {
    category: 'AI collaboration',
    question: 'What tasks do you refuse to give AI in interviews?',
    guidance: 'Security-critical auth, novel algorithm proof, compliance.',
    interviewerSignal: 'Safety boundaries.',
  },
  {
    category: 'AI collaboration',
    question: 'How do you document AI assistance in commits?',
    guidance: 'Team policy; honesty; co-authorship norms.',
    interviewerSignal: 'Professional ethics.',
  },
  {
    category: 'AI collaboration',
    question: 'Detect when AI is confidently wrong.',
    guidance: 'Sanity checks, official docs, small experiments.',
    interviewerSignal: 'Epistemic humility.',
  },
  {
    category: 'AI collaboration',
    question: 'Collaborate with interviewer vs only AI?',
    guidance: 'Treat interviewer as PM/reviewer; sync at milestones.',
    interviewerSignal: 'Real workplace collaboration.',
  },
  {
    category: 'AI collaboration',
    question: 'Is using ChatGPT on phone during interview cheating?',
    guidance: 'Follow rules; default is in-session tools only unless allowed.',
    interviewerSignal: 'Integrity awareness.',
  },
  // Trade-offs
  {
    category: 'Trade-offs',
    question: 'Speed vs correctness — choice in last 10 minutes?',
    guidance: 'Concrete decision from your session.',
    interviewerSignal: 'Time management.',
  },
  {
    category: 'Trade-offs',
    question: 'Build vs buy for auth in this task?',
    guidance: 'Interview scope favors minimal; discuss OAuth in prod.',
    interviewerSignal: 'Pragmatism.',
  },
  {
    category: 'Trade-offs',
    question: 'SQL vs NoSQL for your schema?',
    guidance: 'Access patterns drive choice; AI bias awareness.',
    interviewerSignal: 'Data modeling.',
  },
  {
    category: 'Trade-offs',
    question: 'More features vs deeper tests?',
    guidance: 'Prefer tested core — align with rubric.',
    interviewerSignal: 'Quality bar.',
  },
  {
    category: 'Trade-offs',
    question: 'Refactor now vs ship and ticket tech debt?',
    guidance: 'Interview vs production framing.',
    interviewerSignal: 'Senior debt judgment.',
  },
  // Communication
  {
    category: 'Communication',
    question: 'Explain your design to a non-technical stakeholder in 60 seconds.',
    guidance: 'Outcome-focused, no jargon dump.',
    interviewerSignal: 'Clarity.',
  },
  {
    category: 'Communication',
    question: 'How did you use the last hint from interviewer?',
    guidance: 'Specific pivot in plan or code.',
    interviewerSignal: 'Coachability.',
  },
  {
    category: 'Communication',
    question: 'Summarize what you would do differently with another hour.',
    guidance: 'Prioritized backlog — tests, pagination, auth.',
    interviewerSignal: 'Reflection.',
  },
  {
    category: 'Communication',
    question: 'Teach me how your validation layer works.',
    guidance: 'Whiteboard flow; inputs and error paths.',
    interviewerSignal: 'Deep understanding.',
  },
  {
    category: 'Communication',
    question: 'Why should we hire you for an AI-native team?',
    guidance: 'Judgment + fundamentals + learning velocity — not tool brand loyalty.',
    interviewerSignal: 'Culture fit.',
  },
  // Requirement clarification
  {
    category: 'Requirement clarification',
    question: 'What questions would you ask before building a rate limiter?',
    guidance: 'Limits per user/IP, window, storage, response codes.',
    interviewerSignal: 'NFR discovery.',
  },
  {
    category: 'Requirement clarification',
    question: 'Ambiguous "support files" in spec — what do you ask?',
    guidance: 'Size, types, virus scan, storage, CDN.',
    interviewerSignal: 'Scope control.',
  },
  {
    category: 'Requirement clarification',
    question: 'Interviewer says "make it production-ready" — what changes?',
    guidance: 'Logging, metrics, config, deployment — scoped to time.',
    interviewerSignal: 'Production lens.',
  },
  {
    category: 'Requirement clarification',
    question: 'How do you record assumptions when PM is unavailable?',
    guidance: 'Comment block or README; state in walkthrough.',
    interviewerSignal: 'Professional habit.',
  },
  {
    category: 'Requirement clarification',
    question: 'Feature creep mid-interview — how do you handle?',
    guidance: 'Reconcile scope with clock; explicit re-prioritization.',
    interviewerSignal: 'Scope management.',
  },
]

export const AGENTIC_QUESTION_CATEGORIES = [
  'Behavioral',
  'Technical',
  'Architecture',
  'Prompting',
  'Debugging',
  'Testing',
  'AI collaboration',
  'Trade-offs',
  'Communication',
  'Requirement clarification',
] as const
