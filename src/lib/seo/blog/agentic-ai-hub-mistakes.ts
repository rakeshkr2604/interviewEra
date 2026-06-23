export interface AgenticMistake {
  mistake: string
  consequence: string
  fix: string
}

export const AGENTIC_COMMON_MISTAKES: readonly AgenticMistake[] = [
  {
    mistake: 'Blindly accepting AI output',
    consequence: 'Subtle bugs, wrong libraries, or security holes sink the round.',
    fix: 'Read every generated block; run tests before moving on.',
  },
  {
    mistake: 'Skipping requirement clarification',
    consequence: 'Build the wrong feature; no recovery time left.',
    fix: 'Spend 5–10 minutes asking structured questions and stating assumptions.',
  },
  {
    mistake: 'No tests written',
    consequence: 'Interviewer cannot trust the solution works.',
    fix: 'Add at least happy path + one edge case test before calling done.',
  },
  {
    mistake: 'Vague or one-shot prompting',
    consequence: 'Generic code that does not match the stack or constraints.',
    fix: 'Iterate prompts with file context, types, and explicit constraints.',
  },
  {
    mistake: 'Overengineering',
    consequence: 'Time lost on microservices when a module would suffice.',
    fix: 'Match scope to interview timebox; mention production extensions verbally.',
  },
  {
    mistake: 'Not reviewing imports and dependencies',
    consequence: 'AI adds packages not in the project or banned by policy.',
    fix: 'Check package.json and lockfile impact before accepting suggestions.',
  },
  {
    mistake: 'Silent coding for 30+ minutes',
    consequence: 'Interviewer has no signal on your thinking.',
    fix: 'Think aloud at plan transitions, not every keystroke.',
  },
  {
    mistake: 'Using AI for architecture without understanding',
    consequence: 'Cannot answer follow-up "why" questions.',
    fix: 'Design architecture yourself; delegate implementation details to AI.',
  },
  {
    mistake: 'Ignoring security basics',
    consequence: 'Instant fail at security-conscious companies.',
    fix: 'Review auth, input validation, and secrets handling on every AI diff.',
  },
  {
    mistake: 'Copy-pasting without adapting to codebase style',
    consequence: 'Solution feels foreign; review flags inconsistency.',
    fix: 'Match naming, patterns, and folder layout of existing code.',
  },
  {
    mistake: 'Chasing perfect polish over working core',
    consequence: 'Core requirement incomplete at time limit.',
    fix: 'Ship tested MVP first; polish if time remains.',
  },
  {
    mistake: 'Blaming the AI when code fails',
    consequence: 'Signals lack of ownership.',
    fix: 'Own mistakes: "I should have validated that input."',
  },
  {
    mistake: 'Using disallowed tools or external paste',
    consequence: 'Integrity violation; automatic rejection at strict companies.',
    fix: 'Confirm permitted tools at start; stay in approved environment.',
  },
  {
    mistake: 'Not explaining trade-offs in discussion',
    consequence: 'Miss senior-level signal even with working code.',
    fix: 'Prepare 2–3 alternatives you rejected and why.',
  },
  {
    mistake: 'Prompting for entire solution at once',
    consequence: 'Unreviewable 500-line dump with intertwined bugs.',
    fix: 'Incremental prompts per module with verification between steps.',
  },
  {
    mistake: 'Skipping error handling',
    consequence: 'Happy-path-only code breaks on first edge case demo.',
    fix: 'Ask AI for error types; implement handlers you understand.',
  },
  {
    mistake: 'No version control hygiene',
    consequence: 'Messy history; hard to explain changes in review.',
    fix: 'Commit logical chunks with clear messages if git is in scope.',
  },
  {
    mistake: 'Treating AI like search, not collaborator',
    consequence: 'Miss leverage; finish slower than peers.',
    fix: 'Use AI for boilerplate, tests, and refactors — not as Google substitute only.',
  },
  {
    mistake: 'Ignoring interviewer hints',
    consequence: 'Double down on wrong approach.',
    fix: 'Pause, acknowledge hint, adjust plan explicitly.',
  },
  {
    mistake: 'Fabricating metrics or experience in discussion',
    consequence: 'Behavioral red flag when probed.',
    fix: 'Use honest hypotheticals: "In production I would measure…"',
  },
  {
    mistake: 'No post-implementation walkthrough',
    consequence: 'Interviewer unsure what you actually understand.',
    fix: 'Reserve 5 minutes to demo and trace one request through the system.',
  },
  {
    mistake: 'Neglecting fundamentals prep',
    consequence: 'Cannot spot when AI chooses wrong algorithm.',
    fix: 'Maintain DSA and system basics alongside AI tool practice.',
  },
]
