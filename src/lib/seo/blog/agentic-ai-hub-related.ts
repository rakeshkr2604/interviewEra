export interface AgenticRelatedGuide {
  href: string
  label: string
  teaser: string
}

/** Contextual related guides keyed by chapter id — strengthens internal linking. */
export const AGENTIC_CHAPTER_RELATED: Record<string, readonly AgenticRelatedGuide[]> = {
  'what-is-agentic-ai-interview': [
    {
      href: '/blog/ai-mock-interviews-smartest-prep-2026',
      label: 'AI Mock Interviews Guide',
      teaser: 'Practice with scored feedback before your first agentic round.',
    },
    {
      href: '/blog/top-interview-questions-for-software-engineers',
      label: 'SWE Interview Questions',
      teaser: 'Broader loop context beyond AI-assisted coding.',
    },
  ],
  'why-companies-adopt': [
    {
      href: '/interview-questions/software-engineer',
      label: 'Software Engineer Hub',
      teaser: 'How product companies structure full hiring loops.',
    },
    {
      href: '/blog/how-to-prepare-for-placement-interviews',
      label: 'Placement Guide',
      teaser: 'Campus context for Indian candidates entering AI-forward teams.',
    },
  ],
  'interview-evolution-timeline': [
    {
      href: '/blog/top-dsa-interview-questions',
      label: 'DSA Topic Map',
      teaser: 'Fundamentals still tested alongside agentic rounds.',
    },
  ],
  'what-agentic-means': [
    {
      href: '/tools/question-generator',
      label: 'Question Generator',
      teaser: 'Generate ambiguous practice tasks for clarification drills.',
    },
  ],
  'how-it-works': [
    {
      href: '/signup',
      label: 'Start Mock Interview',
      teaser: 'Simulate clarification and discussion phases under pressure.',
    },
  ],
  'skills-evaluated': [
    {
      href: '/blog/what-is-star-method-with-examples',
      label: 'STAR Method Guide',
      teaser: 'Ownership and communication overlap with behavioral scoring.',
    },
    {
      href: '/tools/star-builder',
      label: 'STAR Answer Builder',
      teaser: 'Structure ownership stories interviewers probe in agentic loops.',
    },
  ],
  'senior-engineer-mindset': [
    {
      href: '/blog/ai-mock-interviews-smartest-prep-2026',
      label: 'AI Mock Interviews',
      teaser: 'Train senior-style narration and review habits.',
    },
  ],
  'interview-formats': [
    {
      href: '/interview-questions/companies/amazon/software-engineer',
      label: 'Amazon SDE Guide',
      teaser: 'Product-loop formats that pair DSA with practical depth.',
    },
    {
      href: '/interview-questions/companies/microsoft/software-engineer',
      label: 'Microsoft SDE Guide',
      teaser: 'AI-forward hiring patterns at GCC-scale employers.',
    },
  ],
  'sample-60-minute-workflow': [
    {
      href: '/signup',
      label: 'Timed Mock Interview',
      teaser: 'Run the 60-minute workflow with rubric feedback.',
    },
  ],
  'real-example-simulation': [
    {
      href: '/tools/question-generator',
      label: 'Practice Task Generator',
      teaser: 'Create REST endpoint tasks like the simulation example.',
    },
  ],
  'interview-questions': [
    {
      href: '/tools/question-generator',
      label: 'Question Generator',
      teaser: 'Expand drills beyond the fifty curated prompts here.',
    },
    {
      href: '/blog/top-dsa-interview-questions',
      label: 'DSA Topic Map',
      teaser: 'Technical depth questions still appear in hybrid loops.',
    },
  ],
  'evaluation-rubric': [
    {
      href: '/signup',
      label: 'Scored Mock Interview',
      teaser: 'Compare your self-scores to third-party rubric feedback.',
    },
  ],
  'common-mistakes': [
    {
      href: '/blog/overcome-interview-anxiety-mock-interviews',
      label: 'Interview Anxiety Guide',
      teaser: 'Pressure habits that amplify prompting and review mistakes.',
    },
  ],
  'preparation-roadmap': [
    {
      href: '/blog/how-to-prepare-for-placement-interviews',
      label: 'Placement Roadmap',
      teaser: 'Parallel campus prep if you are weeks from drives.',
    },
  ],
  'practice-framework': [
    {
      href: '/signup',
      label: 'Close the Feedback Loop',
      teaser: 'Add mock sessions to your self-practice iteration.',
    },
    {
      href: '/tools/question-generator',
      label: 'Generate Practice Problems',
      teaser: 'Step one of the practice loop — ambiguous specs.',
    },
  ],
  'india-adoption': [
    {
      href: '/interview-questions/companies/freshworks/frontend-developer',
      label: 'Freshworks Interview Guide',
      teaser: 'SaaS product hiring patterns in India.',
    },
    {
      href: '/blog/how-to-prepare-for-placement-interviews',
      label: 'Campus Placement Guide',
      teaser: 'Where agentic rounds sit vs traditional OAs today.',
    },
  ],
  'future-of-hiring': [
    {
      href: '/blog/top-dsa-interview-questions',
      label: 'DSA Fundamentals',
      teaser: 'Durable skill — verify AI output against algorithm basics.',
    },
    {
      href: '/blog/ai-mock-interviews-smartest-prep-2026',
      label: 'AI Mock Interviews',
      teaser: 'Stay interview-ready as formats evolve.',
    },
  ],
  faq: [
    {
      href: '/help-center',
      label: 'Help Center',
      teaser: 'Product FAQs and support for InterviewEra practice tools.',
    },
    {
      href: '/pricing',
      label: 'Pricing',
      teaser: 'One-time plans with interview credits, detailed feedback, and Pro export options.',
    },
  ],
}

export function getRelatedGuidesForChapter(chapterId: string): readonly AgenticRelatedGuide[] {
  return AGENTIC_CHAPTER_RELATED[chapterId] ?? []
}
