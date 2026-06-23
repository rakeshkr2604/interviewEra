export interface AgenticQuizQuestion {
  question: string
  options: readonly string[]
  correctIndex: number
  explanation: string
}

export interface AgenticPartQuiz {
  partId: string
  title: string
  questions: readonly AgenticQuizQuestion[]
}

export const AGENTIC_PART_QUIZZES: readonly AgenticPartQuiz[] = [
  {
    partId: 'foundations',
    title: 'Foundations check-in',
    questions: [
      {
        question: 'What is the primary signal in an agentic AI interview round?',
        options: [
          'Typing speed without AI tools',
          'Engineering judgment with verified AI collaboration',
          'Memorizing algorithm templates',
          'Using AI for every line of code',
        ],
        correctIndex: 1,
        explanation:
          'Interviewers score how you clarify, plan, verify, and own outcomes — not raw speed or blind AI dependence.',
      },
      {
        question: 'Which best describes “agentic” collaboration?',
        options: [
          'Accepting all AI output without review',
          'Orchestrating multi-step work while retaining accountability',
          'Banning AI to prove fundamentals',
          'Letting the model choose architecture',
        ],
        correctIndex: 1,
        explanation: 'You delegate implementation details; you own requirements, review, tests, and merge decisions.',
      },
      {
        question: 'Why are companies adding agentic rounds in 2026?',
        options: [
          'To replace all human engineers',
          'Because real teams already ship with AI assistants daily',
          'To eliminate DSA entirely',
          'Only for marketing buzz',
        ],
        correctIndex: 1,
        explanation: 'Hiring loops that ban everyday tools mis-measure candidates who will use them on the job.',
      },
    ],
  },
  {
    partId: 'interview-process',
    title: 'Interview process check-in',
    questions: [
      {
        question: 'How should strong candidates allocate the first 10 minutes?',
        options: [
          'Prompt AI for the full solution immediately',
          'Clarify requirements and sketch a plan',
          'Write tests before reading the problem',
          'Research libraries on the open web',
        ],
        correctIndex: 1,
        explanation: 'Clarification and planning prevent building the wrong feature under time pressure.',
      },
      {
        question: 'Which behavior is a senior-level signal?',
        options: [
          'Blaming the model when code fails',
          'Reviewing AI diffs and fixing security issues yourself',
          'Silent coding for 30 minutes',
          'Adding microservices for a CLI task',
        ],
        correctIndex: 1,
        explanation: 'Seniors direct, review ruthlessly, and own the result — AI is a junior teammate.',
      },
      {
        question: 'What makes a prompt strong in a live round?',
        options: [
          '"Build the API"',
          'Stack, file paths, constraints, validation rules, and forbidden deps',
          'Paste the entire codebase without context',
          'Ask for the answer only',
        ],
        correctIndex: 1,
        explanation: 'Precise, iterative prompts reduce review time and hallucinated dependencies.',
      },
    ],
  },
  {
    partId: 'preparation',
    title: 'Preparation check-in',
    questions: [
      {
        question: 'Which rubric dimensions are non-negotiable for a hire signal?',
        options: [
          'Typing speed and syntax recall',
          'Ownership and testing',
          'Number of AI tokens used',
          'Lines of code generated',
        ],
        correctIndex: 1,
        explanation: 'Candidates without ownership and automated tests rarely score above borderline.',
      },
      {
        question: 'Best first step in the self-practice loop?',
        options: [
          'Copy a LeetCode solution',
          'Generate an ambiguous task and clarify assumptions',
          'Skip planning to save time',
          'Only read the rubric after the mock',
        ],
        correctIndex: 1,
        explanation: 'The loop starts with a realistic problem and documented assumptions — mirroring live rounds.',
      },
      {
        question: 'A 7-day crash prep plan should include:',
        options: [
          'Only reading articles',
          'At least one full timed mock with rubric self-score',
          '500 random LeetCode problems',
          'No AI tool practice',
        ],
        correctIndex: 1,
        explanation: 'One simulated session plus rubric scoring beats passive reading for agentic readiness.',
      },
    ],
  },
  {
    partId: 'future-hiring',
    title: 'Future & India check-in',
    questions: [
      {
        question: 'Agentic rounds in India (2025–2026) are most confirmed at:',
        options: [
          'All mass campus OAs nationwide',
          'AI startups, GCCs, and product companies',
          'Only government hiring',
          'No Indian companies yet',
        ],
        correctIndex: 1,
        explanation: 'Adoption is emerging in product hubs; mass service-tier campus OAs lag behind.',
      },
      {
        question: 'Which skill stays highly durable in AI-native hiring?',
        options: [
          'Raw typing speed',
          'Syntax memorization without IDE',
          'Engineering judgment and verification',
          'Avoiding all AI tools',
        ],
        correctIndex: 2,
        explanation: 'Judgment, domain context, communication, and test discipline remain human-differentiated.',
      },
    ],
  },
]
