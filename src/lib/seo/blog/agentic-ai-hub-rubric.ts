export interface RubricDimension {
  dimension: string
  weight: string
  score1: string
  score2: string
  score3: string
  score4: string
}

export const AGENTIC_RUBRIC_DIMENSIONS: readonly RubricDimension[] = [
  {
    dimension: 'Clarification',
    weight: '15%',
    score1: 'No questions; wrong assumptions',
    score2: 'Surface questions only',
    score3: 'Good coverage of scope and constraints',
    score4: 'Excellent edge-case and NFR clarification',
  },
  {
    dimension: 'Planning',
    weight: '12%',
    score1: 'No plan; chaotic execution',
    score2: 'Vague mental plan',
    score3: 'Clear steps referenced during work',
    score4: 'Plan adapts visibly when new info emerges',
  },
  {
    dimension: 'Ownership',
    weight: '15%',
    score1: 'Blames AI; cannot explain code',
    score2: 'Partial understanding',
    score3: 'Owns decisions and fixes AI errors',
    score4: 'Strong accountability and leadership tone',
  },
  {
    dimension: 'Code quality',
    weight: '15%',
    score1: 'Unreadable or broken structure',
    score2: 'Works but messy',
    score3: 'Clean, idiomatic, maintainable',
    score4: 'Production-minded with clear abstractions',
  },
  {
    dimension: 'Testing',
    weight: '12%',
    score1: 'No tests',
    score2: 'Manual only',
    score3: 'Automated happy path + edge case',
    score4: 'Thoughtful coverage tied to requirements',
  },
  {
    dimension: 'Communication',
    weight: '10%',
    score1: 'Silent or confusing',
    score2: 'Intermittent updates',
    score3: 'Clear narration at milestones',
    score4: 'Excellent collaboration with interviewer',
  },
  {
    dimension: 'AI usage',
    weight: '11%',
    score1: 'Chaotic or dishonest use',
    score2: 'Under- or over-reliance',
    score3: 'Disciplined, iterative prompting',
    score4: 'Optimal delegation and verification',
  },
  {
    dimension: 'Decision quality',
    weight: '10%',
    score1: 'Poor prioritization',
    score2: 'Adequate but unarticulated',
    score3: 'Sound trade-offs explained',
    score4: 'Senior-level judgment under time pressure',
  },
]

export interface SampleScorecard {
  label: string
  outcome: string
  scores: Record<string, number>
  notes: string
}

export const AGENTIC_SAMPLE_SCORECARDS: readonly SampleScorecard[] = [
  {
    label: 'Strong hire',
    outcome: 'Hire',
    scores: {
      Clarification: 4,
      Planning: 3,
      Ownership: 4,
      'Code quality': 3,
      Testing: 4,
      Communication: 3,
      'AI usage': 4,
      'Decision quality': 3,
    },
    notes:
      'Candidate clarified auth and rate limits upfront, used AI for handler stubs, caught SQL issue in review, shipped tested endpoints with clear narration.',
  },
  {
    label: 'Borderline',
    outcome: 'No hire / lean no',
    scores: {
      Clarification: 2,
      Planning: 2,
      Ownership: 2,
      'Code quality': 3,
      Testing: 1,
      Communication: 2,
      'AI usage': 2,
      'Decision quality': 2,
    },
    notes:
      'Working demo but no tests, vague prompts, could not explain middleware; blamed AI for validation bug.',
  },
]
